import {sendDue,type FollowupEnv} from '../../functions/api/_followup';
export default {async scheduled(_event:ScheduledController,env:FollowupEnv,ctx:ExecutionContext){ctx.waitUntil(sendDue(env));}};
