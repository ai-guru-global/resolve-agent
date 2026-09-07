package registry

import (
	"context"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

// TestSkillErrorsAreSentinelWrapped verifies that registry not-found and
// already-exists errors are structured pkg/errors values that are both
// *errors.Error typed and chained to the ErrNotFound / ErrAlreadyExists
// sentinels, so callers can match them with errors.Is / errors.As.
func TestSkillErrorsAreSentinelWrapped(t *testing.T) {
	ctx := context.Background()

	t.Run("Get missing skill", func(t *testing.T) {
		reg := NewInMemorySkillRegistry()

		_, err := reg.Get(ctx, "missing-skill")
		if err == nil {
			t.Fatal("Get() on a missing skill should fail")
		}
		if !errors.Is(err, errors.ErrNotFound) {
			t.Errorf("Get() error should wrap errors.ErrNotFound, got %v", err)
		}
		var e *errors.Error
		if !errors.As(err, &e) {
			t.Fatalf("Get() error should be *errors.Error, got %T", err)
		}
		if e.Code != errors.CodeNotFound {
			t.Errorf("code = %s, want %s", e.Code, errors.CodeNotFound)
		}
	})

	// The skill registry overwrites on Register and returns nil when
	// unregistering an unknown name, so its only error path is Get. The
	// remaining not-found and already-exists paths are exercised through the
	// agent registry, which shares the same pkg/errors helpers.
	t.Run("Get and Update missing agent", func(t *testing.T) {
		reg := NewInMemoryAgentRegistry()

		if _, err := reg.Get(ctx, "missing-agent"); !errors.Is(err, errors.ErrNotFound) {
			t.Errorf("Get() error should wrap errors.ErrNotFound, got %v", err)
		}
		err := reg.Update(ctx, &AgentDefinition{ID: "missing-agent"})
		if !errors.Is(err, errors.ErrNotFound) {
			t.Errorf("Update() error should wrap errors.ErrNotFound, got %v", err)
		}
		var e *errors.Error
		if !errors.As(err, &e) || e.Code != errors.CodeNotFound {
			t.Errorf("Update() error should be *errors.Error with code %s, got %v", errors.CodeNotFound, err)
		}
	})

	t.Run("duplicate Create", func(t *testing.T) {
		reg := NewInMemoryAgentRegistry()
		agent := &AgentDefinition{ID: "dup-agent", Name: "Dup", Type: "mega", Status: "active"}

		if err := reg.Create(ctx, agent); err != nil {
			t.Fatalf("Create() error = %v", err)
		}
		err := reg.Create(ctx, agent)
		if !errors.Is(err, errors.ErrAlreadyExists) {
			t.Errorf("duplicate Create() error should wrap errors.ErrAlreadyExists, got %v", err)
		}
		var e *errors.Error
		if !errors.As(err, &e) {
			t.Fatalf("duplicate Create() error should be *errors.Error, got %T", err)
		}
		if e.Code != errors.CodeAlreadyExists {
			t.Errorf("code = %s, want %s", e.Code, errors.CodeAlreadyExists)
		}
	})
}
