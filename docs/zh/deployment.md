# 部署指南

本文档详细说明 ResolveAgent 在各种环境下的部署方案。

---

## 部署概览

ResolveAgent 支持多种部署方式：

| 部署方式 | 适用场景 | 复杂度 |
|----------|----------|--------|
| Docker Compose | 开发、测试 | 低 |
| Kubernetes (Helm) | 生产环境 | 中 |
| Kubernetes (Kustomize) | 定制化生产 | 中 |
| 手动部署 | 特殊环境 | 高 |

---

## Docker Compose 部署

适用于本地开发和测试环境。

### 前置条件

- Docker >= 20.10
- Docker Compose >= 2.0
- 至少 8GB 内存
- 20GB 可用磁盘空间

### 快速启动

```bash
# 克隆仓库
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 复制环境变量配置
cp deploy/docker-compose/.env.example deploy/docker-compose/.env

# 编辑配置
vim deploy/docker-compose/.env

# 启动所有服务
docker compose -f deploy/docker-compose/docker-compose.yaml up -d
```

### 环境变量配置

编辑 `.env` 文件：

```bash
# 数据库配置
POSTGRES_USER=resolveagent
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=resolveagent

# Redis 配置
REDIS_PASSWORD=your-redis-password

# NATS 配置
NATS_USER=resolveagent
NATS_PASSWORD=your-nats-password

# 大模型 API Key
QWEN_API_KEY=your-qwen-api-key
WENXIN_API_KEY=your-wenxin-api-key
ZHIPU_API_KEY=your-zhipu-api-key

# 服务端口
PLATFORM_HTTP_PORT=8080
PLATFORM_GRPC_PORT=9090
RUNTIME_GRPC_PORT=9091
WEBUI_PORT=3000
```

### 服务组件

Docker Compose 部署包含以下服务：

```yaml
services:
  # 基础设施
  postgres:        # PostgreSQL 数据库
  redis:           # Redis 缓存
  nats:            # NATS 消息队列
  milvus:          # Milvus 向量数据库（可选）
  
  # 核心服务
  platform:        # 平台服务 (Go)
  runtime:         # Agent 运行时 (Python)
  webui:           # Web 界面 (React)
```

### 管理命令

```bash
# 查看服务状态
docker compose -f deploy/docker-compose/docker-compose.yaml ps

# 查看日志
docker compose -f deploy/docker-compose/docker-compose.yaml logs -f platform

# 停止服务
docker compose -f deploy/docker-compose/docker-compose.yaml down

# 停止并清理数据
docker compose -f deploy/docker-compose/docker-compose.yaml down -v
```

### 开发模式

使用开发模式配置（支持热重载）：

```bash
# 启动开发环境
docker compose -f deploy/docker-compose/docker-compose.dev.yaml up -d

# 仅启动基础设施
docker compose -f deploy/docker-compose/docker-compose.deps.yaml up -d
```

---

## Kubernetes 部署

### 使用 Helm

推荐的 Kubernetes 部署方式。

#### 前置条件

- Kubernetes >= 1.25
- Helm >= 3.10
- kubectl 已配置
- 持久化存储 (StorageClass)
- Ingress Controller（可选）

#### 添加 Helm 仓库

```bash
# 添加 ResolveAgent Helm 仓库
helm repo add resolveagent https://charts.resolveagent.io
helm repo update
```

#### 安装

```bash
# 创建命名空间
kubectl create namespace resolveagent

# 使用默认配置安装
helm install resolveagent resolveagent/resolveagent -n resolveagent

# 使用自定义配置安装
helm install resolveagent resolveagent/resolveagent \
  -n resolveagent \
  -f my-values.yaml
```

#### values.yaml 配置

