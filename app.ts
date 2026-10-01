import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {calculate,AssumptionsSchema,SaveSchema} from '../src/domain.js';
import {createStore} from './store.js';
import {runAgent} from './agent.js';
export function createApp(store=createStore(process.env.DB_PATH||'data/equitypilot.sqlite')){
 const app=express();app.disable('x-powered-by');
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
 app.use(express.json({limit:'32kb'}));
 app.use('/api',rateLimit({windowMs:60000,limit:100,standardHeaders:'draft-8',legacyHeaders:false}));
 app.use('/api',(req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)){
   const origin=req.get('origin');const allowed=process.env.APP_ORIGIN||'http://localhost:5173';
   if(origin&&origin!==allowed){res.status(403).json({error:'Origin rejected'});return;}
   if(!req.is('application/json')){res.status(415).json({error:'Use application/json'});return;}
  }next();
 });
 app.get('/api/health',(_req,res)=>res.json({status:'ok',engineVersion:'1.0.0'}));
 app.post('/api/session',(req,res)=>{
  const token=randomBytes(32).toString('hex');const hash=createHash('sha256').update(token).digest('hex');store.cleanup();store.session(hash);
  res.cookie('ep_session',token,{httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='true',maxAge:30*864e5,path:'/'}).json({mode:'private-demo',expiresInDays:30});
 });
 app.use('/api',(req,res,next)=>{
  const token=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ep_session='))?.slice(11);
  const owner=createHash('sha256').update(token||'').digest('hex');
  if(!token||!store.valid(owner)){res.status(401).json({error:'Start a new demo session'});return;}
  res.locals.owner=owner;next();
 });
 app.post('/api/calculate',(req,res)=>res.json(calculate(req.body)));
 app.get('/api/scenarios',(_req,res)=>res.json(store.list(res.locals.owner)));
 app.post('/api/scenarios',(req,res)=>{
  const body=SaveSchema.parse(req.body);const owner=res.locals.owner;
  if(body.parentId&&!store.get(owner,body.parentId)){res.status(404).json({error:'Parent scenario not found'});return;}
  const result=calculate(body.assumptions);const s=store.save(owner,body.name,body.parentId||null,body.assumptions,result);store.audit(owner,'scenario.created');res.status(201).json(s);
 });
 app.delete('/api/scenarios/:id',(req,res)=>{const id=z.string().uuid().parse(req.params.id);if(!store.remove(res.locals.owner,id)){res.status(404).json({error:'Scenario not found'});return;}store.audit(res.locals.owner,'scenario.deleted');res.status(204).end();});
 app.post('/api/agent',rateLimit({windowMs:60000,limit:10}),async(req,res)=>{const body=z.object({question:z.string().trim().min(1).max(1000),assumptions:AssumptionsSchema}).parse(req.body);res.json(await runAgent(body.question,body.assumptions));});
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof z.ZodError){res.status(400).json({error:'Invalid input',details:err.issues.map(x=>({path:x.path,message:x.message}))});return;}
  if(err instanceof SyntaxError){res.status(400).json({error:'Malformed JSON'});return;}
  const message=err instanceof Error?err.message:'Request failed';
  if(message.startsWith('ISO mode')){res.status(400).json({error:message});return;}
  console.error(JSON.stringify({event:'request.failed',errorType:err instanceof Error?err.name:'Unknown'}));res.status(502).json({error:'Request failed. Check the inputs or try again.'});
 });
 return {app,store};
}
