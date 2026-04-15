-- 008: Call Graphs — 代码调用图存储
-- 支持从入口点出发的函数调用链分析

-- call_graphs: 调用图元数据
CREATE TABLE IF NOT EXISTS resolveagent.call_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES resolveagent.code_analyses(id) ON DELETE SET NULL,
    repository_url VARCHAR(500) NOT NULL,
    branch VARCHAR(255) DEFAULT 'main',
    language VARCHAR(50) NOT NULL,
    entry_point VARCHAR(500) NOT NULL,
    node_count INT DEFAULT 0,
    edge_count INT DEFAULT 0,
    max_depth INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    graph_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- call_graph_nodes: 调用图中的函数节点
CREATE TABLE IF NOT EXISTS resolveagent.call_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_graph_id UUID NOT NULL REFERENCES resolveagent.call_graphs(id) ON DELETE CASCADE,
    function_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500),
    line_start INT,
    line_end INT,
    package VARCHAR(255),
    node_type VARCHAR(50) DEFAULT 'internal',
    metadata JSONB DEFAULT '{}'
);

-- call_graph_edges: 调用图中的调用关系边
CREATE TABLE IF NOT EXISTS resolveagent.call_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_graph_id UUID NOT NULL REFERENCES resolveagent.call_graphs(id) ON DELETE CASCADE,
    caller_node_id UUID NOT NULL REFERENCES resolveagent.call_graph_nodes(id) ON DELETE CASCADE,
    callee_node_id UUID NOT NULL REFERENCES resolveagent.call_graph_nodes(id) ON DELETE CASCADE,
    call_type VARCHAR(50) DEFAULT 'direct',
    weight INT DEFAULT 1,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_graphs_analysis_id ON resolveagent.call_graphs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_call_graph_nodes_graph_id ON resolveagent.call_graph_nodes(call_graph_id);
CREATE INDEX IF NOT EXISTS idx_call_graph_edges_graph_id ON resolveagent.call_graph_edges(call_graph_id);
CREATE INDEX IF NOT EXISTS idx_call_graph_edges_caller ON resolveagent.call_graph_edges(caller_node_id);
CREATE INDEX IF NOT EXISTS idx_call_graph_edges_callee ON resolveagent.call_graph_edges(callee_node_id);

-- Auto-update trigger for call_graphs
CREATE OR REPLACE TRIGGER set_call_graphs_updated_at
    BEFORE UPDATE ON resolveagent.call_graphs
    FOR EACH ROW
    EXECUTE FUNCTION resolveagent.update_updated_at_column();
