import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Assumptions,Result,Scenario} from '../src/domain.js';
export function createStore(path:string){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sessions(hash) ON DELETE CASCADE, name TEXT NOT NULL, parent_id TEXT, assumptions TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS scenario_owner ON scenarios(owner);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES sessions(hash) ON DELETE CASCADE,event TEXT NOT NULL,created_at TEXT NOT NULL);`);
 const scenario=(r:any):Scenario=>({id:r.id,name:r.name,parentId:r.parent_id,assumptions:JSON.parse(r.assumptions),result:JSON.parse(r.result),createdAt:r.created_at});
 return {
 session(hash:string){db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash,Date.now()+30*864e5);},
 valid(hash:string){return !!db.prepare('SELECT hash FROM sessions WHERE hash=? AND expires>?').get(hash,Date.now());},
 cleanup(){db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());},
 list(owner:string){return db.prepare('SELECT * FROM scenarios WHERE owner=? ORDER BY created_at DESC').all(owner).map(scenario);},
 get(owner:string,id:string){const r=db.prepare('SELECT * FROM scenarios WHERE owner=? AND id=?').get(owner,id);return r?scenario(r):null;},
 save(owner:string,name:string,parent:string|null,a:Assumptions,r:Result){const s:Scenario={id:randomUUID(),name,parentId:parent,assumptions:a,result:r,createdAt:new Date().toISOString()};db.prepare('INSERT INTO scenarios VALUES (?,?,?,?,?,?,?)').run(s.id,owner,name,parent,JSON.stringify(a),JSON.stringify(r),s.createdAt);return s;},
 remove(owner:string,id:string){db.prepare('UPDATE scenarios SET parent_id=NULL WHERE owner=? AND parent_id=?').run(owner,id);return db.prepare('DELETE FROM scenarios WHERE owner=? AND id=?').run(owner,id).changes>0;},
 audit(owner:string,event:string){db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(randomUUID(),owner,event,new Date().toISOString());},
 close(){db.close();}
 };
}
