import { z } from 'zod';
export const AssumptionsSchema = z.object({
  grantType:z.enum(['RSU','NSO','ISO']), shares:z.number().int().min(1).max(1000000),
  vestPrice:z.number().min(0.01).max(100000), strikePrice:z.number().min(0).max(100000),
  futurePrice:z.number().min(0).max(100000), sellPercent:z.number().min(0).max(100),
  cash:z.number().min(0).max(1e9), investments:z.number().min(0).max(1e9),
  ordinaryRate:z.number().min(0).max(60), capitalRate:z.number().min(0).max(50),
  months:z.number().int().min(1).max(120),
});
export type Assumptions=z.infer<typeof AssumptionsSchema>;
export const defaults:Assumptions={grantType:'RSU',shares:2400,vestPrice:75,strikePrice:15,futurePrice:90,sellPercent:50,cash:45000,investments:125000,ordinaryRate:32,capitalRate:20,months:24};
export const sources=[{title:'IRS: Stock options',url:'https://www.irs.gov/taxtopics/tc427'},{title:'IRS Publication 525',url:'https://www.irs.gov/publications/p525'},{title:'IRS Publication 550',url:'https://www.irs.gov/publications/p550'}];
export interface Step {tool:string; inputs:Record<string,unknown>; outputs:Record<string,unknown>; durationMs:number}
export interface Result {netWorth:number;liquidCash:number;equityValue:number;taxReserve:number;ordinaryTax:number;capitalTax:number;exerciseCost:number;amtAdjustment:number;concentration:number;soldShares:number;heldShares:number;affordable:boolean;steps:Step[];warnings:string[]}
const cents=(n:number)=>Math.round(n*100);
const dollars=(n:number)=>n/100;
export function calculate(raw:unknown):Result {
 const a=AssumptionsSchema.parse(raw); const steps:Step[]=[];
 const trace=(tool:string,inputs:Record<string,unknown>,outputs:Record<string,unknown>)=>steps.push({tool,inputs,outputs,durationMs:0});
 // Per-share prices and every monetary event are rounded to cents. Fractions of a share are never sold.
 const soldShares=Math.floor(a.shares*a.sellPercent/100), heldShares=a.shares-soldShares;
 const vest=cents(a.vestPrice), future=cents(a.futurePrice), strike=cents(a.strikePrice);
 const exercise=a.grantType==='RSU'?0:a.shares*strike;
 const ordinaryIncome=a.grantType==='RSU'?a.shares*vest:a.grantType==='NSO'?a.shares*Math.max(0,vest-strike):0;
 const ordinaryTax=Math.round(ordinaryIncome*a.ordinaryRate/100);
 // ISO sell scenarios deliberately disallowed: disposition/AMT basis treatment is outside this engine.
 if(a.grantType==='ISO'&&soldShares>0)throw new Error('ISO mode supports exercise-and-hold only. Set sell percentage to zero.');
 const basis=a.grantType==='NSO'?Math.max(strike,vest):vest;
 const gains=soldShares*(future-basis);
 const capitalTax=Math.round(Math.max(0,gains)*a.capitalRate/100);
 const amtAdjustment=a.grantType==='ISO'?a.shares*Math.max(0,vest-strike):0;
 trace('resolveShareAllocation',{shares:a.shares,sellPercent:a.sellPercent},{soldShares,heldShares});
 trace('calculateCompensation',{grantType:a.grantType,vestPrice:a.vestPrice,strikePrice:a.strikePrice},{exerciseCost:dollars(exercise),ordinaryIncome:dollars(ordinaryIncome),ordinaryTax:dollars(ordinaryTax),amtAdjustment:dollars(amtAdjustment)});
 trace('calculateDisposition',{soldShares,futurePrice:a.futurePrice,basisPerShare:dollars(basis),capitalRate:a.capitalRate},{realizedGain:dollars(gains),capitalTax:dollars(capitalTax)});
 const reserve=ordinaryTax+capitalTax;
 const cash=cents(a.cash)+soldShares*future-exercise-reserve;
 const equity=heldShares*future;
 const worth=cash+cents(a.investments)+equity;
 const concentration=worth>0?equity/worth*100:0;
 trace('projectBalanceSheet',{startingCash:a.cash,investments:a.investments},{netWorth:dollars(worth),liquidCash:dollars(cash),equityValue:dollars(equity),concentration});
 const warnings=['Ending cash does not verify that you can fund exercise or settlement taxes before a future sale.','Uses your flat tax-rate assumptions, not a tax return. Payroll taxes, NIIT, deductions, withholding and state rules are excluded.','Capital tax rate must match your assumed holding period. Loss tax benefits are not modeled.'];
 if(amtAdjustment>0)warnings.push('ISO spread is an AMT adjustment, not AMT tax. Net worth and cash exclude any AMT liability.');
 if(cash<0)warnings.push('This scenario needs more cash than your modeled balance.');
 if(concentration>25)warnings.push('More than 25% of modeled net worth is in employer stock.');
 return {netWorth:dollars(worth),liquidCash:dollars(cash),equityValue:dollars(equity),taxReserve:dollars(reserve),ordinaryTax:dollars(ordinaryTax),capitalTax:dollars(capitalTax),exerciseCost:dollars(exercise),amtAdjustment:dollars(amtAdjustment),concentration,soldShares,heldShares,affordable:cash>=0,steps,warnings};
}
export const SaveSchema=z.object({name:z.string().trim().min(1).max(80),parentId:z.string().uuid().nullable().optional(),assumptions:AssumptionsSchema});
export interface Scenario {id:string;name:string;parentId:string|null;assumptions:Assumptions;result:Result;createdAt:string}
export function explain(a:Assumptions,r:Result):string {
 const fmt=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 return `At ${fmt(a.futurePrice)} per share, selling ${r.soldShares.toLocaleString()} shares leaves ${fmt(r.liquidCash)} in modeled cash and ${fmt(r.equityValue)} in employer stock. The tax reserve is ${fmt(r.taxReserve)} using your stated rates. Employer stock represents ${r.concentration.toFixed(1)}% of modeled net worth.${r.amtAdjustment?` The ISO AMT adjustment is ${fmt(r.amtAdjustment)}; actual AMT liability is not calculated.`:''}`;
}