```yaml
# values.yaml
global:
  # 镜像仓库
  imageRegistry: ghcr.io/ai-guru-global
  # 镜像拉取密钥
  imagePullSecrets: []

# 平台服务配置
platform:
  replicas: 2
  
  image:
    repository: resolve-agent/platform
    tag: v0.1.0
    pullPolicy: IfNotPresent
  
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  
  service:
    type: ClusterIP
    httpPort: 8080
    grpcPort: 9090
  
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: api.resolveagent.example.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: resolveagent-tls
        hosts:
          - api.resolveagent.example.com

# Agent 运行时配置
runtime:
  replicas: 3
  
  image:
    repository: resolve-agent/runtime
    tag: v0.1.0
  
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  
  # GPU 支持（可选）
  gpu:
    enabled: false
    type: nvidia
    count: 1

# WebUI 配置
webui:
  enabled: true
  replicas: 1
  
  image:
    repository: resolve-agent/webui
    tag: v0.1.0
  
  ingress:
    enabled: true
    hosts:
      - host: app.resolveagent.example.com

# PostgreSQL 配置
postgresql:
  enabled: true
  auth:
    username: resolveagent
    password: ""  # 使用 Secret
    database: resolveagent
  primary:
    persistence:
      size: 20Gi

# Redis 配置
redis:
  enabled: true
  auth:
    password: ""  # 使用 Secret
  master:
    persistence:
      size: 5Gi

# NATS 配置
nats:
  enabled: true
  cluster:
    enabled: false

# Milvus 配置（可选）
milvus:
  enabled: false
  standalone:
    persistence:
      size: 50Gi

# 密钥配置
secrets:
  llmApiKeys:
    qwen: ""
    wenxin: ""
    zhipu: ""

# 监控配置
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
```

#### 管理命令

```bash
# 查看部署状态
helm status resolveagent -n resolveagent

# 查看 Pod 状态
kubectl get pods -n resolveagent

# 升级
helm upgrade resolveagent resolveagent/resolveagent \
  -n resolveagent \
  -f my-values.yaml

# 回滚
helm rollback resolveagent 1 -n resolveagent

# 卸载
helm uninstall resolveagent -n resolveagent
```

### 使用 Kustomize

适用于需要更多定制化的场景。

```bash
# 部署到开发环境
kubectl apply -k deploy/k8s/overlays/development

# 部署到生产环境
kubectl apply -k deploy/k8s/overlays/production
```

#### Kustomization 结构

```
deploy/k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── platform-deployment.yaml
│   ├── platform-service.yaml
│   ├── runtime-deployment.yaml
│   ├── runtime-service.yaml
│   └── configmap.yaml
└── overlays/
    ├── development/
    │   ├── kustomization.yaml
    │   └── patches/
    └── production/
        ├── kustomization.yaml
        ├── patches/
        └── secrets/
```

---

## 生产环境配置

### 高可用部署

```yaml
# 平台服务高可用
platform:
  replicas: 3
  
  podDisruptionBudget:
    minAvailable: 2
  
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule

# Agent 运行时高可用
runtime:
  replicas: 5
  
  podDisruptionBudget:
    minAvailable: 3
    
  # 亲和性配置
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: resolveagent-runtime
            topologyKey: kubernetes.io/hostname
```

### 资源配置建议

| 组件 | CPU (Request/Limit) | 内存 (Request/Limit) |
|------|---------------------|---------------------|
| Platform | 100m / 1000m | 256Mi / 1Gi |
| Runtime | 500m / 2000m | 1Gi / 4Gi |
| WebUI | 50m / 500m | 128Mi / 512Mi |
| PostgreSQL | 250m / 2000m | 512Mi / 4Gi |
| Redis | 100m / 1000m | 256Mi / 2Gi |

### TLS 配置

```yaml
# 使用 cert-manager 自动管理证书
platform:
  ingress:
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      - secretName: resolveagent-platform-tls
        hosts:
          - api.resolveagent.example.com
```

### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: resolveagent-platform
  namespace: resolveagent
spec:
  podSelector:
    matchLabels:
      app: resolveagent-platform
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: resolveagent-runtime
      ports:
        - protocol: TCP
          port: 9091
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
```

---

## 监控与可观测性

### Prometheus + Grafana

```yaml
monitoring:
  enabled: true
  
  # ServiceMonitor for Prometheus Operator
  serviceMonitor:
    enabled: true
    interval: 30s
    
  # Grafana Dashboards
  grafana:
    dashboards:
      enabled: true
