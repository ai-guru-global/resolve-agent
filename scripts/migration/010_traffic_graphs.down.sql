-- 010 rollback: Drop traffic graph tables
DROP TRIGGER IF EXISTS set_traffic_graphs_updated_at ON resolveagent.traffic_graphs;
DROP TABLE IF EXISTS resolveagent.traffic_graphs;
