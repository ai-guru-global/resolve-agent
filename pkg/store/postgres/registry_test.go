package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"log/slog"
)

func mustOpenStore(t *testing.T) *Store {
	t.Helper()
	dsn := os.Getenv("RESOLVEAGENT_TEST_DSN")
	if dsn == "" {
		dsn = "postgres://resolveagent:resolveagent@localhost:5432/resolveagent_test?sslmode=disable"
	}

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
	store, err := New(dsn, logger)
	if err != nil {
		t.Skipf("PostgreSQL not available: %v", err)
	}

	if err := store.Migrate(context.Background()); err != nil {
		store.Close()
		t.Fatalf("Failed to migrate: %v", err)
	}

	t.Cleanup(func() {
		store.Close()
	})

	return store
}

func TestPostgresAgentRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewPostgresAgentRegistry(store)
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
	if err := r.Update(ctx, agent); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	got, _ = r.Get(ctx, agent.ID)
	if got.Name != "Updated Agent" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if err := r.Delete(ctx, agent.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, err = r.Get(ctx, agent.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}

func TestPostgresSkillRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewPostgresSkillRegistry(store)
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
	if err := r.Unregister(ctx, skill.Name); err != nil {
		t.Fatalf("Unregister failed: %v", err)
	}
	_, err = r.Get(ctx, skill.Name)
	if err == nil {
		t.Error("Expected error after unregister, got nil")
	}
}

func TestPostgresWorkflowRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewPostgresWorkflowRegistry(store)
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
	if err := r.Update(ctx, workflow); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	got, _ = r.Get(ctx, workflow.ID)
	if got.Name != "Updated Workflow" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if err := r.Delete(ctx, workflow.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, err = r.Get(ctx, workflow.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}

func TestPostgresRAGRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewPostgresRAGRegistry(store)
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
	if err := r.Update(ctx, collection); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	got, _ = r.Get(ctx, collection.ID)
	if got.Name != "Updated Collection" {
		t.Errorf("Update failed: got %q", got.Name)
	}

	// Delete
	if err := r.Delete(ctx, collection.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, err = r.Get(ctx, collection.ID)
	if err == nil {
		t.Error("Expected error after delete, got nil")
	}
}
