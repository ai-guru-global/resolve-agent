---
kind: external_dependency
name: Milvus 向量数据库（RAG 后端）
slug: milvus
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
- RAG Pipeline 的向量检索后端，用于长期记忆（Long-term Memory）和知识库的语义搜索。

### 集成方式
- 官方推荐外部 etcd 模式（嵌入式 etcd 在 Apple Silicon/Docker Desktop 上会 SIGSEGV panic），需额外部署 etcd 容器并设置 `ETCD_USE_EMBED=false`。
- collection 名必须以字母或下划线开头（数字开头的 UUID 需 sanitize）。