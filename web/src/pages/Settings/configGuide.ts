export type RequirementVariant = 'destructive' | 'default' | 'secondary' | 'outline';
export type ConfigFilterTag = 'core' | 'feature' | 'optional';

export interface ConfigItem {
  name: string;
  keys: string[];
  requirement: string;
  requirementVariant: RequirementVariant;
  filterTag: ConfigFilterTag;
  purpose: string;
  effect: string;
  impact: string;
  example?: string;
}

export interface ConfigGroup {
  id: string;
  title: string;
  summary: string;
  items: ConfigItem[];
}

export const configGroups: ConfigGroup[] = [
  {
    id: 'required',
    title: '必须配置',
    summary: '不配置则平台无法启动',
    items: [
      {
        name: '数据库密码',
        keys: ['RESOLVEAGENT_DATABASE_PASSWORD'],
        requirement: '必填',
        requirementVariant: 'destructive',
        filterTag: 'core',
        purpose: 'PostgreSQL 连接鉴权，保护平台持久化数据不被未授权访问。',
        effect: '平台用它连接 PostgreSQL，承载 Registry 注册表、审计日志、反馈信号等全部业务数据。',
        impact: '平台启动失败。该项在 .env.example 中标记 [REQUIRED] 且无默认值，缺失时服务无法完成数据库连接。',
        example: 'RESOLVEAGENT_DATABASE_PASSWORD=your-password-here',
      },
    ],
  },
  {
    id: 'llm',
    title: 'AI 能力（LLM 接入）',
    summary: '不配置则 AI 相关路由降级，规则路径仍可用',
    items: [
      {
        name: 'LLM API Key',
        keys: ['RESOLVEAGENT_LLM_QWEN_API_KEY'],
        requirement: 'AI 功能必需',
        requirementVariant: 'default',
        filterTag: 'feature',
        purpose: '接入大模型服务商，为平台提供推理能力。',
        effect: '驱动智能选择器的 llm/hybrid 路由策略、Hybrid Planner 的 LLM 任务分解、路由兜底的 LLM 直答、代码分析的 LLM 诊断报告。同族变量还有 RESOLVEAGENT_LLM_WENXIN_API_KEY / RESOLVEAGENT_LLM_ZHIPU_API_KEY。',
        impact: 'LLM 相关路由不可用。弹性选择器会按错误分类降级到 rule 策略或知识路径重试；Playground 意图分析与多轮对话退化为规则匹配。FTA 数学计算、技能沙箱执行等不依赖 LLM 的功能不受影响。',
        example: 'RESOLVEAGENT_LLM_QWEN_API_KEY=sk-...',
      },
      {
        name: 'OpenAI 兼容直连',
        keys: ['RESOLVEAGENT_LLM_DIRECT', 'LLM_BASE_URL', 'LLM_DEFAULT_MODEL'],
        requirement: '可选',
        requirementVariant: 'secondary',
        filterTag: 'optional',
        purpose: '接入内置 Provider（Qwen/文心/智谱/Higress）之外的任意 OpenAI 兼容模型服务，如 Kimi、MiMo Token Plan。',
        effect: '三个变量配套使用：开启 RESOLVEAGENT_LLM_DIRECT 后，LLM 调用直接走 LLM_BASE_URL + LLM_DEFAULT_MODEL + API Key，绕过内置 Provider 抽象，configs/models.yaml 的注册表不参与。',
        impact: '仅能使用内置 Provider 接入的模型，无法对接其他 OpenAI 兼容服务。已配置 Qwen Key 时无额外影响。',
        example: 'RESOLVEAGENT_LLM_DIRECT=true',
      },
    ],
  },
  {
    id: 'rag',
    title: 'RAG 检索',
    summary: '不配置则语料导入与知识问答不可用',
    items: [
      {
        name: 'Embedding Key',
        keys: ['EMBEDDING_API_KEY', 'DASHSCOPE_API_KEY'],
        requirement: 'RAG 必需',
        requirementVariant: 'default',
        filterTag: 'feature',
        purpose: '文本向量化服务鉴权，是 RAG 检索链路的前置条件。两个变量二选一即可。',
        effect: '语料导入时对文档分块向量化入库（Milvus/Qdrant）；RAG 查询时对问题向量化后做相似度检索。默认走 DashScope 兼容端点 + text-embedding-v2 模型。',
        impact: '/v1/corpus/import 语料导入与 /v1/rag/query 检索问答不可用；排查结果无法沉淀为 RAG 语料，「用得越多、答得越准」的语料飞轮回写环节断裂。其余路由路径不受影响。',
        example: 'DASHSCOPE_API_KEY=sk-...',
      },
      {
        name: 'Embedding 端点覆盖',
        keys: ['EMBEDDING_BASE_URL', 'EMBEDDING_MODEL'],
        requirement: '可选',
        requirementVariant: 'secondary',
        filterTag: 'optional',
        purpose: '替换默认的 DashScope 向量化服务，改用任意 OpenAI 兼容 /embeddings 端点。',
        effect: '覆盖 Embedding 服务的地址（EMBEDDING_BASE_URL）与模型名（EMBEDDING_MODEL），适配私有化部署或其他云厂商的向量化接口。',
        impact: '使用默认 DashScope 端点与 text-embedding-v2，功能不受影响。',
      },
    ],
  },
  {
    id: 'datastore',
    title: '数据层连接',
    summary: '本地一键启动已带默认值，容器内自动拉起',
    items: [
      {
        name: 'Redis 地址',
        keys: ['RESOLVEAGENT_REDIS_ADDR'],
        requirement: '默认即可',
        requirementVariant: 'outline',
        filterTag: 'optional',
        purpose: '连接 Redis 缓存与短期记忆存储。',
        effect: '承载 Episodic 短期记忆（带 TTL 自动过期）与会话缓存。',
        impact: '会话级上下文无法跨请求保持。./scripts/start-local.sh deps 会自动拉起容器并使用默认地址，本地开发无需手动配置。',
        example: 'RESOLVEAGENT_REDIS_ADDR=localhost:6379',
      },
      {
        name: 'NATS 地址',
        keys: ['RESOLVEAGENT_NATS_URL'],
        requirement: '默认即可',
        requirementVariant: 'outline',
        filterTag: 'optional',
        purpose: '连接 NATS 消息总线，提供服务间事件通信能力。',
        effect: 'Pub/Sub 与 Request/Response 消息总线，当前版本尚无生产调用方（计划 v0.6.0 分布式阶段接入 JetStream）。',
        impact: '影响有限。总线本身可用但零调用方，缺失不影响现有功能路径；本地启动已自动拉起容器。',
        example: 'RESOLVEAGENT_NATS_URL=nats://localhost:4222',
      },
    ],
  },
  {
    id: 'optional',
    title: '可选开关',
    summary: '默认关闭，按需开启后才有对应配置项',
    items: [
      {
        name: 'Higress 网关',
        keys: ['RESOLVEAGENT_GATEWAY_ENABLED', 'RESOLVEAGENT_GATEWAY_AUTH_JWT_SECRET'],
        requirement: '可选',
        requirementVariant: 'secondary',
        filterTag: 'optional',
        purpose: '启用 Higress AI 网关，让流量经网关统一转发。',
        effect: '开启后支持网关模型路由、负载均衡；再配置 RESOLVEAGENT_GATEWAY_AUTH_JWT_SECRET 可启用 JWT 鉴权。',
        impact: '默认关闭，客户端直连平台 8080 端口。单机开发与内网部署无影响；生产环境暴露公网时建议开启网关鉴权。',
        example: 'RESOLVEAGENT_GATEWAY_ENABLED=false',
      },
      {
        name: 'OpenTelemetry 遥测',
        keys: ['RESOLVEAGENT_TELEMETRY_ENABLED', 'RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT'],
        requirement: '可选',
        requirementVariant: 'secondary',
        filterTag: 'optional',
        purpose: '开启跨服务链路追踪与遥测数据导出。',
        effect: '结构化日志携带 trace 关联，遥测数据导出至 OTLP collector（地址由 RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT 指定）。',
        impact: '默认关闭，无跨服务链路导出；本地结构化日志、Prometheus 指标与健康检查端点均不受影响。',
        example: 'RESOLVEAGENT_TELEMETRY_ENABLED=false',
      },
    ],
  },
];
