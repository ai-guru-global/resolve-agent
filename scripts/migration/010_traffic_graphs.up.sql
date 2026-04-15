-- 010: Traffic Graphs — 流量图谱存储
-- 存储由流量数据生成的服务依赖图谱及分析报告

CREATE TABLE IF NOT EXISTS resolveagent.traffic_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_id UUID REFERENCES resolveagent.traffic_captures(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    graph_data JSONB DEFAULT '{}',
    nodes JSONB DEFAULT '[]',
    edges JSONB DEFAULT '[]',
    analysis_report TEXT DEFAULT '',
    suggestions JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_traffic_graphs_capture_id ON resolveagent.traffic_graphs(capture_id);
CREATE INDEX IF NOT EXISTS idx_traffic_graphs_status ON resolveagent.traffic_graphs(status);

-- Auto-update trigger
CREATE OR REPLACE TRIGGER set_traffic_graphs_updated_at
    BEFORE UPDATE ON resolveagent.traffic_graphs
    FOR EACH ROW
    EXECUTE FUNCTION resolveagent.update_updated_at_column();
