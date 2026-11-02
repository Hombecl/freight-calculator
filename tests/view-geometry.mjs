import assert from 'node:assert/strict';
import {fitViewDistance,viewAngles} from '../src/lib/viewGeometry.ts';
for(const c of [{l:1203,w:235,h:269},{l:589,w:235,h:239},{l:30,w:1000,h:100},{l:1,w:1,h:1000}])for(const aspect of [.4,.8,1.6,3])for(const view of ['perspective','top','side','door'])for(const edge of ['E','W','N','S'])for(const turn of [0,.25,.5,.75,1,1.25,1.5,1.75]){
 const {theta:baseTheta,phi}=viewAngles(view,edge),theta=baseTheta+turn*Math.PI,d=fitViewDistance(c,aspect,45,theta,phi),tv=Math.tan(Math.PI/8);
 assert.ok(Number.isFinite(d)&&d>0);
 for(const x of [-c.l/2,c.l/2])for(const y of [-c.h/2,c.h/2])for(const z of [-c.w/2,c.w/2]){
  const depth=x*Math.sin(phi)*Math.sin(theta)+y*Math.cos(phi)+z*Math.sin(phi)*Math.cos(theta);
  const rx=x*Math.cos(theta)-z*Math.sin(theta),uy=-x*Math.cos(phi)*Math.sin(theta)+y*Math.sin(phi)-z*Math.cos(phi)*Math.cos(theta);
  assert.ok(d>depth);assert.ok(Math.abs(rx)/((d-depth)*tv*aspect)<.87);assert.ok(Math.abs(uy)/((d-depth)*tv)<.87);
 }
}
console.log('View geometry: container corners fit all camera presets, door edges and viewport aspects');
