# Troubleshooting | 本地启动疑难排查

> 以下均为本仓库实战验证过的问题与修复方案。

## 1. `status` / `stop` 输出为空且退出码 1

**根因**: `set -euo pipefail` 下 `lsof | head -1` 在端口空闲时（lsof 返回 1）导致命令替换赋值直接退出脚本。

**修复**: `scripts/start-local.sh` 的 `get_port_pid()` 已加 `|| true`。如遇旧版本，同步该修复即可。

## 2. Milvus 容器崩溃（SIGSEGV panic）

**根因**: Milvus standalone 的**嵌入式 etcd** 在 macOS Docker Desktop（Apple Silicon）上必然触发 `etcd.InitEtcdServer` nil pointer panic（[milvus-io/milvus#31925](https://github.com/milvus-io/milvus/issues/31925) 同类问题）。

**修复**: `deploy/docker-compose/docker-compose.deps.yaml` 已改用**外部 etcd 容器**（`quay.io/coreos/etcd:v3.5.16`），Milvus 配置 `ETCD_USE_EMBED=false` + `ETCD_ENDPOINTS=etcd:2379`（官方推荐的 standalone 部署方式）。

## 3. Docker Hub 镜像拉取超时（国内网络）

**现象**: `docker compose up` 报 `failed to resolve reference ... context deadline exceeded`。

**方案**: 使用加速镜像源拉取后重打官方 tag（零侵入）:

```bash
docker pull docker.1ms.run/library/postgres:16-alpine
docker tag docker.1ms.run/library/postgres:16-alpine postgres:16-alpine
# 大镜像（如 Milvus）如过慢可换 docker.m.daocloud.io 重拉（已下载层自动复用）
```

## 4. `pnpm dev` 崩溃（供应链策略校验超时）

**根因**: pnpm 11+ 在每次 run 前联网校验 lockfile 供应链策略（483 entries），网络慢时直接崩溃。

**修复**: `web/.npmrc` 已写入 `verify-deps-before-run=false`（项目级配置）。

## 5. `uv pip install` 卡死无输出

**方案**: 指定国内镜像源重装:

```bash
cd python
UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple uv pip install --python .venv/bin/python -e ".[rag]"
```

## 6. WebUI 端口冲突

**约定**: WebUI 固定运行在 **5174** 端口（`web/vite.config.ts` 与 `scripts/start-local.sh` 已统一），避免与 3000/5173 等其他项目冲突。如需修改，两处需同步变更。
