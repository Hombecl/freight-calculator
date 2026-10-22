import {useEffect,useRef,useState} from 'react';
import type {PackContainer,PackItemSpec} from '../lib/binPacking';
import type {OptimizedResult} from '../lib/optimizePacking';
import type {LayoutAlternative} from '../lib/plannerAlternatives';
export function usePlannerAlternatives(container:PackContainer & {door?:{w:number;h:number}|null},specs:PackItemSpec[],base:OptimizedResult){
 const [state,setState]=useState<{base:OptimizedResult;status:'running'|'done'|'error'|'cancelled';items:LayoutAlternative[]}|null>(null);
 const running=useRef<Worker|null>(null);
 useEffect(()=>()=>{running.current?.terminate();running.current=null;},[base]);
 const start=()=>{
  running.current?.terminate();
  setState({base,status:'running',items:[]});
  try{
   const worker=new Worker(new URL('../workers/plannerAlternatives.worker.ts',import.meta.url),{type:'module'});
   running.current=worker;
   const finish=(status:'done'|'error',items:LayoutAlternative[]=[])=>{
    if(running.current!==worker)return;
    worker.terminate();running.current=null;setState({base,status,items});
   };
   worker.onmessage=({data})=>finish(data.type==='result'?'done':'error',data.alternatives??[]);
   worker.onerror=()=>finish('error');worker.onmessageerror=()=>finish('error');
   worker.postMessage({container,specs,recommended:base});
  }catch{setState({base,status:'error',items:[]});}
 };
 const current=state?.base===base?state:null;
 return {items:current?.items??[],status:current?.status??'idle',start,cancel:()=>{running.current?.terminate();running.current=null;setState({base,status:'cancelled',items:[]});}};
}
