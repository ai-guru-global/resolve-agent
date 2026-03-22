# 配置参考

本文档详细说明 ResolveNet 的所有配置选项。

---

## 配置文件位置

ResolveNet 按以下优先级查找配置文件：

1. 命令行指定：`--config /path/to/config.yaml`
2. 当前目录：`./resolvenet.yaml`
3. 用户目录：`$HOME/.resolvenet/config.yaml`
4. 系统目录：`/etc/resolvenet/resolvenet.yaml`

---

## 环境变量覆盖

所有配置都可以通过环境变量覆盖，格式为：

```
RESOLVENET_<SECTION>_<KEY>=value
```

示例：
```bash
export RESOLVENET_SERVER_HTTP_ADDR=":8888"
export RESOLVENET_DATABASE_HOST="db.example.com"
export RESOLVENET_REDIS_ADDR="redis.example.com:6379"
```

---

## 平台服务配置

文件：`resolvenet.yaml`

### 服务器配置

```yaml
server:
  # HTTP API 监听地址
  http_addr: ":8080"
  
  # gRPC API 监听地址
  grpc_addr: ":9090"
  
  # 读取超时
  read_timeout: 30s
  
  # 写入超时
  write_timeout: 30s
  
  # 空闲超时
  idle_timeout: 120s
  
  # 最大请求体大小
  max_request_size: 10MB
  
  # CORS 配置
  cors:
    enabled: true
    allowed_origins:
      - "http://localhost:3000"
      - "https://app.example.com"
    allowed_methods:
      - GET
      - POST
      - PUT
      - DELETE
    allowed_headers:
      - Authorization
      - Content-Type
```

### 数据库配置

```yaml
database:
  # 数据库类型
  driver: postgres
  
  # 连接信息
  host: localhost
  port: 5432
  user: resolvenet
  password: resolvenet
  dbname: resolvenet
  
  # SSL 模式: disable, require, verify-ca, verify-full
  sslmode: disable
  
  # 连接池配置
  pool:
    max_open_conns: 25
    max_idle_conns: 10
    conn_max_lifetime: 5m
    conn_max_idle_time: 10m
  
  # 自动迁移
  auto_migrate: true
```

### Redis 配置

```yaml
redis:
  # 连接地址
  addr: "localhost:6379"
  
  # 密码（可选）
  password: ""
  
  # 数据库编号
  db: 0
  
  # 连接池大小
  pool_size: 10
  
  # 最小空闲连接
  min_idle_conns: 5
  
  # 连接超时
  dial_timeout: 5s
  
  # 读取超时
  read_timeout: 3s
  
  # 写入超时
  write_timeout: 3s
```

### NATS 配置

```yaml
nats:
  # 连接 URL
  url: "nats://localhost:4222"
  
  # 集群 URL（可选）
  cluster_urls:
    - "nats://node1:4222"
    - "nats://node2:4222"
  
  # 认证
  user: ""
  password: ""
  token: ""
  
  # TLS 配置
  tls:
    enabled: false
    cert_file: ""
    key_file: ""
    ca_file: ""
  
  # 重连配置
  max_reconnects: 60
  reconnect_wait: 2s
```

### 运行时连接

```yaml
runtime:
  # Agent 运行时 gRPC 地址
  grpc_addr: "localhost:9091"
  
  # 连接超时
  connect_timeout: 10s
  
  # 请求超时
  request_timeout: 60s
  
  # 重试配置
  retry:
    max_attempts: 3
    initial_backoff: 100ms
    max_backoff: 5s
```

### 网关配置

```yaml
gateway:
  # 是否启用 Higress 网关
  enabled: false
  
  # 网关管理 URL
  admin_url: "http://localhost:8888"
  
  # 路由同步间隔
  sync_interval: 30s
  
  # 模型路由配置
  model_routing:
    enabled: true
    default_model: "qwen-plus"
```

### 遥测配置

```yaml
telemetry:
  # 是否启用遥测
  enabled: false
  
  # 服务名称
  service_name: "resolvenet-platform"
  
  # OTLP 端点
  otlp_endpoint: "localhost:4317"
  
  # 采样率 (0.0 - 1.0)
  sampling_rate: 1.0
  
  # 指标配置
  metrics:
    enabled: true
    port: 9090
    path: "/metrics"
  
  # 日志配置
  logging:
    level: "info"  # debug, info, warn, error
    format: "json"  # json, text
    output: "stdout"  # stdout, file
    file_path: "/var/log/resolvenet/platform.log"
```

---

## Agent 运行时配置

文件：`runtime.yaml`

### 服务器配置

