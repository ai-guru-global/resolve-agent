# ResolveAgent 生产化推进设计（Production Hardening Design）

- 日期：2026-09-09
- 状态：已获用户认可（方案 A，全量分阶段）
- 来源：2026-09-09 整体评估（Go 平台 / Python 运行时 / Web 前端 / 工程化四路并行评估）
- 实施方式：每阶段完成并验证后进入下一阶段；每项工作独立 commit；直接在 main 推进
- 计划拆分：实施计划按阶段拆分产出——writing-plans 先覆盖 P0+P1，P2/P3/P4 在前一阶段验收通过后再各自出计划

## 1. 背景与问题清单

整体评估结论：工程纪律优秀的"演示级+"项目（Alpha~Beta），距生产级的主要欠账：

| # | 问题 | 证据 |
|---|------|------|
| 1 | README 声称的蒙特卡洛仿真不存在 | 全 `python/src` 无 monte/random 仿真代码；`fta/engine.py` 仅一次性布尔求值 |
| 2 | FTA 门类型 5 种非 6 种，INHIBIT/PRIORITY_AND 退化为 `all()` | `fta/tree.py:20-27`（枚举 5 值）、`tree.py:73-78` |
| 3 | AdaptiveWeightAdjuster 为孤儿类，全仓库零调用 | `selector/resilient_selector.py:697`，docstring 自认"designed to be plugged in" |
| 4 | proto 空转：7 个 .proto 无生成产物，Go 侧零业务引用 | `api/proto/`、`pkg/server/server.go:99-106` |
| 5 | OpenAPI 仅 7 条路径 vs 实际 95 条路由 | `api/openapi/v1/resolveagent.yaml` vs `pkg/server/router.go` |
| 6 | postgres 模式下 solutionRegistry 仍为内存实现 | `pkg/server/server.go:77-78` |
| 7 | 覆盖率门禁空转（baseline 全 0 无人消费，Python/Web 检查 warn 不阻断） | `hack/quality-gate.sh:101,116-117`、`hack/coverage-report.sh:63-64` |
| 8 | 全仓库无安全扫描 | 无 CodeQL/Dependabot/Trivy/gitleaks |
| 9 | 双发布流水线镜像名冲突 | `release.yaml:16,49` vs `docker-publish.yaml:30` |
| 10 | e2e.yaml 调用已废弃的 `make migrate-up/seed`；server 启动仅 `sleep 5` | `e2e.yaml:55-63,71-74` |
| 11 | 文档三处散养（docs/ 82 篇、docs-site/ 9 篇、documentation/） | 仓库目录 |
| 12 | mobile/ 独立原型与 web 重复，零网络请求零共享 | `mobile/` 2,221 行 |
| 13 | 仓库卫生：.pids/*.pid 被跟踪、coverage.out（270KB 陈旧产物）遗留根目录 | `git ls-files` |
| 14 | 工作区 187 个未提交变更（文档归档重组进行中） | `git status` |

## 2. 目标与非目标

**目标**：把项目从"演示级+"推进到"生产级"：对外宣传与代码一致、CI 门禁真实生效、交付与安全闭环、仓库与文档治理收敛。

**非目标**：
- 不落 buf/protoc 生成链（proto 从宣传撤下，保留文件待真实需求）
- 不给 WebUI 新增业务功能，不动 mock 双轨制架构
- 不做移动端产品化（mobile/ 降级为示例）
- 不引入新数据层组件

## 3. 已确认决策

| 决策点 | 结论 |
|--------|------|
| 范围 | 全量分阶段推进（四阶段） |
| 基线 | 先收尾提交 187 个未提交变更，直接在 main 推进 |
| 顺序 | 方案 A：失实项补齐 → 交付安全 → 契约数据闭环 → 治理收尾 |
| 提交粒度 | 每项工作独立 commit（沿用仓库 Conventional Commits 中文风格） |
| proto | 从 README/宣传撤下，保留文件不落生成链 |
| mobile | 降级移入 examples/ |
| 门禁阈值 | 从实测基线起步、只升不降；目标值 Go 50% / Python 60% |

## 4. 阶段设计

### P0 基线收尾

把 187 个未提交变更按逻辑分组收尾提交（不 push）：

1. 文档归档重组（documentation/ → docs/archive/、删除旧报告等）→ 1 个 `docs:` commit
2. GTM 资源与页面变更 → 1 个 commit
3. 配置与杂项（Makefile、deploy、configs、.gitignore 等）→ 按内容 1-2 个 commit

**验收**：`git status` 干净（除本设计文档）。

### P1 失实项补齐（核心阶段）

#### 4.1 概率模型（fta/tree.py）
- `FTAEvent` 增加 `probability: float | None = None` 字段；静态布尔求值路径完全不受影响。
- 校验：probability ∈ [0,1]。

#### 4.2 蒙特卡洛仿真器（新模块 fta/monte_carlo.py）
- `MonteCarloSimulator.simulate(tree, runs=10_000, seed=None) -> MonteCarloResult`
- 每轮：对每个 BASIC 事件按 `probability` 做 Bernoulli 采样（`random.Random(seed)`，可复现）；按现有 `get_gates_bottom_up()` 拓扑序传播门值。
- **PRIORITY_AND 动态时序语义**：每轮给各基础事件生成随机失效序，门输出 = 所有输入失效 **且** 失效顺序与 `input_ids` 顺序一致。
- **INHIBIT 语义**：输入中含 CONDITIONING 事件，输出 = 全部输入为真（校验见 4.3）。
- 输出 `MonteCarloResult`：`failure_probability`（top 事件频率估计）、`confidence_interval`（Wilson）、`runs`、`seed`、`top_event_id`。
- 纯同步 CPU 实现，不依赖 LLM/网络。

#### 4.3 门语义强化（fta/tree.py）
- INHIBIT 门：校验 `input_ids` 中存在 CONDITIONING 类型事件，缺失时告警并按 AND 处理（不中断既有分析）。
- PRIORITY_AND 静态 `evaluate()` 保留 `all()` 并注释注明"静态近似，时序语义由仿真承担"。
- README 中"六种门类型"修正为与实现一致的真实描述。

#### 4.4 引擎集成（fta/engine.py）
- `execute()` 完成时：若基础事件带 probability，自动运行仿真，结果并入 `workflow.completed` 的 `data` 与持久化 payload（`basic_event_probabilities` 旁增加 `simulation` 字段）。
- 新增 `analyze(tree)`：组合 MOCUS 最小割集（现有 `cut_sets.py`）+ 蒙特卡洛仿真，返回 `FTAAnalysisResult`——README 示例代码随之成真。

#### 4.5 接线 AdaptiveWeightAdjuster（selector/resilient_selector.py）
- `ResilientSelector` 持有 `AdaptiveWeightAdjuster` 实例（可注入，默认自建）。
- 每次 `RouteAttempt` 返回后调用 `record_outcome(route_type, success)`；会话（route_and_execute）结束调用 `apply_decay()`。
- `_force_alternative_route`：候选路由按 `get_weight()` 降序**稳定排序**（同权重保持既有 `route_priority` 顺序）。错误分类偏好（prefer_reasoning / prefer_knowledge / prefer_analysis）命中时仍最优先，不命中时才按权重排序选择。
- 配置开关 `ResilientSelectorConfig.adaptive_weights_enabled: bool = True`；关闭时行为与现状完全一致。
- `get_session_stats()` 暴露当前权重与计数。

#### 4.6 README/docs 同步成真
- 十二大亮点表、FTA 深潜节、Feature Status 表：门类型数量与语义、蒙特卡洛、权重接线改为真实描述；`analyze()` 示例与实现对齐。

#### P1 验收标准
- TDD 先行：先写失败测试再实现。
- 新增测试覆盖：仿真 vs OR/AND 小树解析解一致（容差内）、种子确定性、PRIORITY_AND 时序用例、INHIBIT 校验、adjuster 成功升权/衰减/`adaptive_weights_enabled=False` 回归不变。
- 全量 `pytest` + `ruff` 绿；README 与代码一致（人工核对）。

### P2 交付与安全

1. **安全扫描进 CI**：gitleaks（secret 泄漏）、CodeQL（go + python）、Trivy（镜像扫描，挂在镜像构建后）。
2. **覆盖率门禁真生效**：实测当前 Go/Python 覆盖率填真 `coverage-baseline.json`；`quality-gate.sh` 中 Python/Web 从 `warn()` 改为阻断 `fail()`；门禁阈值取实测基线值、只升不降，目标 Go 50%/Python 60%（实测达标后立即抬到目标值）。
3. **发布流水线合并**：`docker-publish.yaml` 并入 `release.yaml`，统一镜像名为 `<owner>/resolveagent-*`。
4. **e2e 修复**：移除已废弃的 `make migrate-up/seed` 调用（改用 compose 内建迁移路径）；`sleep 5` 改为健康探针等待循环（复用 `/api/v1/health`）。
5. **webui.Dockerfile**：`pnpm install --frozen-lockfile` 严格化（去掉 `|| pnpm install` 掩盖）；nginx 改非 root 运行。

**验收**：CI 全绿且包含安全扫描 job；人为注入超低覆盖率/泄漏用例可验证门禁阻断。

### P3 契约与数据闭环

1. **solutionRegistry 落 Postgres**：补 postgres store 实现 + 迁移脚本，沿用既有 sentinel 错误模式（`pkg/errors`）与 store 抽象；内存实现保留为无 DB 时的默认。
2. **OpenAPI 补全**：以 `pkg/server/router.go` 95 条路由为源补全 `api/openapi/v1/resolveagent.yaml`；脚本枚举路由清单辅助人工核对描述。
3. **proto 撤下**：README 项目结构与相关描述中移除 gRPC 业务面宣传；`api/proto/` 保留。

**验收**：OpenAPI 路径数与 router 一致；postgres 模式下 solution 重启不丢数据（集成测试验证）；README 无 proto 失实宣传。

### P4 治理收尾

1. **文档归一**：`docs/` 为唯一内容源；`docs-site/` 只保留站点壳与导航（内容链接/引用 docs/）；`documentation/` 并入 `docs/archive/`。
2. **mobile 降级**：移入 `examples/mobile-demo/`，README 对应改述为示例。
3. **根目录卫生**：`.pids/*.pid` 移出版本控制（`.gitignore` 补充）；删除跟踪中的 `coverage.out` 类产物；`.DS_Store` 确保被忽略。

**验收**：文档单一来源可陈述清楚；`git ls-files` 无运行期产物；全量测试绿。

## 5. 测试策略

- 每阶段结束时跑 `make test`（Go + Python + WebUI）+ `make lint`。
- P1 全部 TDD；P2 门禁用"注入坏样本验证阻断"验证；P3 以集成测试验证 Postgres 持久化；P4 以 `git ls-files` 与文档链接检查验证。
- 每个 commit 独立可回滚；不使用 `--no-verify`。

## 6. 风险与缓解

| 风险 | 缓解 |
|------|------|
| P1 改动 FTA 语义影响既有用例 | 静态求值路径不动，只新增概率路径；INHIBIT 缺 conditioning 降级为告警不中断 |
| 覆盖率现状低于阈值导致门禁立即红 | 先实测基线填真值，阈值从实测值起步，只升不降 |
| 权重接线改变路由行为造成回归 | 默认开但带开关；`_force_alternative_route` 稳定排序保证同权重下行为不变；禁用开关回归测试 |
| 187 个未提交变更分组提交混浊 | 按 `git status` 逐块核对内容后再分组，可疑文件单独确认 |
