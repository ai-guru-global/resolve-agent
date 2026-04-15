package server

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/config"
)

// RuntimeClient is an HTTP client for communicating with the Python runtime.
type RuntimeClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewRuntimeClient creates a new runtime client.
func NewRuntimeClient(cfg *config.Config) *RuntimeClient {
	// Default to localhost:9091 for Python runtime
	runtimeAddr := cfg.Server.RuntimeAddr
	if runtimeAddr == "" {
		runtimeAddr = "localhost:9091"
	}

	return &RuntimeClient{
		baseURL: fmt.Sprintf("http://%s/v1", runtimeAddr),
		httpClient: &http.Client{
			Timeout: 120 * time.Second, // Long timeout for streaming
		},
	}
}

// ExecuteAgentRequest is the request body for agent execution.
type ExecuteAgentRequest struct {
	Input          string                 `json:"input"`
	ConversationID string                 `json:"conversation_id,omitempty"`
	Context        map[string]interface{} `json:"context,omitempty"`
}

// ExecuteAgentResponse is a response chunk from agent execution.
type ExecuteAgentResponse struct {
	Type     string                 `json:"type"`
	Content  string                 `json:"content,omitempty"`
	Event    *ExecutionEvent        `json:"event,omitempty"`
	Error    *ExecutionError        `json:"error,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ExecutionEvent represents an execution event.
type ExecutionEvent struct {
	Type    string                 `json:"type"`
	Message string                 `json:"message"`
	Data    map[string]interface{} `json:"data"`
}

// ExecutionError represents an execution error.
type ExecutionError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ExecuteAgent executes an agent and streams results.
func (c *RuntimeClient) ExecuteAgent(
	ctx context.Context,
	agentID string,
	req *ExecuteAgentRequest,
) (<-chan *ExecuteAgentResponse, <-chan error) {
	resultCh := make(chan *ExecuteAgentResponse, 10)
	errCh := make(chan error, 1)

	go func() {
		defer close(resultCh)
		defer close(errCh)

		url := fmt.Sprintf("%s/agents/%s/execute", c.baseURL, agentID)
		body, err := json.Marshal(req)
		if err != nil {
			errCh <- fmt.Errorf("marshal request: %w", err)
			return
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			errCh <- fmt.Errorf("create request: %w", err)
			return
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Accept", "text/event-stream")

		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			errCh <- fmt.Errorf("do request: %w", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			errCh <- fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
			return
		}

		// Parse SSE stream
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !bytes.HasPrefix([]byte(line), []byte("data: ")) {
				continue
			}

			data := line[6:] // Remove "data: " prefix
			if data == "[DONE]" {
				return
			}

			var response ExecuteAgentResponse
			if err := json.Unmarshal([]byte(data), &response); err != nil {
				continue // Skip malformed lines
			}

			select {
			case resultCh <- &response:
			case <-ctx.Done():
				return
			}
		}

		if err := scanner.Err(); err != nil {
			errCh <- fmt.Errorf("scan response: %w", err)
		}
	}()

	return resultCh, errCh
}

// ExecuteWorkflowRequest is the request body for workflow execution.
type ExecuteWorkflowRequest struct {
	Input   map[string]interface{} `json:"input"`
	Context map[string]interface{} `json:"context,omitempty"`
}

// ExecuteWorkflow executes a workflow and streams results.
func (c *RuntimeClient) ExecuteWorkflow(
	ctx context.Context,
	workflowID string,
	req *ExecuteWorkflowRequest,
) (<-chan *ExecuteAgentResponse, <-chan error) {
	resultCh := make(chan *ExecuteAgentResponse, 10)
	errCh := make(chan error, 1)

	go func() {
		defer close(resultCh)
		defer close(errCh)

		url := fmt.Sprintf("%s/workflows/%s/execute", c.baseURL, workflowID)
		body, err := json.Marshal(req)
		if err != nil {
			errCh <- fmt.Errorf("marshal request: %w", err)
			return
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			errCh <- fmt.Errorf("create request: %w", err)
			return
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Accept", "text/event-stream")

		resp, err := c.httpClient.Do(httpReq)
		if err != nil {
			errCh <- fmt.Errorf("do request: %w", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			errCh <- fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
			return
		}

		// Parse SSE stream
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if !bytes.HasPrefix([]byte(line), []byte("data: ")) {
				continue
			}

			data := line[6:] // Remove "data: " prefix
			if data == "[DONE]" {
				return
			}

			var response ExecuteAgentResponse
			if err := json.Unmarshal([]byte(data), &response); err != nil {
				continue // Skip malformed lines
			}

			select {
			case resultCh <- &response:
			case <-ctx.Done():
				return
			}
		}

		if err := scanner.Err(); err != nil {
			errCh <- fmt.Errorf("scan response: %w", err)
		}
	}()

	return resultCh, errCh
}

// RAGQueryRequest is the request body for RAG query.
type RAGQueryRequest struct {
	CollectionID string                 `json:"collection_id"`
	Query        string                 `json:"query"`
	TopK         int                    `json:"top_k,omitempty"`
	Filters      map[string]interface{} `json:"filters,omitempty"`
}

// RAGQueryResponse is the response from RAG query.
type RAGQueryResponse struct {
	Results      []RAGResult `json:"results"`
	Query        string      `json:"query"`
	CollectionID string      `json:"collection_id"`
}

// RAGResult is a single RAG result.
type RAGResult struct {
	Content  string                 `json:"content"`
	Source   string                 `json:"source"`
	Score    float64                `json:"score"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// QueryRAG queries a RAG collection.
func (c *RuntimeClient) QueryRAG(
	ctx context.Context,
	req *RAGQueryRequest,
) (*RAGQueryResponse, error) {
	url := fmt.Sprintf("%s/rag/query", c.baseURL)
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
	}

	var result RAGQueryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// RAGIngestRequest is the request body for RAG ingest.
type RAGIngestRequest struct {
	CollectionID string                   `json:"collection_id"`
	Documents    []map[string]interface{} `json:"documents"`
}

// RAGIngestResponse is the response from RAG ingest.
type RAGIngestResponse struct {
	Success       bool   `json:"success"`
	IngestedCount int    `json:"ingested_count"`
	CollectionID  string `json:"collection_id"`
}

// IngestRAG ingests documents into a RAG collection.
func (c *RuntimeClient) IngestRAG(
	ctx context.Context,
	req *RAGIngestRequest,
) (*RAGIngestResponse, error) {
	url := fmt.Sprintf("%s/rag/ingest", c.baseURL)
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
	}

	var result RAGIngestResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// SkillExecuteRequest is the request body for skill execution.
type SkillExecuteRequest struct {
	Parameters map[string]interface{} `json:"parameters"`
	Context    map[string]interface{} `json:"context,omitempty"`
}

// SkillExecuteResponse is the response from skill execution.
type SkillExecuteResponse struct {
	Success bool        `json:"success"`
	Output  interface{} `json:"output,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// ExecuteSkill executes a skill.
func (c *RuntimeClient) ExecuteSkill(
	ctx context.Context,
	skillName string,
	req *SkillExecuteRequest,
) (*SkillExecuteResponse, error) {
	url := fmt.Sprintf("%s/skills/%s/execute", c.baseURL, skillName)
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
	}

	var result SkillExecuteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// CorpusImportRequest is the request body for corpus import.
type CorpusImportRequest struct {
	Source          string   `json:"source"`
	ImportTypes     []string `json:"import_types,omitempty"`
	RAGCollectionID string   `json:"rag_collection_id,omitempty"`
	Profile         string   `json:"profile,omitempty"`
	ForceClone      bool     `json:"force_clone,omitempty"`
	DryRun          bool     `json:"dry_run,omitempty"`
}

// CorpusImportEvent is a single SSE event from corpus import.
type CorpusImportEvent struct {
	Type    string                 `json:"type"`
	Message string                 `json:"message,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

// ImportCorpus starts a corpus import and streams progress events.
func (c *RuntimeClient) ImportCorpus(
	ctx context.Context,
	req *CorpusImportRequest,
) (<-chan *CorpusImportEvent, <-chan error) {
	resultCh := make(chan *CorpusImportEvent, 10)
	errCh := make(chan error, 1)

	go func() {
		defer close(resultCh)
		defer close(errCh)

		url := fmt.Sprintf("%s/corpus/import", c.baseURL)
		body, err := json.Marshal(req)
		if err != nil {
			errCh <- fmt.Errorf("marshal request: %w", err)
			return
		}

		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		if err != nil {
			errCh <- fmt.Errorf("create request: %w", err)
			return
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Accept", "text/event-stream")

		// Use a client without timeout for long-running imports
		longClient := &http.Client{}
		resp, err := longClient.Do(httpReq)
		if err != nil {
			errCh <- fmt.Errorf("do request: %w", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			errCh <- fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
			return
		}

		// Parse SSE stream
		scanner := bufio.NewScanner(resp.Body)
		// Increase scanner buffer for potentially large events
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			line := scanner.Text()
			if !bytes.HasPrefix([]byte(line), []byte("data: ")) {
				continue
			}

			data := line[6:] // Remove "data: " prefix
			if data == "[DONE]" {
				return
			}

			var event CorpusImportEvent
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				continue // Skip malformed lines
			}

			select {
			case resultCh <- &event:
			case <-ctx.Done():
				return
			}
		}

		if err := scanner.Err(); err != nil {
			errCh <- fmt.Errorf("scan response: %w", err)
		}
	}()

	return resultCh, errCh
}

// Health checks if the runtime is healthy.
func (c *RuntimeClient) Health(ctx context.Context) error {
	url := fmt.Sprintf("%s/../health", c.baseURL) // /v1/../health -> /health
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("runtime health check failed: %d", resp.StatusCode)
	}

	return nil
}

// SolutionSyncRequest is the request body for syncing a solution to RAG.
type SolutionSyncRequest struct {
	SolutionID        string   `json:"solution_id"`
	Title             string   `json:"title"`
	ProblemSymptoms   string   `json:"problem_symptoms"`
	KeyInformation    string   `json:"key_information"`
	TroubleshootSteps string   `json:"troubleshooting_steps"`
	ResolutionSteps   string   `json:"resolution_steps"`
	Domain            string   `json:"domain,omitempty"`
	Tags              []string `json:"tags,omitempty"`
	SearchKeywords    string   `json:"search_keywords,omitempty"`
}

// SolutionSyncResponse is the response from syncing a solution to RAG.
type SolutionSyncResponse struct {
	Success         bool   `json:"success"`
	RAGCollectionID string `json:"rag_collection_id,omitempty"`
	RAGDocumentID   string `json:"rag_document_id,omitempty"`
}

// SyncSolutionToRAG syncs a troubleshooting solution to the RAG vector store.
func (c *RuntimeClient) SyncSolutionToRAG(
	ctx context.Context,
	req *SolutionSyncRequest,
) (*SolutionSyncResponse, error) {
	url := fmt.Sprintf("%s/solutions/sync-rag", c.baseURL)
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
	}

	var result SolutionSyncResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// SemanticSearchRequest is the request body for semantic solution search.
type SemanticSearchRequest struct {
	Query  string   `json:"query"`
	Domain string   `json:"domain,omitempty"`
	Tags   []string `json:"tags,omitempty"`
	TopK   int      `json:"top_k,omitempty"`
}

// SemanticSearchResult is a single semantic search result.
type SemanticSearchResult struct {
	SolutionID string  `json:"solution_id"`
	Title      string  `json:"title"`
	Score      float64 `json:"score"`
	Snippet    string  `json:"snippet,omitempty"`
}

// SemanticSearchResponse is the response from semantic solution search.
type SemanticSearchResponse struct {
	Results []SemanticSearchResult `json:"results"`
	Total   int                    `json:"total"`
}

// SemanticSearchSolutions performs semantic search on troubleshooting solutions via RAG.
func (c *RuntimeClient) SemanticSearchSolutions(
	ctx context.Context,
	req *SemanticSearchRequest,
) (*SemanticSearchResponse, error) {
	url := fmt.Sprintf("%s/solutions/semantic-search", c.baseURL)
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status: %d, body: %s", resp.StatusCode, string(body))
	}

	var result SemanticSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}
