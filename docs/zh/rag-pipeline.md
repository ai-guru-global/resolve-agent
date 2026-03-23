# RAG 管道

检索增强生成（Retrieval-Augmented Generation, RAG）管道是 ResolveAgent 的知识管理核心，支持文档摄取、向量索引和语义检索。

---

## 概述

### 什么是 RAG？

RAG 是一种将**信息检索**与**大语言模型生成**相结合的技术架构，通过从外部知识库检索相关信息来增强 LLM 的回答质量。

### ResolveAgent RAG 特性

| 特性 | 说明 |
|------|------|
| **多格式支持** | 支持 PDF、Word、Markdown、HTML 等 |
| **智能分块** | 多种分块策略：固定、句子、语义 |
| **向量存储** | 支持 Milvus 和 Qdrant |
| **重排序** | 交叉编码器二次排序 |
| **中文优化** | BGE 系列嵌入模型原生支持 |
| **混合检索** | 向量检索 + 关键词检索组合 |

---

## 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAG 管道架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    文档摄取 (Ingestion)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │  解析    │→→│  分块    │→→│  嵌入    │→→│    索引       │   │   │
│  │  │ (Parser) │  │(Chunker) │  │(Embedder)│  │  (Indexer)   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    语义检索 (Retrieval)                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │   │
│  │  │查询嵌入  │→→│向量搜索  │→→│  重排序  │→→│   返回结果    │   │   │
│  │  │(Embed)   │  │(Search)  │  │(Rerank)  │  │  (Results)   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    增强生成 (Generation)                         │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────────┐  ┌───────────────────────────────────┐   │   │
│  │  │  上下文注入      │→→│         LLM 生成响应               │   │   │
│  │  │ (Context Inject) │  │       (Generate Response)         │   │   │
│  │  └──────────────────┘  └───────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 知识库管理

### 创建知识库

```bash
# 创建知识库（集合）
resolveagent rag collection create product-docs \
  --embedding-model bge-large-zh \
  --description "产品文档知识库"
```

#### 配置选项

```yaml
# collection-config.yaml
collection:
  name: product-docs
  description: "产品文档知识库"
  
  # 嵌入模型配置
  embedding:
    model: bge-large-zh  # 推荐中文场景使用
    dimension: 1024
    
  # 分块配置
  chunking:
    strategy: semantic    # fixed | sentence | semantic
    chunk_size: 512
    chunk_overlap: 50
    
  # 向量存储配置
  vector_store:
    backend: milvus      # milvus | qdrant
    index_type: IVF_FLAT
    metric_type: COSINE
```

```bash
# 使用配置文件创建
resolveagent rag collection create -f collection-config.yaml
```

### 列出知识库

```bash
resolveagent rag collection list

输出:
NAME           DOCS    VECTORS    EMBEDDING        STATUS
product-docs   156     12,480     bge-large-zh     active
runbook        42      3,360      bge-large-zh     active
faq            89      5,340      bge-m3           active
```

### 查看知识库详情

```bash
resolveagent rag collection info product-docs

输出:
名称: product-docs
描述: 产品文档知识库
状态: active

统计:
  文档数: 156
  分块数: 12,480
  
嵌入配置:
  模型: bge-large-zh
  维度: 1024
  
分块配置:
  策略: semantic
  大小: 512
  重叠: 50
  
向量存储:
  后端: milvus
  索引: IVF_FLAT
```

### 删除知识库

```bash
# 删除知识库
resolveagent rag collection delete product-docs

# 强制删除
resolveagent rag collection delete product-docs --force
```

---

## 文档摄取

### 支持的格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| 纯文本 | .txt | 直接处理 |
| Markdown | .md | 保留结构 |
| PDF | .pdf | 文本提取 |
| Word | .docx | 内容解析 |
| HTML | .html | 文本提取 |
| JSON | .json | 结构化数据 |
| CSV | .csv | 表格数据 |

### 摄取文档

