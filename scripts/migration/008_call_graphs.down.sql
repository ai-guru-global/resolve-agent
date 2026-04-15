-- 008 rollback: Drop call graph tables
DROP TRIGGER IF EXISTS set_call_graphs_updated_at ON resolveagent.call_graphs;
DROP TABLE IF EXISTS resolveagent.call_graph_edges;
DROP TABLE IF EXISTS resolveagent.call_graph_nodes;
DROP TABLE IF EXISTS resolveagent.call_graphs;