```yaml
server:
  # 监听地址
  host: "0.0.0.0"
  port: 9091
  
  # 工作线程数
  workers: 4
  
  # gRPC 配置
  grpc:
    max_recv_msg_size: 16MB
    max_send_msg_size: 16MB
    keepalive:
      time: 30s
      timeout: 10s
```

### Agent 池配置

```yaml
agent_pool:
  # 最大 Agent 实例数
  max_size: 100
  
  # 驱逐策略: lru, lfu, fifo
  eviction_policy: "lru"
  
  # 空闲超时
  idle_timeout: 30m
  
  # 预热配置
  warmup:
    enabled: false
    agents: []
```

### 智能选择器配置

```yaml
selector:
  # 默认路由策略: rule, llm, hybrid
  default_strategy: "hybrid"
  
  # 置信度阈值（仅 hybrid 策略）
  confidence_threshold: 0.7
  
  # LLM 调用超时
  llm_timeout: 5s
  
  # 缓存配置
  cache:
    enabled: true
    ttl: 300s
    max_size: 1000
  
  # 默认规则
  default_rules:
    - pattern: "搜索|查找"
      route_type: skill
      target: web-search
      confidence: 0.9
```

### FTA 引擎配置

```yaml
fta:
  # 并行评估
  parallel_evaluation: true
  
  # 最大并行度
  max_parallelism: 10
  
  # 节点超时
  node_timeout: 60s
  
  # 工作流超时
  workflow_timeout: 300s
```

### 技能执行器配置

```yaml
skill_executor:
  # 沙箱配置
  sandbox:
    enabled: true
    type: "subprocess"  # subprocess, docker, nsjail
  
  # 资源限制
  resources:
    default_memory_mb: 256
    default_cpu_seconds: 30
    default_timeout_seconds: 60
    
    max_memory_mb: 1024
    max_cpu_seconds: 120
    max_timeout_seconds: 300
  
  # 技能加载路径
  skill_paths:
    - "/opt/resolvenet/skills"
    - "~/.resolvenet/skills"
```

### RAG 配置

```yaml
rag:
  # 默认嵌入模型
  default_embedding_model: "bge-large-zh"
  
  # 默认向量存储后端
  default_vector_backend: "milvus"
  
  # 分块默认配置
  chunking:
    default_strategy: "semantic"
    default_chunk_size: 512
    default_chunk_overlap: 50
  
  # 检索默认配置
  retrieval:
    default_top_k: 5
    default_score_threshold: 0.0
    rerank_enabled: false
    rerank_model: "bge-reranker-large"
```

### 遥测配置

```yaml
telemetry:
  enabled: false
  service_name: "resolvenet-runtime"
  otlp_endpoint: "localhost:4317"
```

---

## 模型配置

文件：`models.yaml`

### LLM 模型配置

```yaml
models:
  # 通义千问
  - id: qwen-turbo
    provider: qwen
    model_name: qwen-turbo
    max_tokens: 8192
    default_temperature: 0.7
    api_key: "${QWEN_API_KEY}"
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
  - id: qwen-plus
    provider: qwen
    model_name: qwen-plus
    max_tokens: 32768
    default_temperature: 0.7
    api_key: "${QWEN_API_KEY}"
    
  - id: qwen-max
    provider: qwen
    model_name: qwen-max
    max_tokens: 32768
    default_temperature: 0.7
    api_key: "${QWEN_API_KEY}"
    
  # 文心一言
  - id: ernie-4
    provider: wenxin
    model_name: ernie-4.0-8k
    max_tokens: 8192
    default_temperature: 0.7
    api_key: "${WENXIN_API_KEY}"
    secret_key: "${WENXIN_SECRET_KEY}"
    
  # 智谱清言
  - id: glm-4
    provider: zhipu
    model_name: glm-4
    max_tokens: 8192
    default_temperature: 0.7
    api_key: "${ZHIPU_API_KEY}"
    
  # OpenAI 兼容
  - id: custom-model
    provider: openai-compat
    model_name: gpt-4
    max_tokens: 8192
    api_key: "${OPENAI_API_KEY}"
    base_url: "https://api.openai.com/v1"
```

### 嵌入模型配置

```yaml
embeddings:
  - id: bge-large-zh
    provider: local
    model_path: "/models/bge-large-zh-v1.5"
    dimension: 1024
    batch_size: 32
    
  - id: bge-m3
    provider: local
    model_path: "/models/bge-m3"
    dimension: 1024
    
  - id: openai-ada
    provider: openai
    model_name: text-embedding-ada-002
    dimension: 1536
    api_key: "${OPENAI_API_KEY}"
```

### 重排序模型配置

```yaml
rerankers:
  - id: bge-reranker-large
    provider: local
    model_path: "/models/bge-reranker-large"
```

---

## 向量存储配置

### Milvus

