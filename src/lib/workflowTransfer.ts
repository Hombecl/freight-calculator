import type {PackItemSpec} from './binPacking';
import type {OrderQuote} from './orderQuote';
export const CARGO_TRANSFER='dp_cargo_transfer_v1';
export interface CargoTransfer {orderId:string;revision:string;model:'loose-cartons'|'built-pallets';specs:PackItemSpec[]}
export function palletTransfer(q:OrderQuote):CargoTransfer{
 if(q.status==='partial')throw Error('Place every carton before transferring pallets');
 return {orderId:q.orderId??'order',revision:q.inputHash,model:'built-pallets',specs:q.pallets.map(p=>({id:`pallet-${p.index+1}`,label:`Pallet ${p.index+1}`,l:p.outerDims.l.cm,w:p.outerDims.w.cm,h:p.outerDims.h.cm,weight:p.grossWeight.kg,qty:1,keepUpright:true,maxStack:0,color:0x60a5fa}))};
}
export function readCargoTransfer():CargoTransfer|null{try{const value=JSON.parse(sessionStorage.getItem(CARGO_TRANSFER)??'null');if(!value||!['loose-cartons','built-pallets'].includes(value.model)||typeof value.orderId!=='string'||!Array.isArray(value.specs)||value.specs.length>300||value.specs.some((s:PackItemSpec)=>!['l','w','h','qty','weight'].every(k=>Number.isFinite(s[k as keyof PackItemSpec]))||s.l<=0||s.w<=0||s.h<=0||!Number.isInteger(s.qty)||s.qty<1||s.weight<0||s.weightKnown===false))return null;return value;}catch{return null;}}
