# 部署指南

本文档详细说明 ResolveNet 在各种环境下的部署方案。

---

## 部署概览

ResolveNet 支持多种部署方式：

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
git clone https://github.com/ai-guru-global/resolve-net.git
cd resolve-net

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
POSTGRES_USER=resolvenet
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=resolvenet

# Redis 配置
REDIS_PASSWORD=your-redis-password

# NATS 配置
NATS_USER=resolvenet
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
# 添加 ResolveNet Helm 仓库
helm repo add resolvenet https://charts.resolvenet.io
helm repo update
```

#### 安装

```bash
# 创建命名空间
kubectl create namespace resolvenet

# 使用默认配置安装
helm install resolvenet resolvenet/resolvenet -n resolvenet

# 使用自定义配置安装
helm install resolvenet resolvenet/resolvenet \
  -n resolvenet \
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
    repository: resolve-net/platform
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
      - host: api.resolvenet.example.com
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: resolvenet-tls
        hosts:
          - api.resolvenet.example.com

# Agent 运行时配置
runtime:
  replicas: 3
  
  image:
    repository: resolve-net/runtime
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
    repository: resolve-net/webui
    tag: v0.1.0
  
  ingress:
    enabled: true
    hosts:
      - host: app.resolvenet.example.com

# PostgreSQL 配置
postgresql:
  enabled: true
  auth:
    username: resolvenet
    password: ""  # 使用 Secret
    database: resolvenet
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
helm status resolvenet -n resolvenet

# 查看 Pod 状态
kubectl get pods -n resolvenet

# 升级
helm upgrade resolvenet resolvenet/resolvenet \
  -n resolvenet \
  -f my-values.yaml

# 回滚
helm rollback resolvenet 1 -n resolvenet

# 卸载
helm uninstall resolvenet -n resolvenet
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
                app: resolvenet-runtime
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
      - secretName: resolvenet-platform-tls
        hosts:
          - api.resolvenet.example.com
```

### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: resolvenet-platform
  namespace: resolvenet
spec:
  podSelector:
    matchLabels:
      app: resolvenet-platform
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
              app: resolvenet-runtime
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
- `resolvenet_platform_requests_total` - 请求总数
- `resolvenet_platform_request_duration_seconds` - 请求延迟

**Agent 指标**：
- `resolvenet_agent_executions_total` - 执行总数
- `resolvenet_agent_execution_duration_seconds` - 执行时长

**选择器指标**：
- `resolvenet_selector_decisions_total` - 决策总数
- `resolvenet_selector_confidence_histogram` - 置信度分布

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
kubectl exec -n resolvenet postgresql-0 -- \
  pg_dump -U resolvenet resolvenet | gzip > backup.sql.gz

# 恢复备份
gunzip -c backup.sql.gz | kubectl exec -i -n resolvenet postgresql-0 -- \
  psql -U resolvenet resolvenet
```

### Milvus 备份

```bash
# 使用 Milvus Backup 工具
milvus-backup create -n resolvenet-backup

# 恢复
milvus-backup restore -n resolvenet-backup
```

### 定期备份 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resolvenet-backup
  namespace: resolvenet
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: resolvenet/backup:latest
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
helm install resolvenet-blue resolvenet/resolvenet \
  -n resolvenet \
  --set platform.tag=v0.2.0

# 切换流量
kubectl patch ingress resolvenet -n resolvenet \
  -p '{"spec":{"rules":[{"host":"api.resolvenet.example.com","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"resolvenet-blue-platform","port":{"number":8080}}}}]}}]}}'

# 确认无误后删除旧版本
helm uninstall resolvenet-green -n resolvenet
```

### 金丝雀发布

```yaml
# 使用 Istio 进行金丝雀发布
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: resolvenet-platform
spec:
  hosts:
    - api.resolvenet.example.com
  http:
    - route:
        - destination:
            host: resolvenet-platform-stable
          weight: 90
        - destination:
            host: resolvenet-platform-canary
          weight: 10
```

---

## 故障排查

### 常见问题

#### Pod 启动失败

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n resolvenet

# 查看日志
kubectl logs <pod-name> -n resolvenet --previous
```

#### 数据库连接问题

```bash
# 检查数据库连接
kubectl exec -it resolvenet-platform-xxx -n resolvenet -- \
  nc -zv postgresql 5432

# 检查密钥配置
kubectl get secret resolvenet-postgresql -n resolvenet -o yaml
```

#### 服务发现问题

```bash
# 检查服务
kubectl get svc -n resolvenet

# 检查端点
kubectl get endpoints -n resolvenet

# 测试服务连接
kubectl run curl --rm -it --image=curlimages/curl -- \
  curl http://resolvenet-platform:8080/health
```

### 日志收集

```bash
# 收集诊断信息
kubectl get all -n resolvenet > diagnosis/resources.txt
kubectl describe pods -n resolvenet > diagnosis/pods.txt
kubectl logs -l app=resolvenet-platform -n resolvenet > diagnosis/platform.log
kubectl logs -l app=resolvenet-runtime -n resolvenet > diagnosis/runtime.log
```

---

## 安全配置

### Secret 管理

使用 External Secrets 或 Sealed Secrets：

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: resolvenet-llm-keys
  namespace: resolvenet
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: resolvenet-llm-keys
  data:
    - secretKey: qwen-api-key
      remoteRef:
        key: resolvenet/llm
        property: qwen-api-key
```

### RBAC 配置

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: resolvenet-platform
  namespace: resolvenet
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
  name: resolvenet-restricted
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