```bash
# 摄取单个文件
resolveagent rag ingest --collection product-docs --path ./guide.pdf

# 摄取目录
resolveagent rag ingest --collection product-docs --path ./documents/

# 递归摄取
resolveagent rag ingest --collection product-docs --path ./docs/ --recursive

# 指定文件类型
resolveagent rag ingest --collection product-docs \
  --path ./docs/ \
  --include "*.md,*.pdf"

# 排除文件
resolveagent rag ingest --collection product-docs \
  --path ./docs/ \
  --exclude "*.draft.md"
```

### 摄取选项

```bash
resolveagent rag ingest --collection product-docs \
  --path ./documents/ \
  --chunking-strategy semantic \    # 分块策略
  --chunk-size 512 \                # 分块大小
  --chunk-overlap 50 \              # 重叠大小
  --batch-size 100 \                # 批处理大小
  --metadata '{"category": "guide"}'  # 文档元数据
```

### 查看摄取状态

```bash
# 查看摄取任务
resolveagent rag ingest-status

输出:
TASK_ID    COLLECTION     STATUS      PROGRESS    DOCUMENTS
abc123     product-docs   running     45/156      guide.pdf
def456     runbook        completed   42/42       -
```

### API 方式摄取

```python
from resolveagent.rag import RAGPipeline

pipeline = RAGPipeline(
    embedding_model="bge-large-zh",
    vector_backend="milvus"
)

# 摄取文档
result = await pipeline.ingest(
    collection_id="product-docs",
    documents=[
        {
            "content": "文档内容...",
            "metadata": {
                "title": "快速入门",
                "category": "guide"
            }
        }
    ]
)

print(f"处理文档: {result['documents_processed']}")
print(f"创建分块: {result['chunks_created']}")
```

---

## 分块策略

### 1. 固定分块 (Fixed)

按固定字符数分块。

```yaml
chunking:
  strategy: fixed
  chunk_size: 500
  chunk_overlap: 50
```

**优点**：简单、可预测
**缺点**：可能破坏语义完整性

### 2. 句子分块 (Sentence)

按句子边界分块。

```yaml
chunking:
  strategy: sentence
  chunk_size: 512      # 最大字符数
  min_sentences: 3     # 最少句子数
```

**优点**：保持句子完整
**缺点**：分块大小不均

### 3. 语义分块 (Semantic) - 推荐

基于语义相似度动态分块。

```yaml
chunking:
  strategy: semantic
  chunk_size: 512
  similarity_threshold: 0.8  # 相似度阈值
```

**优点**：保持语义连贯
**缺点**：计算开销较大

### 分块可视化

```
原文:
"ResolveAgent 是一个 Mega Agent 平台。它支持技能、工作流和 RAG。
平台采用微服务架构。服务间通过 gRPC 通信。"

固定分块 (size=30):
├── "ResolveAgent 是一个 Mega Agent 平台。它"
├── "支持技能、工作流和 RAG。平台采用微服务"
└── "架构。服务间通过 gRPC 通信。"

句子分块:
├── "ResolveAgent 是一个 Mega Agent 平台。它支持技能、工作流和 RAG。"
└── "平台采用微服务架构。服务间通过 gRPC 通信。"

语义分块:
├── "ResolveAgent 是一个 Mega Agent 平台。它支持技能、工作流和 RAG。"  [产品介绍]
└── "平台采用微服务架构。服务间通过 gRPC 通信。"  [技术架构]
```

---

## 嵌入模型

### 支持的模型

| 模型 | 维度 | 适用场景 | 说明 |
|------|------|----------|------|
| `bge-large-zh` | 1024 | 中文 | 推荐中文场景 |
| `bge-large-en` | 1024 | 英文 | 推荐英文场景 |
| `bge-m3` | 1024 | 多语言 | 跨语言检索 |
| `text-embedding-ada-002` | 1536 | 通用 | OpenAI 模型 |
| `custom` | - | 自定义 | 自定义模型 |

### 配置嵌入模型

