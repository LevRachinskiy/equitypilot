import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.js';
import {defaults,calculate} from '../src/domain.js';
test('local assistant executes a reproducible tool and preserves tax assumptions',async()=>{const prior=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const r=await runAgent('Sell half at $100',defaults);assert.equal(r.mode,'local');assert.equal(r.assumptions.futurePrice,100);assert.equal(r.assumptions.sellPercent,50);assert.equal(r.assumptions.ordinaryRate,32);assert.deepEqual(r.result,calculate(r.assumptions));assert.match(r.answer,/tax reserve/);}finally{if(prior)process.env.OPENAI_API_KEY=prior}});
test('local parser rejects out of bounds proposals',async()=>{const prior=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{await assert.rejects(()=>runAgent('sell 150%',defaults))}finally{if(prior)process.env.OPENAI_API_KEY=prior}});
