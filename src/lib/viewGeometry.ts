export type ViewPreset = 'perspective' | 'top' | 'side' | 'door';
export function viewAngles(view: ViewPreset, door: 'E'|'W'|'N'|'S' = 'E') {
  if (view === 'top') return {theta: 0, phi: 0.001};
  if (view === 'side') return {theta: 0, phi: Math.PI / 2};
  if (view === 'door') return {theta: door==='E'?Math.PI/2:door==='W'?-Math.PI/2:door==='N'?Math.PI:0, phi:Math.PI/2};
  return {theta:Math.PI/4,phi:Math.PI*0.32};
}
/** Fit every container corner in a perspective frustum; dimensions are not changed. */
export function fitViewDistance(c:{l:number;w:number;h:number},aspect:number,fovDegrees:number,theta:number,phi:number) {
  const tv=Math.tan(fovDegrees*Math.PI/360),th=tv*Math.max(0.1,aspect);
  let distance=1;
  for(const x of [-c.l/2,c.l/2])for(const y of [-c.h/2,c.h/2])for(const z of [-c.w/2,c.w/2]){
    const right=x*Math.cos(theta)-z*Math.sin(theta);
    const up=-x*Math.cos(phi)*Math.sin(theta)+y*Math.sin(phi)-z*Math.cos(phi)*Math.cos(theta);
    const depth=x*Math.sin(phi)*Math.sin(theta)+y*Math.cos(phi)+z*Math.sin(phi)*Math.cos(theta);
    distance=Math.max(distance,depth+1.16*Math.max(Math.abs(right)/th,Math.abs(up)/tv));
  }
  return distance;
}
