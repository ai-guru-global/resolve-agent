package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

// TestAgentLifecycle tests the complete agent lifecycle: create -> execute -> delete
func TestAgentLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	baseURL := "http://localhost:8080/api/v1"
	client := &http.Client{Timeout: 30 * time.Second}

	// Step 1: Create an agent
	agentData := map[string]interface{}{
		"name":        "test-agent",
		"description": "Test agent for E2E",
		"type":        "mega",
		"config": map[string]interface{}{
			"model_id":       "qwen-plus",
			"system_prompt":  "You are a helpful assistant.",
			"skill_names":    []string{"web_search", "code_exec"},
			"selector_strategy": "hybrid",
		},
	}

	var agentID string
	t.Run("CreateAgent", func(t *testing.T) {
		body, _ := json.Marshal(agentData)
		resp, err := client.Post(baseURL+"/agents", "application/json", bytes.NewReader(body))
		if err != nil {
			t.Fatalf("Failed to create agent: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Expected 201, got %d: %s", resp.StatusCode, string(body))
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		agentID = result["id"].(string)
		if agentID == "" {
			t.Fatal("Agent ID is empty")
		}

		t.Logf("Created agent with ID: %s", agentID)
	})

	if agentID == "" {
		t.Fatal("Cannot continue without agent ID")
	}

	// Step 2: Get the agent
	t.Run("GetAgent", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/agents/%s", baseURL, agentID))
		if err != nil {
			t.Fatalf("Failed to get agent: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if result["id"] != agentID {
			t.Fatalf("Agent ID mismatch: expected %s, got %s", agentID, result["id"])
		}

		t.Logf("Retrieved agent: %s", result["name"])
	})

	// Step 3: List agents
	t.Run("ListAgents", func(t *testing.T) {
		resp, err := client.Get(baseURL + "/agents")
		if err != nil {
			t.Fatalf("Failed to list agents: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		agents := result["agents"].([]interface{})
		found := false
		for _, a := range agents {
			agent := a.(map[string]interface{})
			if agent["id"] == agentID {
				found = true
				break
			}
		}

		if !found {
			t.Fatal("Created agent not found in list")
		}

		t.Logf("Found agent in list of %d agents", len(agents))
	})

	// Step 4: Execute agent (with streaming)
	t.Run("ExecuteAgent", func(t *testing.T) {
		executeData := map[string]interface{}{
			"message": "Hello, this is a test message",
			"context": map[string]interface{}{
				"test": true,
			},
		}

		body, _ := json.Marshal(executeData)
		resp, err := client.Post(
			fmt.Sprintf("%s/agents/%s/execute", baseURL, agentID),
			"application/json",
			bytes.NewReader(body),
		)
		if err != nil {
			t.Fatalf("Failed to execute agent: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			respBody, _ := io.ReadAll(resp.Body)
			t.Fatalf("Expected 200, got %d: %s", resp.StatusCode, string(respBody))
		}

		// Read SSE stream
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("Failed to read response: %v", err)
		}

		// Check for expected events in stream
		bodyStr := string(respBody)
		if !strings.Contains(bodyStr, "data:") {
			t.Fatal("Expected SSE data in response")
		}

		t.Logf("Agent execution returned %d bytes", len(bodyStr))
	})

	// Step 5: Delete the agent
	t.Run("DeleteAgent", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/agents/%s", baseURL, agentID), nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to delete agent: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		t.Logf("Deleted agent: %s", agentID)
	})

	// Step 6: Verify deletion
	t.Run("VerifyDeletion", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/agents/%s", baseURL, agentID))
		if err != nil {
			t.Fatalf("Failed to get agent: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("Expected 404 after deletion, got %d", resp.StatusCode)
		}

		t.Log("Agent deletion verified")
	})
}
