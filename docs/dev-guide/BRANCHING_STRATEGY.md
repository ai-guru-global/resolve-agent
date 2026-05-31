# ResolveAgent 分支策略

> 适用版本：v0.3.0+  
> 最后更新：2026-05-31

---

## 分支模型

本项目采用 **GitHub Flow + 版本分支** 的混合策略：

```
main ──●──●──●──●──●──●──●──●──→  持续集成，始终可部署
        │  │  │     │     │
        ▼  ▼  ▼     ▼     ▼
      feat/*  fix/*  release/v0.x  hotfix/*
```

### 核心分支

| 分支 | 说明 | 保护规则 |
|------|------|----------|
| `main` | 唯一长期分支，始终可部署 | ✅ 强制 PR Review ✅ 强制 CI 通过 ✅ 禁止强制推送 |
| `release/v*.*` | 版本发布分支（可选） | ✅ 同 main |

### 临时分支

| 前缀 | 用途 | 来源 | 合并目标 |
|------|------|------|----------|
| `feat/` | 新功能 | `main` | `main` |
| `fix/` | Bug 修复 | `main` | `main` |
| `docs/` | 文档更新 | `main` | `main` |
| `chore/` | 工具/依赖更新 | `main` | `main` |
| `hotfix/` | 紧急生产修复 | `main` | `main` + `release/*` |

---

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(selector): add semantic routing` |
| `fix` | Bug 修复 | `fix(memory): redis connection leak` |
| `docs` | 文档变更 | `docs(api): update gRPC proto docs` |
| `style` | 代码格式（不影响功能） | `style(go): gofmt all files` |
| `refactor` | 重构（不增不减功能） | `refactor(tui): extract components` |
| `perf` | 性能优化 | `perf(rag): batch vector inserts` |
| `test` | 测试相关 | `test(e2e): add agent lifecycle test` |
| `chore` | 构建/工具/依赖 | `chore(deps): bump golang to 1.25` |
| `ci` | CI/CD 配置 | `ci(mobile): add mobile build stage` |

### 范围（scope）

按子系统划分：`selector`, `memory`, `planner`, `toolhub`, `rag`, `fta`, `cli`, `tui`, `web`, `mobile`, `docs`, `deps`

---

## 合并策略

### Pull Request 流程

1. **创建分支**：从最新 `main` 切出 `feat/your-feature`
2. **开发提交**：遵循 Conventional Commits，保持提交历史清晰
3. **推送到远程**：`git push -u origin feat/your-feature`
4. **创建 PR**：填写 PR 模板，关联 Issue
5. **CI 检查**：确保所有 CI 检查通过
6. **Code Review**：至少 1 个 approving review
7. **合并**：使用 **Squash and Merge**，确保 `main` 历史线性

### 合并按钮设置

- ✅ **Squash and merge**（推荐）
- ❌ Create a merge commit（避免历史分叉）
- ❌ Rebase and merge（避免重写他人提交）

---

## 版本发布

### 版本号规则（SemVer）

```
vMAJOR.MINOR.PATCH
```

| 级别 | 触发条件 | 示例 |
|------|----------|------|
| MAJOR | 破坏性 API 变更 | `v0.3.0` → `v1.0.0` |
| MINOR | 向后兼容的新功能 | `v0.3.0` → `v0.4.0` |
| PATCH | Bug 修复、安全补丁 | `v0.3.0` → `v0.3.1` |

### 发布流程

1. 从 `main` 创建 `release/vX.Y.Z` 分支（如需要打补丁）
2. 更新 `VERSION` 文件和 `CHANGELOG.md`
3. 创建 Git Tag：`git tag -a vX.Y.Z -m "Release vX.Y.Z"`
4. 推送 Tag：`git push origin vX.Y.Z`
5. GitHub Actions 自动构建并发布 Docker 镜像
6. 合并发布分支回 `main`

---

## 依赖更新策略

### Dependabot

- **Docker**：自动合并非主版本镜像更新
- **GitHub Actions**：自动合并补丁版本更新
- **Go Modules**：人工审查后合并 major/minor 更新
- **Node.js**：人工审查后合并 major 更新
- **Python**：人工审查后合并 major 更新

### 手动依赖更新

```bash
# Go
go get -u ./...
go mod tidy

# Python
cd python && uv pip compile pyproject.toml -o requirements.txt

# Web
cd web && pnpm update --interactive
```

---

## 回滚策略

紧急情况下可直接回滚到上一个稳定版本：

```bash
# 查看发布历史
git log --oneline --tags

# 回滚到上一个版本
git revert HEAD
# 或
 git reset --hard vX.Y.Z-1
```

---

## 参考

- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
