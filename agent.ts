import {z} from 'zod';
import {calculate,explain,sources,type Assumptions} from '../src/domain.js';
const Plan=z.object({sellPercent:z.number().min(0).max(100).optional(),futurePrice:z.number().min(0).max(100000).optional()}).strict();
export async function runAgent(question:string,current:Assumptions){
 let patch:z.infer<typeof Plan>={}; let mode='local';const started=performance.now();
 if(process.env.OPENAI_API_KEY){
  mode='live';
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',messages:[{role:'system',content:'You select scenario assumptions, not financial advice. Call calculateScenario with only the sellPercent or futurePrice explicitly requested by the user. For unspecified parameters omit them. Percent must be 0..100; futurePrice is USD/share. Never change tax rates. ISO supports sellPercent 0 only. No need for any financial balances.'},{role:'user',content:`Grant type: ${current.grantType}. Request: ${question}`}],tools:[{type:'function',function:{name:'calculateScenario',description:'Change explicitly requested sale fraction or future share price.',parameters:{type:'object',properties:{sellPercent:{type:'number'},futurePrice:{type:'number'}},additionalProperties:false}}}],tool_choice:{type:'function',function:{name:'calculateScenario'}}})});
  if(!response.ok)throw new Error('AI provider unavailable. Try the local scenario controls.');
  const data=await response.json() as any;const call=data.choices?.[0]?.message?.tool_calls?.[0];
  if(call?.function?.name!=='calculateScenario')throw new Error('AI did not return the expected tool.');
  patch=Plan.parse(JSON.parse(call.function.arguments));
 }else{
  const price=question.match(/(?:\$|(?:price|at|to)\s+\$?)(\d+(?:\.\d+)?)/i);
  const percent=question.match(/(?:sell\s+)(\d+(?:\.\d+)?)\s*%/i);
  if(price)patch.futurePrice=Number(price[1]);if(percent)patch.sellPercent=Number(percent[1]);
  if(/sell (all|everything)/i.test(question))patch.sellPercent=100;
  if(/sell half/i.test(question))patch.sellPercent=50;
  if(/hold (all|everything)|sell nothing/i.test(question))patch.sellPercent=0;
  patch=Plan.parse(patch);
 }
 const assumptions={...current,...patch};const result=calculate(assumptions);
 return {mode,assumptions,result,answer:explain(assumptions,result),sources,trace:{tool:'calculateScenario',inputs:patch,durationMs:Math.round(performance.now()-started),model:mode==='live'?(process.env.OPENAI_MODEL||'gpt-4.1-mini'):null},notice:mode==='local'?'Local command parser. Try “sell half at $100” or “hold all”.':'AI selects typed tool inputs. All displayed numbers and explanations are computed by the deterministic engine.'};
}
