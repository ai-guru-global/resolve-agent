---
kind: external_dependency
name: Qdrant 向量数据库（RAG 备选后端）
slug: qdrant
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
source_files:
    - python/pyproject.toml
    - README.md
---

### 身份与角色
- RAG Pipeline 的可选向量检索后端，作为 Milvus 的轻量替代方案（尤其适合本地开发/资源受限环境）。

### 集成方式
- 通过 `pyproject.toml` 的 `rag` 可选依赖引入，与 Milvus 二选一配置。
- README 明确标注 "Milvus/Qdrant" 双后端支持。

### 关键约束
- 选择 Qdrant 时需在运行时配置切换后端；两者均服务于 Long-term Memory 的向量召回。