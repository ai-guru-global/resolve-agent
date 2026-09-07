package postgres

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
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