```yaml
# 在 models.yaml 中配置
embeddings:
  - id: bge-large-zh
    provider: local
    model_path: "/models/bge-large-zh-v1.5"
    dimension: 1024
    
  - id: openai-ada
    provider: openai
    model_name: text-embedding-ada-002
    api_key: "${OPENAI_API_KEY}"
    dimension: 1536
```

### 使用自定义模型

```python
from resolveagent.rag import EmbeddingModel

class CustomEmbedding(EmbeddingModel):
    def __init__(self, model_path: str):
        self.model = load_model(model_path)
        self.dimension = 768
    
    def embed(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts)
    
    def embed_query(self, query: str) -> list[float]:
        return self.model.encode([query])[0]
```

---

## 语义检索

### 基本查询

```bash
# 查询知识库
resolveagent rag query --collection product-docs \
  --query "如何配置智能选择器"

输出:
检索到 5 个相关文档:

1. [0.92] 智能选择器配置指南
   来源: intelligent-selector.md
   内容: 智能选择器支持三种路由策略...

2. [0.87] 系统配置
   来源: configuration.md
   内容: selector 配置项说明...
   
3. [0.83] 快速入门
   来源: quickstart.md
   内容: 在 Agent 中配置选择器...
```

### 高级查询选项

```bash
resolveagent rag query --collection product-docs \
  --query "部署配置" \
  --top-k 10 \                    # 返回数量
  --score-threshold 0.7 \         # 最低分数
  --filter '{"category": "ops"}' \  # 元数据过滤
  --rerank                        # 启用重排序
```

### API 查询

```python
from resolveagent.rag import RAGPipeline

pipeline = RAGPipeline()

# 基本查询
results = await pipeline.query(
    collection_id="product-docs",
    query="如何配置认证",
    top_k=5
)

for chunk in results:
    print(f"[{chunk['score']:.2f}] {chunk['document_title']}")
    print(f"  {chunk['content'][:100]}...")
```

### 混合检索

结合向量检索和关键词检索：

```python
results = await pipeline.query(
    collection_id="product-docs",
    query="Kubernetes 部署",
    top_k=10,
    retrieval_mode="hybrid",  # vector | keyword | hybrid
    hybrid_weights={
        "vector": 0.7,
        "keyword": 0.3
    }
)
```

### 重排序

使用交叉编码器进行二次排序：

```python
results = await pipeline.query(
    collection_id="product-docs",
    query="错误处理最佳实践",
    top_k=20,        # 初始检索数量
    rerank=True,
    rerank_model="bge-reranker-large",
    final_top_k=5    # 重排后返回数量
)
```

---

## 与 Agent 集成

### 在 Agent 中使用 RAG

```yaml
# agent.yaml
agent:
  name: knowledge-assistant
  type: mega
  config:
    model_id: qwen-plus
    rag_collection_id: product-docs
    system_prompt: |
      你是一个产品文档助手。
      使用检索到的知识来回答用户问题。
      如果知识库中没有相关信息，请明确告知。
```

### 智能选择器路由到 RAG

```yaml
# 选择器规则
selector_config:
  strategy: hybrid
  rules:
    - pattern: "文档|手册|指南|帮助"
      route_type: rag
      target: product-docs
      confidence: 0.9
```

### 在 FTA 工作流中使用

```yaml
# workflow.yaml
events:
  - id: consult-runbook
    name: "查阅运维手册"
    type: basic
    evaluator: "rag:runbook-collection"
    parameters:
      query: "故障排查步骤"
      top_k: 3
      score_threshold: 0.7
```

---

## 向量存储

### Milvus

推荐的生产级向量数据库。

```yaml
# 配置
vector_store:
  backend: milvus
  host: localhost
  port: 19530
  
  # 索引配置
  index_type: IVF_FLAT    # IVF_FLAT | IVF_SQ8 | HNSW
  metric_type: COSINE     # L2 | IP | COSINE
  nlist: 1024             # IVF 聚类数
```

### Qdrant

