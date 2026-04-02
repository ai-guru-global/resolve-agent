package registry

import (
	"context"
	"testing"
)

func TestInMemoryAgentRegistry(t *testing.T) {
	ctx := context.Background()
	reg := NewInMemoryAgentRegistry()

	agent := &AgentDefinition{
		ID:     "test-agent",
		Name:   "Test Agent",
		Type:   "mega",
		Status: "active",
	}

	// Test Create
	t.Run("Create", func(t *testing.T) {
		err := reg.Create(ctx, agent)
		if err != nil {
			t.Errorf("Create() error = %v", err)
		}

		// Try to create duplicate
		err = reg.Create(ctx, agent)
		if err == nil {
			t.Error("Create() should error on duplicate")
		}
	})

	// Test Get
	t.Run("Get", func(t *testing.T) {
		got, err := reg.Get(ctx, agent.ID)
		if err != nil {
			t.Errorf("Get() error = %v", err)
		}
		if got.ID != agent.ID {
			t.Errorf("Get() = %v, want %v", got.ID, agent.ID)
		}

		// Get non-existent
		_, err = reg.Get(ctx, "non-existent")
		if err == nil {
			t.Error("Get() should error on non-existent agent")
		}
	})

	// Test List
	t.Run("List", func(t *testing.T) {
		agents, total, err := reg.List(ctx, ListOptions{})
		if err != nil {
			t.Errorf("List() error = %v", err)
		}
		if total != 1 {
			t.Errorf("List() total = %v, want 1", total)
		}
		if len(agents) != 1 {
			t.Errorf("List() len = %v, want 1", len(agents))
		}
	})

	// Test Update
	t.Run("Update", func(t *testing.T) {
		agent.Name = "Updated Name"
		err := reg.Update(ctx, agent)
		if err != nil {
			t.Errorf("Update() error = %v", err)
		}

		got, _ := reg.Get(ctx, agent.ID)
		if got.Name != "Updated Name" {
			t.Errorf("Update() name = %v, want Updated Name", got.Name)
		}

		// Update non-existent
		nonExistent := &AgentDefinition{ID: "non-existent"}
		err = reg.Update(ctx, nonExistent)
		if err == nil {
			t.Error("Update() should error on non-existent agent")
		}
	})

	// Test Delete
	t.Run("Delete", func(t *testing.T) {
		err := reg.Delete(ctx, agent.ID)
		if err != nil {
			t.Errorf("Delete() error = %v", err)
		}

		// Verify deleted
		_, err = reg.Get(ctx, agent.ID)
		if err == nil {
			t.Error("Get() should error after Delete")
		}
	})
}
