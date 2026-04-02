package registry

import (
	"context"
	"testing"
)

func TestInMemoryRAGRegistry(t *testing.T) {
	ctx := context.Background()
	reg := NewInMemoryRAGRegistry()

	collection := &RAGCollection{
		ID:          "test-collection",
		Name:        "Test Collection",
		Description: "Test description",
		Status:      "active",
		Config: map[string]any{
			"embedding_model": "bge-large-zh",
			"chunk_strategy":  "sentence",
		},
	}

	// Test Create
	t.Run("Create", func(t *testing.T) {
		err := reg.Create(ctx, collection)
		if err != nil {
			t.Errorf("Create() error = %v", err)
		}

		// Try to create duplicate
		err = reg.Create(ctx, collection)
		if err == nil {
			t.Error("Create() should error on duplicate")
		}
	})

	// Test Get
	t.Run("Get", func(t *testing.T) {
		got, err := reg.Get(ctx, collection.ID)
		if err != nil {
			t.Errorf("Get() error = %v", err)
		}
		if got.ID != collection.ID {
			t.Errorf("Get() = %v, want %v", got.ID, collection.ID)
		}

		// Get non-existent
		_, err = reg.Get(ctx, "non-existent")
		if err == nil {
			t.Error("Get() should error on non-existent collection")
		}
	})

	// Test List
	t.Run("List", func(t *testing.T) {
		collections, total, err := reg.List(ctx, ListOptions{})
		if err != nil {
			t.Errorf("List() error = %v", err)
		}
		if total != 1 {
			t.Errorf("List() total = %v, want 1", total)
		}
		if len(collections) != 1 {
			t.Errorf("List() len = %v, want 1", len(collections))
		}
	})

	// Test List with pagination
	t.Run("List with pagination", func(t *testing.T) {
		// Create more collections
		for i := 0; i < 5; i++ {
			c := &RAGCollection{
				ID:   "collection-" + string(rune('0'+i)),
				Name: "Collection " + string(rune('0'+i)),
			}
			reg.Create(ctx, c)
		}

		// Test with limit
		cols, total, err := reg.List(ctx, ListOptions{Limit: 3})
		if err != nil {
			t.Errorf("List() error = %v", err)
		}
		if len(cols) != 3 {
			t.Errorf("List() with limit returned %v items, want 3", len(cols))
		}
		if total < 3 {
			t.Errorf("List() total = %v, expected >= 3", total)
		}
	})

	// Test Update
	t.Run("Update", func(t *testing.T) {
		collection.Name = "Updated Collection Name"
		err := reg.Update(ctx, collection)
		if err != nil {
			t.Errorf("Update() error = %v", err)
		}

		got, _ := reg.Get(ctx, collection.ID)
		if got.Name != "Updated Collection Name" {
			t.Errorf("Update() name = %v, want Updated Collection Name", got.Name)
		}

		// Update non-existent
		nonExistent := &RAGCollection{ID: "non-existent"}
		err = reg.Update(ctx, nonExistent)
		if err == nil {
			t.Error("Update() should error on non-existent collection")
		}
	})

	// Test Delete
	t.Run("Delete", func(t *testing.T) {
		err := reg.Delete(ctx, collection.ID)
		if err != nil {
			t.Errorf("Delete() error = %v", err)
		}

		// Verify deleted
		_, err = reg.Get(ctx, collection.ID)
		if err == nil {
			t.Error("Get() should error after Delete")
		}
	})
}