轻量级向量数据库，适合开发和小规模部署。

```yaml
# 配置
vector_store:
  backend: qdrant
  host: localhost
  port: 6333
  
  # 索引配置
  index_type: HNSW
  metric_type: COSINE
```

### 选择建议

| 场景 | 推荐 | 说明 |
|------|------|------|
| 开发测试 | Qdrant | 轻量、易部署 |
| 小规模生产 | Qdrant | < 100万向量 |
| 大规模生产 | Milvus | 分布式、高性能 |

---

## 监控与优化

### 性能指标

```prometheus
# 检索延迟
resolveagent_rag_retrieval_latency_seconds{collection="product-docs"}

# 检索数量
resolveagent_rag_queries_total{collection="product-docs"}

# 嵌入延迟
resolveagent_rag_embedding_latency_seconds{model="bge-large-zh"}

# 摄取速率
resolveagent_rag_ingest_documents_total{collection="product-docs"}
```

### 优化建议

#### 1. 分块优化

```yaml
# 根据内容类型调整
chunking:
  # 技术文档：较大分块保持完整性
  strategy: semantic
  chunk_size: 1024
  
  # FAQ：较小分块精确匹配
  strategy: sentence
  chunk_size: 256
```

#### 2. 检索优化

```python
# 使用过滤减少搜索范围
results = await pipeline.query(
    collection_id="product-docs",
    query="API 认证",
    filter={"category": "api-reference"},  # 元数据过滤
    top_k=5
)

# 使用重排序提高精度
results = await pipeline.query(
    collection_id="product-docs",
    query="复杂问题",
    top_k=20,       # 初始多取一些
    rerank=True,
    final_top_k=5   # 重排后精选
)
```

#### 3. 索引优化

```yaml
# 大规模数据：使用 IVF 索引
vector_store:
  backend: milvus
  index_type: IVF_SQ8  # 压缩存储
  nlist: 4096          # 增加聚类数
  nprobe: 128          # 搜索时探测数
```

---

## API 参考

### gRPC API

```protobuf
service RAGService {
  rpc CreateCollection(CreateCollectionRequest) returns (Collection);
  rpc GetCollection(GetCollectionRequest) returns (Collection);
  rpc ListCollections(ListCollectionsRequest) returns (ListCollectionsResponse);
  rpc DeleteCollection(DeleteCollectionRequest) returns (DeleteCollectionResponse);
  rpc IngestDocuments(IngestDocumentsRequest) returns (IngestDocumentsResponse);
  rpc QueryCollection(QueryCollectionRequest) returns (QueryCollectionResponse);
}
```

### Python SDK

```python
from resolveagent.rag import RAGPipeline

# 创建管道
pipeline = RAGPipeline(
    embedding_model="bge-large-zh",
    vector_backend="milvus"
)

# 摄取
await pipeline.ingest(collection_id, documents)

# 查询
results = await pipeline.query(
    collection_id="product-docs",
    query="问题描述",
    top_k=5
)
```

---

## 最佳实践

### 1. 数据准备

- **清理数据**：移除无关内容、格式错误
- **标准化**：统一编码、格式
- **添加元数据**：分类、来源、时间等

### 2. 分块策略

- **技术文档**：语义分块，保持完整性
- **FAQ**：句子分块，精确匹配
- **日志/代码**：固定分块，保持一致

### 3. 检索优化

- **元数据过滤**：缩小搜索范围
- **重排序**：复杂查询使用
- **混合检索**：关键词敏感场景

### 4. 持续迭代

- **监控检索质量**：收集用户反馈
- **优化分块**：根据实际效果调整
- **更新知识**：定期同步最新文档

---

## 相关文档

- [智能选择器](./intelligent-selector.md) - RAG 路由机制
- [FTA 工作流引擎](./fta-engine.md) - 在工作流中使用 RAG
- [CLI 参考](./cli-reference.md) - RAG 管理命令
- [配置参考](./configuration.md) - RAG 相关配置
