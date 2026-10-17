-- Aggregate only. Saved own jobs are self-classified planning activity, not shipment completion.
-- Revisions of one record count once; age eligibility prevents immature 7/30-day cohorts.
with jobs as (
 select r.workspace_id,r.id,min(v.created_at) as first_own_save
 from public.dp_workspace_records r join public.dp_workspace_revisions v on v.record_id=r.id
 where r.kind='order' and v.own_job group by r.workspace_id,r.id
), teams as (
 select workspace_id,min(first_own_save) as first_job,count(*) as jobs,
 count(distinct first_own_save::date) as active_job_days from jobs group by workspace_id
)
select count(*) as teams_with_own_jobs,
 count(*) filter(where jobs>=2) as teams_with_second_distinct_job,
 count(*) filter(where active_job_days>=2) as teams_saving_jobs_on_multiple_days,
 count(*) filter(where first_job<=now()-interval '7 days') as eligible_7d_teams,
 count(*) filter(where first_job<=now()-interval '7 days' and exists(select 1 from jobs j where j.workspace_id=teams.workspace_id and j.first_own_save>=teams.first_job+interval '7 days')) as teams_with_job_after_7d,
 count(*) filter(where first_job<=now()-interval '30 days') as eligible_30d_teams,
 count(*) filter(where first_job<=now()-interval '30 days' and exists(select 1 from jobs j where j.workspace_id=teams.workspace_id and j.first_own_save>=teams.first_job+interval '30 days')) as teams_with_job_after_30d
from teams;
-- Do not join trial status or checkout clicks into a 'paid teams' count.
-- Profit validation needs settled payment, refunds, provider fees, infrastructure and support cost.
