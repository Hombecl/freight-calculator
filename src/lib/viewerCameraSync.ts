/** Per-workspace camera bus. Never stores cargo or changes a selected plan. */
export interface CameraPose {theta:number;phi:number;zoom:number;fixed:boolean;radius?:number;aspect?:number}
export function createCameraSync(){
  let current:CameraPose={theta:Math.PI/4,phi:Math.PI*.32,zoom:1,fixed:false};
  const listeners=new Set<(pose:CameraPose)=>void>();
  return {
    get:()=>current,
    publish(pose:CameraPose){current={...pose};listeners.forEach(fn=>fn(current));},
    subscribe(fn:(pose:CameraPose)=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
  };
}
export type CameraSync=ReturnType<typeof createCameraSync>;
