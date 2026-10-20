import assert from 'node:assert/strict';
import {feedbackMeta,OUTCOMES,PURPOSES,BLOCKERS} from '../src/lib/exportFeedback.ts';
import {usageTransition} from '../src/lib/workflowUsage.ts';
for(const tool of ['planner','warehouse']) for(const format of ['pdf','csv']) for(const outcome of OUTCOMES) for(const purpose of PURPOSES) for(const blocker of BLOCKERS){
 const meta=feedbackMeta(tool,format,outcome,purpose,blocker);assert.ok(meta.length<=40);assert.equal(meta.includes('private'),false);
 if(outcome!=='edit')assert.ok(meta.endsWith(':none'));
}
assert.equal(feedbackMeta('planner','pdf','edit','load',''),null);
assert.equal(feedbackMeta('planner','pdf','usable','private cargo name',''),null);
let state={records:[]};const e={job:'private job',revision:'private hash',day:10,kind:'planner_pdf'};
let next=usageTransition(state,e);assert.equal(next.event.job,'first_job');
next=usageTransition(next.state,{...e,day:18});assert.equal(next.event.job,'repeat');assert.equal(next.event.return,'7_29d');
next=usageTransition(next.state,{...e,day:19});assert.equal(next.event.return,'1_6d');
assert.equal(usageTransition(next.state,{...e,revision:'changed',day:19}).event.job,'revision');
assert.equal(usageTransition(next.state,{...e,job:'another',day:19}).event.job,'next_job');
console.log('Export feedback categories and repeat intervals passed');
