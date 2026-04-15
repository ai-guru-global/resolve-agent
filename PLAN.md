# Plan: Import Kudig Topic-Skills into ResolveAgent

## Context

The web Skills page (`SkillList.tsx`) displays skills filtered by `skill_type` (general/scenario). The kudig-database `topic-skills/` contains 18 Kubernetes troubleshooting skills (markdown files with YAML frontmatter) that should be imported as **scenario-type** skills and appear in the "场景技能" tab.

**Architecture overview:**
- Go server uses `InMemorySkillRegistry` (skills lost on restart)
- `POST /api/v1/corpus/import` → Python runtime `/corpus/import` (SSE streaming)
- Existing CLI: `resolveagent corpus import <repo>` — already handles skills import
- Server skill handlers: `handleListSkills`, `handleRegisterSkill` in `router.go`
- Web: `useSkills()` → `GET /api/v1/skills` → in-memory registry

**Skills to import** (18 files, excluding `ENHANCEMENT-RECORD.md`, `README.md`, `skill-schema.md`):
- `01-node-notready.md` → SKILL-NODE-001
- `02-pod-crashloop-oomkilled.md` → SKILL-POD-001
- `03-pod-pending.md` → SKILL-POD-002
- `04-dns-resolution-failure.md` → SKILL-NET-001
- `05-service-connectivity.md` → SKILL-NET-002
- `06-certificate-expiry.md` → SKILL-SEC-001
- `07-pvc-storage-failure.md` → SKILL-STORE-001
- `08-deployment-rollout-failure.md` → SKILL-WORK-001
- `09-rbac-quota-failure.md` → SKILL-SEC-002
- `10-image-pull-failure.md` → SKILL-IMAGE-001
- `11-control-plane-failure.md` → SKILL-CP-001
- `12-autoscaling-failure.md` → SKILL-SCALE-001
- `13-ingress-gateway-failure.md` → SKILL-NET-003
- `14-configmap-secret-failure.md` → SKILL-CONFIG-001
- `15-monitoring-alerting-failure.md` → SKILL-MONITOR-001
- `16-logging-pipeline-failure.md` → SKILL-LOG-001
- `17-performance-bottleneck.md` → SKILL-PERF-001
- `18-security-incident-response.md` → SKILL-SEC-003

---

## Step 1: Add skill_type / domain / tags to SkillDefinition and postgres schema

**File: `pkg/registry/skill.go`**

The `SkillDefinition` struct already has `SkillType`, `Domain`, and `Tags`. Confirm these are mapped in the postgres store.

**File: `pkg/store/postgres/skill_store.go`**

Extend the INSERT/SELECT to include `skill_type` (VARCHAR), `domain` (VARCHAR), `tags` (TEXT[]). Also extend `ON CONFLICT` DO UPDATE.

**SQL migration** (add to store.go inline migration or as ALTER TABLE):
```sql
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_skills_skill_type ON skills(skill_type);
CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain);
```

---

## Step 2: Wire PostgresSkillRegistry into the Server

**File: `pkg/server/server.go`**

Change from `InMemorySkillRegistry` to `PostgresSkillRegistry`:
```go
// After postgres store is initialized (add store field and init code)
skillRegistry: postgres.NewPostgresSkillRegistry(store),
```

**Note:** This requires the server to initialize a postgres store. Check `config.Config` for DSN field. The server startup code needs to be extended to create the postgres store when configured.

---

## Step 3: Implement Kudig Skill Import Handler (Python Runtime)

**File: `python/src/resolveagent/rag/pipeline.py`** (or wherever `POST /corpus/import` is handled)

Extend the corpus import pipeline to handle `skills` import type:
1. Clone/fetch `https://github.com/kudig-io/kudig-database` (or use raw GitHub API)
2. For each `NN-*.md` file in `topic-skills/`:
   - Parse YAML frontmatter (skill_id, skill_name, category, severity_range, trigger_keywords, k8s_versions, etc.)
   - Parse markdown body (full content)
   - Map to skill manifest format: `{entry_point, inputs, outputs, skill_type: "scenario", scenario: {domain, tags, ...}}`
   - POST to Go server `POST /api/v1/skills` via the existing Go registry

**Kudig YAML → SkillDefinition mapping:**
```
skill_id → name (e.g., "node-notready")
skill_name → description (first 200 chars of content or skill_name field)
category → domain (node/pod/network/etc.)
trigger_keywords → tags
skill_id → source_uri ("https://github.com/kudig-io/kudig-database/...")
source_type → "kudig"
author → "kudig-io"
skill_type → "scenario" (all kudig topic-skills are scenario-type)
manifest → full YAML frontmatter + markdown body as JSON
```

---

## Step 4: Web UI — Display Kudig Skills with Icons

**File: `web/src/pages/Skills/SkillList.tsx`**

Extend `skillIcons` and `skillDisplayNames` maps for all 18 kudig skills. Since the backend skills now carry `skill_type=scenario` and `domain`, the UI should render them correctly in the "场景技能" tab without hardcoding.

Also add a badge/label showing "kudig" source for imported skills.

---

## Step 5: Verify End-to-End

1. Run `resolveagent corpus import https://github.com/kudig-io/kudig-database --type skills`
2. Check web Skills page → "场景技能" tab shows all 18 imported skills
3. Skills persist after server restart (if postgres is wired)

---

## Critical Files

| File | Change |
|------|--------|
| `pkg/registry/skill.go` | Confirm SkillDefinition fields |
| `pkg/store/postgres/skill_store.go` | Add skill_type/domain/tags to SQL |
| `pkg/store/postgres/store.go` | Inline migration for new columns |
| `pkg/server/server.go` | Wire PostgresSkillRegistry |
| `python/src/resolveagent/rag/pipeline.py` | Kudig skill import logic |
| `web/src/pages/Skills/SkillList.tsx` | Skill icons/names for kudig skills |
| `web/src/hooks/useSkills.ts` | No changes needed (already correct) |
