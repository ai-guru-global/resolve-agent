package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

func dsnFromEnv() string {
	if dsn := os.Getenv("RESOLVEAGENT_TEST_DSN"); dsn != "" {
		return dsn
	}
	return "postgres://resolveagent:resolveagent@localhost:5432/resolveagent_test?sslmode=disable"
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
}

func mustOpenStore(t *testing.T) *Store {
	t.Helper()
	store, err := New(dsnFromEnv(), testLogger())
	if err != nil {
		t.Skipf("PostgreSQL not available: %v", err)
	}

	if err := store.Migrate(context.Background()); err != nil {
		_ = store.Close()
		t.Fatalf("Failed to migrate: %v", err)
	}

	t.Cleanup(func() {
		_ = store.Close()
	})

	return store
}

func TestPostgresAgentRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewAgentRegistry(store)
	ctx := context.Background()

	agent := &registry.AgentDefinition{
		ID:          "agent-1",
		Name:        "Test Agent",
		Description: "A test agent",
		Type:        "resolver",
		Config:      map[string]any{"key": "value"},
		Status:      "active",
		Labels:      map[string]string{"env": "test"},
		Version:     1,
	}

	// Create
	if err := r.Create(ctx, agent); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Get
	got, err := r.Get(ctx, agent.ID)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Name != agent.Name {
		t.Errorf("Name mismatch: got %q, want %q", got.Name, agent.Name)
	}

	// List
	list, total, err := r.List(ctx, registry.ListOptions{Limit: 10})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total < 1 {
		t.Errorf("Expected at least 1 agent, got %d", total)
	}
	if len(list) < 1 {
		t.Errorf("Expected at least 1 agent in list, got %d", len(list))
	}

	// Update
	agent.Name = "Updated Agent"
	if uerr := r.Update(ctx, agent); uerr != nil {
		t.Fatalf("Update failed: %v", uerr)
	}
	got, _ = r.Get(ctx, agent.ID)
	if got.Name != "Updated Agent" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if derr := r.Delete(ctx, agent.ID); derr != nil {
		t.Fatalf("Delete failed: %v", derr)
	}
	_, err = r.Get(ctx, agent.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}

func TestPostgresSkillRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewSkillRegistry(store)
	ctx := context.Background()

	skill := &registry.SkillDefinition{
		Name:        "test-skill",
		Version:     "1.0.0",
		Description: "A test skill",
		Author:      "tester",
		SkillType:   "search",
		Manifest:    map[string]any{"key": "value"},
		SourceType:  "builtin",
		SourceURI:   "https://example.com",
		Status:      "active",
		Labels:      map[string]string{"env": "test"},
	}

	// Register
	if err := r.Register(ctx, skill); err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	// Get
	got, err := r.Get(ctx, skill.Name)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Name != skill.Name {
		t.Errorf("Name mismatch: got %q, want %q", got.Name, skill.Name)
	}

	// List
	list, total, err := r.List(ctx, registry.ListOptions{Limit: 10})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total < 1 {
		t.Errorf("Expected at least 1 skill, got %d", total)
	}
	if len(list) < 1 {
		t.Errorf("Expected at least 1 skill in list, got %d", len(list))
	}

	// ListByType
	byType, total2, err := r.ListByType(ctx, "builtin", registry.ListOptions{Limit: 10})
	if err != nil {
		t.Fatalf("ListByType failed: %v", err)
	}
	if total2 < 1 {
		t.Errorf("Expected at least 1 builtin skill, got %d", total2)
	}
	if len(byType) < 1 {
		t.Errorf("Expected at least 1 builtin skill in list, got %d", len(byType))
	}

	// Unregister
	if uerr := r.Unregister(ctx, skill.Name); uerr != nil {
		t.Fatalf("Unregister failed: %v", uerr)
	}
	_, err = r.Get(ctx, skill.Name)
	if err == nil {
		t.Error("Expected error after unregister, got nil")
	}
}

func TestPostgresWorkflowRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewWorkflowRegistry(store)
	ctx := context.Background()

	workflow := &registry.WorkflowDefinition{
		ID:          "wf-1",
		Name:        "Test Workflow",
		Description: "A test workflow",
		Tree:        map[string]any{"root": "node"},
		Status:      "draft",
		Version:     1,
	}

	// Create
	if err := r.Create(ctx, workflow); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Get
	got, err := r.Get(ctx, workflow.ID)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Name != workflow.Name {
		t.Errorf("Name mismatch: got %q, want %q", got.Name, workflow.Name)
	}

	// List
	list, total, err := r.List(ctx, registry.ListOptions{Limit: 10})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total < 1 {
		t.Errorf("Expected at least 1 workflow, got %d", total)
	}
	if len(list) < 1 {
		t.Errorf("Expected at least 1 workflow in list, got %d", len(list))
	}

	// Update
	workflow.Name = "Updated Workflow"
	if uerr := r.Update(ctx, workflow); uerr != nil {
		t.Fatalf("Update failed: %v", uerr)
	}
	got, _ = r.Get(ctx, workflow.ID)
	if got.Name != "Updated Workflow" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if derr := r.Delete(ctx, workflow.ID); derr != nil {
		t.Fatalf("Delete failed: %v", derr)
	}
	_, err = r.Get(ctx, workflow.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}

func TestPostgresRAGRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewRAGRegistry(store)
	ctx := context.Background()

	collection := &registry.RAGCollection{
		ID:          "rag-1",
		Name:        "Test Collection",
		Description: "A test collection",
		Config:      map[string]any{"model": "text-embedding"},
		Status:      "active",
		Labels:      map[string]string{"env": "test"},
	}

	// Create
	if err := r.Create(ctx, collection); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Get
	got, err := r.Get(ctx, collection.ID)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Name != collection.Name {
		t.Errorf("Name mismatch: got %q, want %q", got.Name, collection.Name)
	}

	// List
	list, total, err := r.List(ctx, registry.ListOptions{Limit: 10})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total < 1 {
		t.Errorf("Expected at least 1 collection, got %d", total)
	}
	if len(list) < 1 {
		t.Errorf("Expected at least 1 collection in list, got %d", len(list))
	}

	// Update
	collection.Name = "Updated Collection"
	if uerr := r.Update(ctx, collection); uerr != nil {
		t.Fatalf("Update failed: %v", uerr)
	}
	got, _ = r.Get(ctx, collection.ID)
	if got.Name != "Updated Collection" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if derr := r.Delete(ctx, collection.ID); derr != nil {
		t.Fatalf("Delete failed: %v", derr)
	}
	_, err = r.Get(ctx, collection.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}

// TestPostgresRegistryNotFoundSentinels verifies that not-found errors from
// the PostgreSQL-backed registries are structured *errors.Error values
// wrapping ErrNotFound, so the unified HTTP outlet maps them to 404.
func TestPostgresRegistryNotFoundSentinels(t *testing.T) {
	store := mustOpenStore(t)
	ctx := context.Background()

	tests := []struct {
		name  string
		probe func() error
	}{
		{
			name: "agent registry Get reports structured not found",
			probe: func() error {
				_, err := NewAgentRegistry(store).Get(ctx, "no-such-agent")
				return err
			},
		},
		{
			name: "skill registry Get reports structured not found",
			probe: func() error {
				_, err := NewSkillRegistry(store).Get(ctx, "no-such-skill")
				return err
			},
		},
		{
			name: "workflow registry Get reports structured not found",
			probe: func() error {
				_, err := NewWorkflowRegistry(store).Get(ctx, "no-such-workflow")
				return err
			},
		},
		{
			name: "RAG registry Get reports structured not found",
			probe: func() error {
				_, err := NewRAGRegistry(store).Get(ctx, "no-such-collection")
				return err
			},
		},
		{
			name: "RAG document registry GetDocumentByHash reports structured not found",
			probe: func() error {
				_, err := NewRAGDocumentRegistry(store).GetDocumentByHash(ctx, "no-such-collection", "no-such-hash")
				return err
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.probe()
			if err == nil {
				t.Fatal("Expected not-found error, got nil")
			}
			if !errors.Is(err, errors.ErrNotFound) {
				t.Errorf("errors.Is(err, ErrNotFound) = false, err = %v", err)
			}
			var e *errors.Error
			if !errors.As(err, &e) {
				t.Fatalf("errors.As(err, *errors.Error) = false, err = %v", err)
			}
			if e.Code != errors.CodeNotFound {
				t.Errorf("code = %q, want %q", e.Code, errors.CodeNotFound)
			}
		})
	}
}

func TestPostgresSolutionRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewSolutionRegistry(store)
	ctx := context.Background()

	// 本测试使用固定 ID（sol-*/exec-1），而测试库是有状态的：先清掉前次运行残留。
	_, _ = store.pool.Exec(ctx, "DELETE FROM solution_executions WHERE solution_id LIKE 'sol-%'")
	_, _ = store.pool.Exec(ctx, "DELETE FROM solutions WHERE id LIKE 'sol-%'")

	solution := &registry.TroubleshootingSolution{
		ID:                   "sol-1",
		Title:                "Pod CrashLoopBackOff 排查",
		ProblemSymptoms:      "Pod 反复重启，BackOff 事件",
		KeyInformation:       "kubectl describe pod",
		TroubleshootingSteps: "1. describe 2. logs",
		ResolutionSteps:      "修正镜像 tag",
		Domain:               "kubernetes",
		Component:            "pod",
		Severity:             "high",
		Tags:                 []string{"k8s", "crashloop"},
		SearchKeywords:       "crashloopbackoff restart",
		Status:               "active",
		SourceURI:            "https://k8s.io/docs",
		RelatedSkillNames:    []string{"k8s-log-analysis"},
		RelatedWorkflowIDs:   []string{"wf-1"},
		Metadata:             map[string]any{"origin": "test"},
		CreatedBy:            "tester",
	}

	// Create + 时间戳/版本由 store 兜底
	if err := r.Create(ctx, solution); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if solution.CreatedAt.IsZero() || solution.UpdatedAt.IsZero() {
		t.Fatal("Create should stamp CreatedAt/UpdatedAt")
	}
	if solution.Version != 1 {
		t.Fatalf("expected Version 1, got %d", solution.Version)
	}

	// 重复 Create 拒绝（比对 sentinel 常量——AlreadyExists() 构造函数每次返回新实例，
	// errors.Is 只能沿 err 链匹配包装的 sentinel，不能用构造结果当 target）
	if err := r.Create(ctx, solution); !errors.Is(err, errors.ErrAlreadyExists) {
		t.Fatalf("duplicate Create should return ErrAlreadyExists, got %v", err)
	}

	// Get 回读全字段
	got, err := r.Get(ctx, "sol-1")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Title != solution.Title || got.Domain != "kubernetes" || got.Severity != "high" {
		t.Fatalf("Get roundtrip mismatch: %+v", got)
	}
	if len(got.Tags) != 2 || got.Tags[0] != "k8s" {
		t.Fatalf("Tags roundtrip mismatch: %v", got.Tags)
	}
	if len(got.RelatedSkillNames) != 1 || got.RelatedSkillNames[0] != "k8s-log-analysis" {
		t.Fatalf("RelatedSkillNames roundtrip mismatch: %v", got.RelatedSkillNames)
	}
	if got.Metadata["origin"] != "test" {
		t.Fatalf("Metadata roundtrip mismatch: %v", got.Metadata)
	}

	// NotFound（比对 sentinel 常量，理由同上）
	if _, err := r.Get(ctx, "sol-missing"); !errors.Is(err, errors.ErrNotFound) {
		t.Fatalf("Get missing should return ErrNotFound, got %v", err)
	}

	// List + status 过滤 + 分页
	for i := 2; i <= 4; i++ {
		s := &registry.TroubleshootingSolution{
			ID:              fmt.Sprintf("sol-%d", i),
			Title:           fmt.Sprintf("Solution %d", i),
			ProblemSymptoms: "symptom",
			Severity:        "low",
			Status:          "draft",
		}
		if err := r.Create(ctx, s); err != nil {
			t.Fatalf("Create sol-%d failed: %v", i, err)
		}
	}
	items, total, err := r.List(ctx, registry.ListOptions{Limit: 2, Offset: 0})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 4 || len(items) != 2 {
		t.Fatalf("List want total=4 len=2, got total=%d len=%d", total, len(items))
	}
	draftOnly, total, err := r.List(ctx, registry.ListOptions{Filter: map[string]string{"status": "draft"}})
	if err != nil {
		t.Fatalf("List filter failed: %v", err)
	}
	if total != 3 || len(draftOnly) != 3 {
		t.Fatalf("List status=draft want 3, got total=%d len=%d", total, len(draftOnly))
	}

	// Search：keyword + domain 组合过滤，keyword 大写也要命中（大小写不敏感）
	found, total, err := r.Search(ctx, &registry.SolutionSearchOptions{
		Domain:  "kubernetes",
		Keyword: "CRASHLOOPBACKOFF",
	})
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}
	if total != 1 || len(found) != 1 || found[0].ID != "sol-1" {
		t.Fatalf("Search want sol-1 only, got total=%d items=%v", total, found)
	}

	// Update
	solution.Title = "Pod CrashLoopBackOff 排查（修订）"
	if err := r.Update(ctx, solution); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if got, _ := r.Get(ctx, "sol-1"); got.Title != solution.Title {
		t.Fatal("Update not persisted")
	}
	missing := &registry.TroubleshootingSolution{ID: "sol-none", Title: "x"}
	if err := r.Update(ctx, missing); !errors.Is(err, errors.ErrNotFound) {
		t.Fatalf("Update missing should ErrNotFound, got %v", err)
	}

	// RecordExecution + ListExecutions
	if err := r.RecordExecution(ctx, &registry.SolutionExecution{
		ID:         "exec-1",
		SolutionID: "sol-1",
		Status:     "completed",
		StartedAt:  time.Now(),
	}); err != nil {
		t.Fatalf("RecordExecution failed: %v", err)
	}
	execs, total, err := r.ListExecutions(ctx, "sol-1", registry.ListOptions{})
	if err != nil {
		t.Fatalf("ListExecutions failed: %v", err)
	}
	if total != 1 || len(execs) != 1 || execs[0].ID != "exec-1" {
		t.Fatalf("ListExecutions want exec-1, got total=%d items=%v", total, execs)
	}

	// Delete 级联清执行记录
	if err := r.Delete(ctx, "sol-1"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if _, total, _ := r.ListExecutions(ctx, "sol-1", registry.ListOptions{}); total != 0 {
		t.Fatal("Delete should cascade executions")
	}

	// BulkCreate：跳过已存在，返回新增数
	bulk := []*registry.TroubleshootingSolution{
		{ID: "sol-2", Title: "dup", ProblemSymptoms: "s"}, // 已存在
		{ID: "sol-5", Title: "new", ProblemSymptoms: "s"},
	}
	created, err := r.BulkCreate(ctx, bulk)
	if err != nil {
		t.Fatalf("BulkCreate failed: %v", err)
	}
	if created != 1 {
		t.Fatalf("BulkCreate want 1, got %d", created)
	}

	// 重启不丢数据：另开一个独立连接，数据仍然可读
	store2, err := New(dsnFromEnv(), testLogger())
	if err != nil {
		t.Fatalf("reopen store: %v", err)
	}
	defer func() { _ = store2.Close() }()
	if got, err := NewSolutionRegistry(store2).Get(ctx, "sol-5"); err != nil || got.Title != "new" {
		t.Fatalf("restart persistence broken: got=%+v err=%v", got, err)
	}
}
