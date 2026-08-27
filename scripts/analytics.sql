-- DimPack3D Analytics Engine dataset: dimpack3d_events
-- Run one query at a time in Cloudflare Dashboard > Analytics Engine > SQL.
-- SUM(_sample_interval) keeps counts correct if adaptive sampling is activated.

-- Daily events, last 30 days
SELECT
  toDate(timestamp) AS day,
  SUM(_sample_interval) AS events
FROM dimpack3d_events
WHERE timestamp >= NOW() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day DESC;

-- Funnel events, last 30 days
SELECT
  index1 AS event,
  SUM(_sample_interval) AS events
FROM dimpack3d_events
WHERE timestamp >= NOW() - INTERVAL 30 DAY
GROUP BY event
ORDER BY events DESC;

-- Pageviews by path, last 30 days
SELECT
  blob1 AS path,
  SUM(_sample_interval) AS pageviews
FROM dimpack3d_events
WHERE timestamp >= NOW() - INTERVAL 30 DAY
  AND index1 = 'pageview'
GROUP BY path
ORDER BY pageviews DESC
LIMIT 50;

-- Referrers, countries, and metadata can be queried by grouping blob2, blob4,
-- and concat(index1, ':', blob3), respectively.
