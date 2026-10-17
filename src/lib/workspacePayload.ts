import { parseQuoteRequest, QUOTE_EXAMPLE, type OrderQuoteRequest } from './orderQuote';
import { parseProfile } from './receiverProfiles';
export type WorkspaceKind = 'order' | 'cargo' | 'receiver';
/** Explicit allowlist: no crew photos, notes or browser state are uploaded. */
export function workspacePayload(kind: WorkspaceKind, value: unknown): Record<string, unknown> {
 if (!value || typeof value !== 'object' || JSON.stringify(value).length > 450000) throw Error('Invalid workspace content');
 const v = value as Record<string, any>;
 if (kind === 'receiver') return cleanProfile(value);
 const source = kind === 'cargo' ? {...QUOTE_EXAMPLE, units:v.units,items:v.items} : v.request;
 parseQuoteRequest(source);
 const r = source as OrderQuoteRequest;
 const items = r.items.map(i=>({sku:i.sku,label:i.label,l:i.l,w:i.w,h:i.h,qty:i.qty,weight:i.weight,keepUpright:i.keepUpright,maxStack:i.maxStack}));
 if (kind === 'cargo') return {units:r.units??'cm-kg',items};
 const request: OrderQuoteRequest = {orderId:r.orderId,units:r.units,maxPallets:r.maxPallets,packing:r.packing?{strategy:r.packing.strategy,ordering:r.packing.ordering}:undefined,pallet:{l:r.pallet.l,w:r.pallet.w,baseHeight:r.pallet.baseHeight,maxHeight:r.pallet.maxHeight,maxWeight:r.pallet.maxWeight,tareWeight:r.pallet.tareWeight},items,packagingAllowance:r.packagingAllowance?{height:r.packagingAllowance.height,weight:r.packagingAllowance.weight}:undefined,limits:r.limits?{name:r.limits.name,maxLoadedHeight:r.limits.maxLoadedHeight,maxGrossWeight:r.limits.maxGrossWeight}:undefined};
 return {request,...(v.profileSnapshot?{profileSnapshot:cleanProfile(v.profileSnapshot)}:{})};
}

function cleanProfile(value:unknown):Record<string,unknown>{
 const p=parseProfile(value);
 return {id:p.id,name:p.name,template:p.template,source:p.source,verifiedAt:p.verifiedAt,verificationNote:p.verificationNote,unverified:p.unverified,approvedBy:p.approvedBy,approvedAt:p.approvedAt,pallet:p.pallet,limits:p.limits,rules:p.rules.map(r=>({code:r.code,text:r.text,check:r.check}))};
}
