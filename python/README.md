# ResolveAgent Python Runtime

ResolveAgent 的 Agent Runtime：意图路由（Selector）、故障树推理（FTA）、RAG 管线、
技能执行（Skills/Sandbox）、工具中枢（ToolHub）与语料生成（Corpus）。

## 环境要求

- Python 3.12（注意：3.14 会因 site.py 跳过 `_` 前缀 .pth 导致 uv 可编辑安装失效，`import resolveagent` 报 ModuleNotFoundError）
- [uv](https://docs.astral.sh/uv/)

## 快速开始

```bash
uv sync                      # 安装依赖（含可编辑安装 resolveagent）
uv run pytest tests/ -v      # 单元 + 集成测试
uv run ruff check src/ tests/  # lint
uv run python -m resolveagent.runtime  # 启动 runtime HTTP 服务（默认 :9091）
```

## 目录结构

- `src/resolveagent/` 第一方源码（selector / fta / rag / skills / toolhub / runtime / corpus / code_analysis 等）
- `tests/` 单元（unit/）与集成（integration/）测试
- `skills/` 运行时技能包