```yaml
vector_store:
  backend: milvus
  
  milvus:
    # 连接配置
    host: localhost
    port: 19530
    
    # 认证
    user: ""
    password: ""
    
    # 索引配置
    index_type: IVF_FLAT  # FLAT, IVF_FLAT, IVF_SQ8, HNSW
    metric_type: COSINE   # L2, IP, COSINE
    
    # IVF 参数
    nlist: 1024
    nprobe: 16
    
    # HNSW 参数
    M: 16
    ef_construction: 256
    ef: 64
    
    # 连接池
    pool_size: 10
```

### Qdrant

```yaml
vector_store:
  backend: qdrant
  
  qdrant:
    # 连接配置
    host: localhost
    port: 6333
    grpc_port: 6334
    
    # 使用 gRPC
    prefer_grpc: true
    
    # API Key（可选）
    api_key: ""
    
    # HNSW 参数
    hnsw_config:
      m: 16
      ef_construct: 100
    
    # 优化器
    optimizer_config:
      memmap_threshold: 20000
```

---

## Agent 配置示例

```yaml
agent:
  name: my-assistant
  type: mega
  description: "通用智能助手"
  
  config:
    # LLM 配置
    model_id: qwen-plus
    
    # 系统提示词
    system_prompt: |
      你是一个智能助手，可以帮助用户解答问题、搜索信息和执行任务。
      请使用简洁、专业的语言回答。
    
    # 关联技能
    skill_names:
      - web-search
      - file-ops
      - code-runner
    
    # 关联工作流
    workflow_id: ""
    
    # 关联 RAG 知识库
    rag_collection_id: "product-docs"
    
    # 选择器配置
    selector_config:
      strategy: hybrid
      confidence_threshold: 0.7
      
      # 自定义路由规则
      rules:
        - pattern: "紧急|urgent"
          route_type: fta
          target: urgent-response
          confidence: 0.95
          
        - pattern: "文档|手册|帮助"
          route_type: rag
          target: product-docs
          confidence: 0.9
    
    # 记忆配置
    memory:
      enabled: true
      max_history: 50
      
    # 参数
    parameters:
      temperature: 0.7
      max_tokens: 4096
```

---

## 技能配置示例

```yaml
skill:
  name: web-search
  version: "1.0.0"
  description: "搜索互联网获取信息"
  author: "ResolveNet Team"
  
  # 入口配置
  entry_point: "skill:run"
  
  # 输入参数
  inputs:
    - name: query
      type: string
      required: true
      description: "搜索关键词"
      
    - name: num_results
      type: integer
      required: false
      default: 5
      description: "返回结果数量"
      constraints:
        min: 1
        max: 100
        
    - name: language
      type: string
      required: false
      default: "zh-CN"
      enum: ["zh-CN", "en-US", "ja-JP"]
      
  # 输出参数
  outputs:
    - name: results
      type: array
      description: "搜索结果列表"
      
    - name: total_count
      type: integer
      description: "总结果数"
      
  # 依赖
  dependencies:
    - requests>=2.28.0
    - beautifulsoup4>=4.11.0
    
  # 权限
  permissions:
    network_access: true
    file_system_read: false
    file_system_write: false
    allowed_hosts:
      - "*.google.com"
      - "*.bing.com"
    max_memory_mb: 256
    max_cpu_seconds: 30
    timeout_seconds: 60
```

---

## 工作流配置示例

```yaml
tree:
  id: incident-diagnosis
  name: "生产故障诊断"
  description: "自动化诊断生产环境故障"
  top_event_id: root-cause-found
  
  events:
    - id: root-cause-found
      name: "根本原因已定位"
      type: top
      
    - id: check-logs
      name: "检查日志"
      type: basic
      evaluator: "skill:log-analyzer"
      parameters:
        severity: "error"
      timeout_seconds: 120
      
    - id: check-metrics
      name: "检查指标"
      type: basic
      evaluator: "skill:metrics-checker"
      parameters:
        threshold: 90
        
    - id: consult-runbook
      name: "查阅手册"
      type: basic
      evaluator: "rag:runbook"
      parameters:
        top_k: 3
        
  gates:
    - id: evidence-gate
      name: "证据收集"
      type: or
      inputs: [check-logs, check-metrics, consult-runbook]
      output: root-cause-found
```

---

## 配置验证

使用 CLI 验证配置：

```bash
# 验证平台配置
resolvenet config validate -f resolvenet.yaml

# 验证运行时配置
resolvenet config validate -f runtime.yaml

# 验证模型配置
resolvenet config validate -f models.yaml
```

---

## 相关文档

- [快速入门](./quickstart.md) - 基本配置
- [部署指南](./deployment.md) - 生产环境配置
- [CLI 参考](./cli-reference.md) - 配置管理命令
