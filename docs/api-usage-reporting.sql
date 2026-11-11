-- Server-only dataset, populated after deployment. Counts are sampling-weighted.
-- API keys are pseudonyms, not unique people. Never join anonymous into a user.
-- First success is first OBSERVED in the retained window, not lifetime activation.
-- Daily traffic, including errors and rejected (non-billable) 429s:
SELECT toDate(timestamp) AS day, blob1 AS endpoint, blob2 AS status,
       blob4 AS identity_type, SUM(_sample_interval) AS requests
FROM dimpack3d_api_usage
WHERE timestamp >= NOW() - INTERVAL '28' DAY
GROUP BY day, endpoint, status, identity_type
ORDER BY day DESC, requests DESC;

-- Successful keyed calls / active days / first observed success.
-- Exact distinct and first timestamps are observational when AE samples data.
SELECT index1 AS client_id, MIN(timestamp) AS first_observed_success,
       MAX(timestamp) AS last_observed_success,
       COUNT(DISTINCT toDate(timestamp)) AS observed_active_days,
       SUM(_sample_interval) AS successful_calls
FROM dimpack3d_api_usage
WHERE timestamp >= NOW() - INTERVAL '28' DAY
  AND blob4 = 'keyed' AND blob2 >= '200' AND blob2 < '300'
GROUP BY client_id ORDER BY successful_calls DESC;

-- Latency buckets: measured until handler returns, excluding telemetry work.
SELECT blob1 AS endpoint, blob5 AS latency_bucket,
       SUM(_sample_interval) AS requests
FROM dimpack3d_api_usage
WHERE timestamp >= NOW() - INTERVAL '28' DAY
GROUP BY endpoint, latency_bucket;
