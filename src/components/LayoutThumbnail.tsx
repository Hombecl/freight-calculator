import {useEffect,useRef} from 'react';
import type {PlannerBox} from '../lib/plannerBox';
/** A common isometric camera draws actual placements; no extra WebGL contexts. */
export default function LayoutThumbnail({boxes,container,label}:{boxes:PlannerBox[];container:{l:number;w:number;h:number};label:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  const W=640,H=240;canvas.width=W;canvas.height=H;
  ctx.clearRect(0,0,W,H);
  const project=(x:number,y:number,z:number)=>[x-z,(x+z)*0.45-y];
  const corners=[...[-1,1]].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>project(x*container.l/2,y*container.h/2,z*container.w/2))));
  const maxX=Math.max(...corners.map(p=>Math.abs(p[0]))),maxY=Math.max(...corners.map(p=>Math.abs(p[1])));
  const scale=Math.min((W-36)/(2*maxX||1),(H-28)/(2*maxY||1));
  const point=(x:number,y:number,z:number)=>{const p=project(x-container.l/2,y-container.h/2,z-container.w/2);return [W/2+p[0]*scale,H/2+p[1]*scale];};
  const face=(pts:number[][],color:string)=>{ctx.beginPath();pts.forEach((p,i)=>{const q=point(p[0],p[1],p[2]);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#33415566';ctx.lineWidth=0.5;ctx.stroke();};
  [...boxes].sort((a,b)=>(a.px+a.l/2+a.pz+a.w/2+0.9*(a.py+a.h/2))-(b.px+b.l/2+b.pz+b.w/2+0.9*(b.py+b.h/2))).forEach(b=>{
   const x=b.px,y=b.py,z=b.pz,X=x+b.l,Y=y+b.h,Z=z+b.w,color='#'+b.color.toString(16).padStart(6,'0');
   const shade=(factor:number)=>'#'+[16,8,0].map(shift=>Math.round(((b.color>>shift)&255)*factor).toString(16).padStart(2,'0')).join('');
   face([[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],shade(0.78));
   face([[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]],shade(0.9));
   face([[x,Y,z],[X,Y,z],[X,Y,Z],[x,Y,Z]],color);
  });
  const {l,w,h}=container;ctx.strokeStyle='#0284c7';ctx.lineWidth=1;
  const verts=[[0,0,0],[l,0,0],[l,0,w],[0,0,w],[0,h,0],[l,h,0],[l,h,w],[0,h,w]];
  for(const [a,b]of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]){const p=point(...verts[a] as [number,number,number]),q=point(...verts[b] as [number,number,number]);ctx.beginPath();ctx.moveTo(...p as [number,number]);ctx.lineTo(...q as [number,number]);ctx.stroke();}
 },[boxes,container.l,container.w,container.h]);
 return <canvas ref={ref} role="img" aria-label={label} className="w-full h-24 object-contain rounded bg-slate-50 my-2"/>;
}
