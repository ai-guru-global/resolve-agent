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

// TestWorkflowExecution tests the complete workflow lifecycle
func TestWorkflowExecution(t *testing.T) {
	skipIfNoServer(t)
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	baseURL := "http://localhost:8080/api/v1"
	client := &http.Client{Timeout: 30 * time.Second}

	// Step 1: Create a workflow
	workflowData := map[string]interface{}{
		"name":        "test-workflow",
		"description": "Test workflow for E2E",
		"type":        "dag",
		"definition": map[string]interface{}{
			"nodes": []map[string]interface{}{
				{"id": "start", "type": "start", "config": map[string]interface{}{}},
				{"id": "process", "type": "agent", "config": map[string]interface{}{"agent_id": "default"}},
				{"id": "end", "type": "end", "config": map[string]interface{}{}},
			},
			"edges": []map[string]interface{}{
				{"from": "start", "to": "process"},
				{"from": "process", "to": "end"},
			},
		},
	}

	var workflowID string
	t.Run("CreateWorkflow", func(t *testing.T) {
		body, _ := json.Marshal(workflowData)
		resp, err := client.Post(baseURL+"/workflows", "application/json", bytes.NewReader(body))
		if err != nil {
			t.Fatalf("Failed to create workflow: %v", err)
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

		workflowID = result["id"].(string)
		if workflowID == "" {
			t.Fatal("Workflow ID is empty")
		}

		t.Logf("Created workflow with ID: %s", workflowID)
	})

	if workflowID == "" {
		t.Fatal("Cannot continue without workflow ID")
	}

	// Step 2: Validate workflow
	t.Run("ValidateWorkflow", func(t *testing.T) {
		resp, err := client.Post(
			fmt.Sprintf("%s/workflows/%s/validate", baseURL, workflowID),
			"application/json",
			nil,
		)
		if err != nil {
			t.Fatalf("Failed to validate workflow: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if !result["valid"].(bool) {
			t.Fatalf("Workflow validation failed: %v", result["errors"])
		}

		t.Log("Workflow validation passed")
	})

	// Step 3: Execute workflow
	t.Run("ExecuteWorkflow", func(t *testing.T) {
		executeData := map[string]interface{}{
			"input": map[string]interface{}{
				"text": "Test workflow execution",
			},
			"context": map[string]interface{}{
				"test": true,
			},
		}

		body, _ := json.Marshal(executeData)
		resp, err := client.Post(
			fmt.Sprintf("%s/workflows/%s/execute", baseURL, workflowID),
			"application/json",
			bytes.NewReader(body),
		)
		if err != nil {
			t.Fatalf("Failed to execute workflow: %v", err)
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

		t.Logf("Workflow execution returned %d bytes", len(bodyStr))
	})

	// Step 4: Delete workflow
	t.Run("DeleteWorkflow", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/workflows/%s", baseURL, workflowID), nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to delete workflow: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		t.Logf("Deleted workflow: %s", workflowID)
	})
}

// TestRAGWorkflow tests RAG collection creation, document ingestion, and query
func TestRAGWorkflow(t *testing.T) {
	skipIfNoServer(t)
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	baseURL := "http://localhost:8080/api/v1"
	client := &http.Client{Timeout: 30 * time.Second}

	// Step 1: Create RAG collection
	collectionData := map[string]interface{}{
		"name":        "test-collection",
		"description": "Test collection for E2E",
		"config": map[string]interface{}{
			"embedding_model": "bge-large-zh",
			"vector_backend":  "milvus",
			"chunk_strategy":  "sentence",
		},
	}

	var collectionID string
	t.Run("CreateCollection", func(t *testing.T) {
		body, _ := json.Marshal(collectionData)
		resp, err := client.Post(baseURL+"/rag/collections", "application/json", bytes.NewReader(body))
		if err != nil {
			t.Fatalf("Failed to create collection: %v", err)
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

		collectionID = result["id"].(string)
		if collectionID == "" {
			t.Fatal("Collection ID is empty")
		}

		t.Logf("Created collection with ID: %s", collectionID)
	})

	if collectionID == "" {
		t.Fatal("Cannot continue without collection ID")
	}

	// Step 2: Ingest documents
	t.Run("IngestDocuments", func(t *testing.T) {
		ingestData := map[string]interface{}{
			"documents": []map[string]interface{}{
				{
					"content":  "ResolveAgent is an AIOps platform for intelligent operations.",
					"metadata": map[string]interface{}{"source": "test", "page": 1},
				},
				{
					"content":  "The platform supports agent-based automation and workflow orchestration.",
					"metadata": map[string]interface{}{"source": "test", "page": 2},
				},
			},
		}

		body, _ := json.Marshal(ingestData)
		resp, err := client.Post(
			fmt.Sprintf("%s/rag/collections/%s/ingest", baseURL, collectionID),
			"application/json",
			bytes.NewReader(body),
		)
		if err != nil {
			t.Fatalf("Failed to ingest documents: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusAccepted {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Expected 202, got %d: %s", resp.StatusCode, string(body))
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		t.Logf("Ingested %v documents", result["documents_added"])
	})

	// Step 3: Query collection
	t.Run("QueryCollection", func(t *testing.T) {
		queryData := map[string]interface{}{
			"query":   "What is ResolveAgent?",
			"top_k":   5,
			"filters": map[string]interface{}{},
		}

		body, _ := json.Marshal(queryData)
		resp, err := client.Post(
			fmt.Sprintf("%s/rag/collections/%s/query", baseURL, collectionID),
			"application/json",
			bytes.NewReader(body),
		)
		if err != nil {
			t.Fatalf("Failed to query collection: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("Expected 200, got %d: %s", resp.StatusCode, string(body))
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		results := result["results"].([]interface{})
		t.Logf("Query returned %d results", len(results))
	})

	// Step 4: Delete collection
	t.Run("DeleteCollection", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("%s/rag/collections/%s", baseURL, collectionID), nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to delete collection: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("Expected 200, got %d", resp.StatusCode)
		}

		t.Logf("Deleted collection: %s", collectionID)
	})
}