```

### 关键指标

**系统指标**：
- `resolveagent_platform_requests_total` - 请求总数
- `resolveagent_platform_request_duration_seconds` - 请求延迟

**Agent 指标**：
- `resolveagent_agent_executions_total` - 执行总数
- `resolveagent_agent_execution_duration_seconds` - 执行时长

**选择器指标**：
- `resolveagent_selector_decisions_total` - 决策总数
- `resolveagent_selector_confidence_histogram` - 置信度分布

### 日志聚合

推荐使用 EFK/PLG 栈：

```yaml
# Fluent Bit 配置示例
logging:
  enabled: true
  driver: fluentbit
  config:
    outputs:
      - name: elasticsearch
        host: elasticsearch.logging
        port: 9200
```

### 链路追踪

```yaml
telemetry:
  tracing:
    enabled: true
    exporter: otlp
    endpoint: jaeger-collector.tracing:4317
    sampling_rate: 0.1  # 生产环境采样率
```

---

## 备份与恢复

### PostgreSQL 备份

```bash
# 创建备份
kubectl exec -n resolveagent postgresql-0 -- \
  pg_dump -U resolveagent resolveagent | gzip > backup.sql.gz

# 恢复备份
gunzip -c backup.sql.gz | kubectl exec -i -n resolveagent postgresql-0 -- \
  psql -U resolveagent resolveagent
```

### Milvus 备份

```bash
# 使用 Milvus Backup 工具
milvus-backup create -n resolveagent-backup

# 恢复
milvus-backup restore -n resolveagent-backup
```

### 定期备份 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resolveagent-backup
  namespace: resolveagent
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: resolveagent/backup:latest
              command: ["/backup.sh"]
          restartPolicy: OnFailure
```

---

## 升级策略

### 滚动升级

```yaml
platform:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### 蓝绿部署

```bash
# 部署新版本到蓝环境
helm install resolveagent-blue resolveagent/resolveagent \
  -n resolveagent \
  --set platform.tag=v0.2.0

# 切换流量
kubectl patch ingress resolveagent -n resolveagent \
  -p '{"spec":{"rules":[{"host":"api.resolveagent.example.com","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"resolveagent-blue-platform","port":{"number":8080}}}}]}}]}}'

# 确认无误后删除旧版本
helm uninstall resolveagent-green -n resolveagent
```

### 金丝雀发布

```yaml
# 使用 Istio 进行金丝雀发布
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: resolveagent-platform
spec:
  hosts:
    - api.resolveagent.example.com
  http:
    - route:
        - destination:
            host: resolveagent-platform-stable
          weight: 90
        - destination:
            host: resolveagent-platform-canary
          weight: 10
```

---

## 故障排查

### 常见问题

#### Pod 启动失败

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n resolveagent

# 查看日志
kubectl logs <pod-name> -n resolveagent --previous
```

#### 数据库连接问题

```bash
# 检查数据库连接
kubectl exec -it resolveagent-platform-xxx -n resolveagent -- \
  nc -zv postgresql 5432

# 检查密钥配置
kubectl get secret resolveagent-postgresql -n resolveagent -o yaml
```

#### 服务发现问题

```bash
# 检查服务
kubectl get svc -n resolveagent

# 检查端点
kubectl get endpoints -n resolveagent

# 测试服务连接
kubectl run curl --rm -it --image=curlimages/curl -- \
  curl http://resolveagent-platform:8080/health
```

### 日志收集

```bash
# 收集诊断信息
kubectl get all -n resolveagent > diagnosis/resources.txt
kubectl describe pods -n resolveagent > diagnosis/pods.txt
kubectl logs -l app=resolveagent-platform -n resolveagent > diagnosis/platform.log
kubectl logs -l app=resolveagent-runtime -n resolveagent > diagnosis/runtime.log
```

---

## 安全配置

### Secret 管理

使用 External Secrets 或 Sealed Secrets：

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: resolveagent-llm-keys
  namespace: resolveagent
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: resolveagent-llm-keys
  data:
    - secretKey: qwen-api-key
      remoteRef:
        key: resolveagent/llm
        property: qwen-api-key
```

### RBAC 配置

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: resolveagent-platform
  namespace: resolveagent
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
```

### Pod 安全策略

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: resolveagent-restricted
spec:
  privileged: false
  runAsUser:
    rule: MustRunAsNonRoot
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

---

## 相关文档

- [配置参考](./configuration.md) - 详细配置选项
- [架构设计](./architecture.md) - 系统架构
- [CLI 参考](./cli-reference.md) - 管理命令
- [最佳实践](./best-practices.md) - 部署建议
