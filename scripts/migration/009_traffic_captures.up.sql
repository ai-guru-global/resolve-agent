-- 009: Traffic Captures — 运行时流量捕获存储
-- 支持 eBPF/tcpdump/OTel/Proxy 多种捕获源

-- traffic_captures: 流量捕获会话元数据
CREATE TABLE IF NOT EXISTS resolveagent.traffic_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    target_service VARCHAR(255),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    config JSONB DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    labels JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- traffic_records: 单条流量记录
CREATE TABLE IF NOT EXISTS resolveagent.traffic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capture_id UUID NOT NULL REFERENCES resolveagent.traffic_captures(id) ON DELETE CASCADE,
    source_service VARCHAR(255) NOT NULL,
    dest_service VARCHAR(255) NOT NULL,
    protocol VARCHAR(50),
    method VARCHAR(20),
    path VARCHAR(500),
    status_code INT,
    latency_ms INT,
    request_size INT,
    response_size INT,
    trace_id VARCHAR(64),
    span_id VARCHAR(32),
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_traffic_captures_status ON resolveagent.traffic_captures(status);
CREATE INDEX IF NOT EXISTS idx_traffic_captures_source_type ON resolveagent.traffic_captures(source_type);
CREATE INDEX IF NOT EXISTS idx_traffic_records_capture_id ON resolveagent.traffic_records(capture_id);
CREATE INDEX IF NOT EXISTS idx_traffic_records_services ON resolveagent.traffic_records(source_service, dest_service);
CREATE INDEX IF NOT EXISTS idx_traffic_records_trace_id ON resolveagent.traffic_records(trace_id);
CREATE INDEX IF NOT EXISTS idx_traffic_records_timestamp ON resolveagent.traffic_records(timestamp);

-- Auto-update trigger
CREATE OR REPLACE TRIGGER set_traffic_captures_updated_at
    BEFORE UPDATE ON resolveagent.traffic_captures
    FOR EACH ROW
    EXECUTE FUNCTION resolveagent.update_updated_at_column();
