import type { OrderQuote, OrderQuoteRequest } from './orderQuote';
import type { ReceiverProfile } from './receiverProfiles';
export interface MeasuredActual { height?:number; grossWeight?:number; photo?:string; crewInitials?:string; timestamp?:string }
export type SheetQuote = OrderQuote & { actuals?:Record<string,MeasuredActual>; actualsUnits?:string; request?:OrderQuoteRequest; profileSnapshot?:ReceiverProfile; manualChecklist?:Record<string,boolean> };
/** Forms use cm/kg; storage actuals use the original request units for quote replay. */
export function measuredActuals(quote:SheetQuote):Record<string,MeasuredActual> {
  return Object.fromEntries(Object.entries(quote.actuals??{}).filter(([k])=>/^\d+$/.test(k)).map(([k,a])=>[k,{...a,height:a.height===undefined?undefined:a.height*(quote.actualsUnits==='in-lb'?2.54:1),grossWeight:a.grossWeight===undefined?undefined:a.grossWeight*(quote.actualsUnits==='in-lb'?.45359237:1)}]));
}
export function recordActuals(q:SheetQuote, actuals:Record<string,MeasuredActual>, count:number|undefined, manual:Record<string,boolean>, profile:ReceiverProfile, version:string, timestamp:string) {
  if(count!==undefined&&(!Number.isInteger(count)||count<0||count>100000))throw new Error('Actual pallet count must be an integer from 0 to 100000');
  const measured=Object.fromEntries(Object.entries(actuals).map(([k,a])=>{
    if(!/^\d+$/.test(k)||!q.pallets.some(p=>p.index===+k))throw new Error('Unknown actuals pallet index');
    for(const key of ['height','grossWeight'] as const)if(a[key]!==undefined&&(!Number.isFinite(a[key])||a[key]!<=0||a[key]!>(key==='height'?1000:100000)))throw new Error('Measurements must be positive and within range');
    if(a.crewInitials!==undefined&&(typeof a.crewInitials!=='string'||a.crewInitials.length>80))throw new Error('Crew initials must be at most 80 characters');
    if(a.photo!==undefined&&(!/^data:image\/(png|jpeg|webp);base64,/.test(a.photo)||a.photo.length>2800000))throw new Error('Photo must be PNG/JPEG/WebP under 2 MB');
    return [k,{...a,timestamp:a.timestamp?new Date(a.timestamp).toISOString():new Date(timestamp).toISOString()}];
  }));
  const imperial=q.units.request==='in-lb';
  const storedActuals={...Object.fromEntries(Object.entries(measured).map(([k,a])=>[k,{...a,height:a.height===undefined?undefined:a.height/(imperial?2.54:1),grossWeight:a.grossWeight===undefined?undefined:a.grossWeight/(imperial?.45359237:1)}])),summary:{...q.request?.actuals?.summary,actualPalletCount:count,measuredAt:timestamp}};
  const pallets=q.pallets.map(p=>{const a=measured[p.index];if(!a)return p;const variance=(predicted:number,measured:number)=>({predicted,measured,delta:measured-predicted,deltaPct:predicted?(measured-predicted)/predicted*100:0});return {...p,variance:{...(a.height===undefined?{}:{height:variance(p.outerDims.h.cm,a.height)}),...(a.grossWeight===undefined?{}:{grossWeight:variance(p.grossWeight.kg,a.grossWeight)})}};});
  return {...q,pallets,actuals:storedActuals,actualsUnits:q.units.request,manualChecklist:manual,profileSnapshot:profile,profileVersion:version,variance:{summary:storedActuals.summary},request:q.request?{...q.request,actuals:storedActuals}:undefined};
}
