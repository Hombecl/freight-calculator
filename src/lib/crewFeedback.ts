/** Only measurements travel back to the planner. Photos and crew identity stay local. */
export interface CrewFeedback {
 revision:string;
 reportId:string;
 actuals:Record<string,{height?:number;grossWeight?:number}>;
 palletCount?:number;
 receivedAt?:string;
}
export function parseCrewFeedback(value:unknown,revision:string,pallets:number):CrewFeedback {
 const v=value as CrewFeedback;
 if(!v||v.revision!==revision||!/^([a-f0-9]{32})$/.test(v.reportId))throw Error('Report revision or ID does not match');
 if(!v.actuals||typeof v.actuals!=='object'||Array.isArray(v.actuals))throw Error('Invalid measurements');
 const actuals:CrewFeedback['actuals']={};
 for(const [index,a] of Object.entries(v.actuals)) {
  if(!/^(0|[1-9][0-9]*)$/.test(index)||+index>=pallets||!a||typeof a!=='object')throw Error('Unknown pallet');
  const clean:{height?:number;grossWeight?:number}={};
  for(const key of ['height','grossWeight'] as const)if(a[key]!==undefined){const n=a[key];if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>(key==='height'?1000:100000))throw Error('Measurements outside range');clean[key]=n;}
  if(Object.keys(clean).length)actuals[index]=clean;
 }
 if(v.palletCount!==undefined&&(!Number.isInteger(v.palletCount)||v.palletCount<0||v.palletCount>100000))throw Error('Invalid pallet count');
 if(!Object.keys(actuals).length&&v.palletCount===undefined)throw Error('Enter a measurement first');
 return {revision,reportId:v.reportId,actuals,...(v.palletCount===undefined?{}:{palletCount:v.palletCount})};
}
