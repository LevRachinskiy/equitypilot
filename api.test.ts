import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {createStore} from '../server/store.js';
import {defaults} from '../src/domain.js';
test('API enforces ownership, validates requests, branches and deletes',async()=>{
 const store=createStore(':memory:');const {app}=createApp(store);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}/api`;
 const call=(path:string,method='GET',body?:unknown,cookie='')=>fetch(base+path,{method,headers:{'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});
 try{
 assert.equal((await call('/scenarios')).status,401);
 const s1=await call('/session','POST',{}),s2=await call('/session','POST',{});const c1=s1.headers.get('set-cookie')!.split(';')[0],c2=s2.headers.get('set-cookie')!.split(';')[0];assert.match(s1.headers.get('set-cookie')!,/HttpOnly/);assert.match(s1.headers.get('set-cookie')!,/SameSite=Strict/);
 const saved=await call('/scenarios','POST',{name:'Base',assumptions:defaults},c1);assert.equal(saved.status,201);const scenario=await saved.json() as any;
 assert.equal((await (await call('/scenarios','GET',undefined,c2)).json() as any[]).length,0);
 assert.equal((await call('/scenarios','POST',{name:'Steal',parentId:scenario.id,assumptions:defaults},c2)).status,404);
 assert.equal((await call('/scenarios/'+scenario.id,'DELETE',{},c2)).status,404);
 assert.equal((await call('/calculate','POST',{...defaults,sellPercent:120},c1)).status,400);
 assert.equal((await call('/calculate','POST',{...defaults,grantType:'ISO'},c1)).status,400);
 const child=await call('/scenarios','POST',{name:'Child',parentId:scenario.id,assumptions:{...defaults,sellPercent:100}},c1);assert.equal(child.status,201);
 assert.equal((await call('/scenarios/'+scenario.id,'DELETE',{},c1)).status,204);
 const rows=await (await call('/scenarios','GET',undefined,c1)).json() as any[];assert.equal(rows.length,1);assert.equal(rows[0].parentId,null);
 const foreign=await fetch(base+'/session',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:'{}'});assert.equal(foreign.status,403);
 const html=await fetch(base+'/session',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'});assert.equal(html.status,415);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));store.close()}
});
