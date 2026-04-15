-- 009 rollback: Drop traffic capture tables
DROP TRIGGER IF EXISTS set_traffic_captures_updated_at ON resolveagent.traffic_captures;
DROP TABLE IF EXISTS resolveagent.traffic_records;
DROP TABLE IF EXISTS resolveagent.traffic_captures;
