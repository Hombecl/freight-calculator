import type { PlannerBox } from './plannerBox';
/** Only supports below the current bottom can lower a box; never lift or clamp into another box. */
export function loweredBox(box: PlannerBox, boxes: PlannerBox[]): PlannerBox {
  let y=0;
  for(const other of boxes){
    if(other.id===box.id || (other as PlannerBox & {kind?:string}).kind==='zone')continue;
    const overlaps=box.px<other.px+other.l-1e-6 && box.px+box.l>other.px+1e-6 && box.pz<other.pz+other.w-1e-6 && box.pz+box.w>other.pz+1e-6;
    if(overlaps && other.py+other.h<=box.py+1e-6)y=Math.max(y,other.py+other.h);
  }
  return {...box,py:Math.min(box.py,y)};
}
export type CalculationSource='manual'|'import'|'container'|'overhang';
export const shouldCalculate=(source:CalculationSource,changed:boolean)=>source!=='manual'||changed;
