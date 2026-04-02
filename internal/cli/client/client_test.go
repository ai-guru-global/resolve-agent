package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/spf13/viper"
)

func TestNew(t *testing.T) {
	// Set up test config
	viper.Set("server", "localhost:8080")

	c := New()
	if c == nil {
		t.Error("New() returned nil")
	}

	// Test with empty server
	viper.Set("server", "")
	c = New()
	if c == nil {
		t.Error("New() with empty server returned nil")
	}
}

func TestClient_ListAgents(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			t.Errorf("Expected GET request, got %s", r.Method)
		}
		if r.URL.Path != "/api/v1/agents" {
			t.Errorf("Expected path /api/v1/agents, got %s", r.URL.Path)
		}

		response := ListAgentsResponse{
			Agents: []*Agent{
				{ID: "agent-1", Name: "Test Agent", Type: "mega", Status: "active"},
			},
			Total: 1,
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create client pointing to test server
	c := &Client{
		baseURL:    server.URL + "/api/v1",
		httpClient: &http.Client{},
	}

	ctx := context.Background()
	resp, err := c.ListAgents(ctx)
	if err != nil {
		t.Errorf("ListAgents() error = %v", err)
	}

	if resp.Total != 1 {
		t.Errorf("ListAgents() total = %v, want 1", resp.Total)
	}
	if len(resp.Agents) != 1 {
		t.Errorf("ListAgents() agents count = %v, want 1", len(resp.Agents))
	}
}

func TestClient_CreateAgent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Expected POST request, got %s", r.Method)
		}

		var agent Agent
		if err := json.NewDecoder(r.Body).Decode(&agent); err != nil {
			t.Errorf("Failed to decode request body: %v", err)
		}

		agent.Status = "active"
		json.NewEncoder(w).Encode(agent)
	}))
	defer server.Close()

	c := &Client{
		baseURL:    server.URL + "/api/v1",
		httpClient: &http.Client{},
	}

	ctx := context.Background()
	agent := &Agent{
		ID:   "agent-1",
		Name: "Test Agent",
		Type: "mega",
	}

	created, err := c.CreateAgent(ctx, agent)
	if err != nil {
		t.Errorf("CreateAgent() error = %v", err)
	}

	if created.ID != agent.ID {
		t.Errorf("CreateAgent() ID = %v, want %v", created.ID, agent.ID)
	}
}

func TestClient_GetAgent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/agents/agent-1" {
			t.Errorf("Expected path /api/v1/agents/agent-1, got %s", r.URL.Path)
		}

		agent := Agent{ID: "agent-1", Name: "Test Agent", Type: "mega", Status: "active"}
		json.NewEncoder(w).Encode(agent)
	}))
	defer server.Close()

	c := &Client{
		baseURL:    server.URL + "/api/v1",
		httpClient: &http.Client{},
	}

	ctx := context.Background()
	agent, err := c.GetAgent(ctx, "agent-1")
	if err != nil {
		t.Errorf("GetAgent() error = %v", err)
	}

	if agent.ID != "agent-1" {
		t.Errorf("GetAgent() ID = %v, want agent-1", agent.ID)
	}
}

func TestClient_DeleteAgent(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "DELETE" {
			t.Errorf("Expected DELETE request, got %s", r.Method)
		}
		if r.URL.Path != "/api/v1/agents/agent-1" {
			t.Errorf("Expected path /api/v1/agents/agent-1, got %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	c := &Client{
		baseURL:    server.URL + "/api/v1",
		httpClient: &http.Client{},
	}

	ctx := context.Background()
	err := c.DeleteAgent(ctx, "agent-1")
	if err != nil {
		t.Errorf("DeleteAgent() error = %v", err)
	}
}

func TestClient_ErrorResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error": "agent not found"}`))
	}))
	defer server.Close()

	c := &Client{
		baseURL:    server.URL + "/api/v1",
		httpClient: &http.Client{},
	}

	ctx := context.Background()
	_, err := c.GetAgent(ctx, "non-existent")
	if err == nil {
		t.Error("GetAgent() should return error for 404 response")
	}
}
