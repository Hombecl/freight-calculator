interface Env {FOLLOWUP_ENABLED?:string;FOLLOWUP_CRON_TOKEN?:string}
export async function dispatch(env:Env){
 if(env.FOLLOWUP_ENABLED!=='true'||!env.FOLLOWUP_CRON_TOKEN)return;
 const response=await fetch('https://www.dimpack3d.com/api/followup-dispatch',{method:'POST',headers:{Authorization:`Bearer ${env.FOLLOWUP_CRON_TOKEN}`},signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error(`Follow-up dispatch HTTP ${response.status}`);
}
export default {async scheduled(_event:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(dispatch(env));}};
