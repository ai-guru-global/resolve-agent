package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/spf13/viper"
)

// Client is the HTTP client for the ResolveAgent API.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// New creates a new API client.
func New() *Client {
	server := viper.GetString("server")
	if server == "" {
		server = "localhost:8080"
	}

	return &Client{
		baseURL: fmt.Sprintf("http://%s/api/v1", server),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Get performs a GET request.
func (c *Client) Get(ctx context.Context, path string) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// Post performs a POST request.
func (c *Client) Post(ctx context.Context, path string, data interface{}) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, path)

	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, body)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Delete performs a DELETE request.
func (c *Client) Delete(ctx context.Context, path string) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, path)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// Agent represents an agent definition.
type Agent struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Type        string                 `json:"type"`
	Config      map[string]interface{} `json:"config"`
	Status      string                 `json:"status"`
	Labels      map[string]string      `json:"labels"`
	Version     int64                  `json:"version"`
}

// ListAgentsResponse is the response for listing agents.
type ListAgentsResponse struct {
	Agents []*Agent `json:"agents"`
	Total  int      `json:"total"`
}

// ListAgents returns all agents.
func (c *Client) ListAgents(ctx context.Context) (*ListAgentsResponse, error) {
	body, err := c.Get(ctx, "/agents")
	if err != nil {
		return nil, err
	}

	var resp ListAgentsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// CreateAgent creates a new agent.
func (c *Client) CreateAgent(ctx context.Context, agent *Agent) (*Agent, error) {
	body, err := c.Post(ctx, "/agents", agent)
	if err != nil {
		return nil, err
	}

	var created Agent
	if err := json.Unmarshal(body, &created); err != nil {
		return nil, err
	}

	return &created, nil
}

// GetAgent returns a single agent.
func (c *Client) GetAgent(ctx context.Context, id string) (*Agent, error) {
	body, err := c.Get(ctx, fmt.Sprintf("/agents/%s", id))
	if err != nil {
		return nil, err
	}

	var agent Agent
	if err := json.Unmarshal(body, &agent); err != nil {
		return nil, err
	}

	return &agent, nil
}

// DeleteAgent deletes an agent.
func (c *Client) DeleteAgent(ctx context.Context, id string) error {
	_, err := c.Delete(ctx, fmt.Sprintf("/agents/%s", id))
	return err
}

// ExecuteRequest is the request to execute an agent.
type ExecuteRequest struct {
	Message string                 `json:"message"`
	Context map[string]interface{} `json:"context,omitempty"`
	Stream  bool                   `json:"stream,omitempty"`
	Wait    bool                   `json:"wait,omitempty"`
}

// Usage represents token usage.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ExecuteResponse is the response from executing an agent.
type ExecuteResponse struct {
	AgentID   string   `json:"agent_id"`
	Response  string   `json:"response"`
	Message   string   `json:"message"`
	Content   string   `json:"content"`
	Duration  float64  `json:"duration"`
	Usage     *Usage   `json:"usage,omitempty"`
}

// ExecuteAgent executes an agent.
func (c *Client) ExecuteAgent(ctx context.Context, id string, req *ExecuteRequest) (*ExecuteResponse, error) {
	body, err := c.Post(ctx, fmt.Sprintf("/agents/%s/execute", id), req)
	if err != nil {
		return nil, err
	}

	var resp ExecuteResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// ExecutionLog represents a single log entry.
type ExecutionLog struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
}

// GetAgentLogs retrieves logs for an agent.
func (c *Client) GetAgentLogs(ctx context.Context, agentID, executionID string, limit int) ([]*ExecutionLog, error) {
	path := fmt.Sprintf("/agents/%s/logs", agentID)
	if executionID != "" {
		path = fmt.Sprintf("%s?execution_id=%s", path, executionID)
	}
	if limit > 0 {
		path = fmt.Sprintf("%s&limit=%d", path, limit)
	}

	body, err := c.Get(ctx, path)
	if err != nil {
		return nil, err
	}

	var logs []*ExecutionLog
	if err := json.Unmarshal(body, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}

// Skill represents a skill definition.
type Skill struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Version     string                 `json:"version"`
	Type        string                 `json:"type"`
	Status      string                 `json:"status"`
	Source      string                 `json:"source"`
	Config      map[string]interface{} `json:"config"`
	Labels      map[string]string      `json:"labels"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ListSkillsResponse is the response for listing skills.
type ListSkillsResponse struct {
	Skills []*Skill `json:"skills"`
	Total  int      `json:"total"`
}

// ListSkills returns all skills.
func (c *Client) ListSkills(ctx context.Context) (*ListSkillsResponse, error) {
	body, err := c.Get(ctx, "/skills")
	if err != nil {
		return nil, err
	}

	var resp ListSkillsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// GetSkill returns a single skill.
func (c *Client) GetSkill(ctx context.Context, id string) (*Skill, error) {
	body, err := c.Get(ctx, fmt.Sprintf("/skills/%s", id))
	if err != nil {
		return nil, err
	}

	var skill Skill
	if err := json.Unmarshal(body, &skill); err != nil {
		return nil, err
	}

	return &skill, nil
}

// InstallSkillRequest is the request to install a skill.
type InstallSkillRequest struct {
	Source string                 `json:"source"`
	Type   string                 `json:"type"`
	Config map[string]interface{} `json:"config,omitempty"`
}

// InstallSkill installs a skill from source.
func (c *Client) InstallSkill(ctx context.Context, req *InstallSkillRequest) (*Skill, error) {
	body, err := c.Post(ctx, "/skills", req)
	if err != nil {
		return nil, err
	}

	var skill Skill
	if err := json.Unmarshal(body, &skill); err != nil {
		return nil, err
	}

	return &skill, nil
}

// DeleteSkill removes a skill.
func (c *Client) DeleteSkill(ctx context.Context, id string) error {
	_, err := c.Delete(ctx, fmt.Sprintf("/skills/%s", id))
	return err
}

// TestSkillRequest is the request to test a skill.
type TestSkillRequest struct {
	Input map[string]interface{} `json:"input"`
}

// TestSkillResponse is the response from testing a skill.
type TestSkillResponse struct {
	SkillID string                 `json:"skill_id"`
	Output  map[string]interface{} `json:"output"`
	Error   string                 `json:"error,omitempty"`
	Duration float64               `json:"duration"`
}

// TestSkill tests a skill with input.
func (c *Client) TestSkill(ctx context.Context, id string, req *TestSkillRequest) (*TestSkillResponse, error) {
	body, err := c.Post(ctx, fmt.Sprintf("/skills/%s/test", id), req)
	if err != nil {
		return nil, err
	}

	var resp TestSkillResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// Workflow represents a workflow definition.
type Workflow struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Version     string                 `json:"version"`
	Status      string                 `json:"status"`
	Definition  map[string]interface{} `json:"definition"`
	Labels      map[string]string      `json:"labels"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ListWorkflowsResponse is the response for listing workflows.
type ListWorkflowsResponse struct {
	Workflows []*Workflow `json:"workflows"`
	Total     int         `json:"total"`
}

// ListWorkflows returns all workflows.
func (c *Client) ListWorkflows(ctx context.Context) (*ListWorkflowsResponse, error) {
	body, err := c.Get(ctx, "/workflows")
	if err != nil {
		return nil, err
	}

	var resp ListWorkflowsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// GetWorkflow returns a single workflow.
func (c *Client) GetWorkflow(ctx context.Context, id string) (*Workflow, error) {
	body, err := c.Get(ctx, fmt.Sprintf("/workflows/%s", id))
	if err != nil {
		return nil, err
	}

	var workflow Workflow
	if err := json.Unmarshal(body, &workflow); err != nil {
		return nil, err
	}

	return &workflow, nil
}

// CreateWorkflow creates a new workflow.
func (c *Client) CreateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error) {
	body, err := c.Post(ctx, "/workflows", workflow)
	if err != nil {
		return nil, err
	}

	var created Workflow
	if err := json.Unmarshal(body, &created); err != nil {
		return nil, err
	}

	return &created, nil
}

// DeleteWorkflow deletes a workflow.
func (c *Client) DeleteWorkflow(ctx context.Context, id string) error {
	_, err := c.Delete(ctx, fmt.Sprintf("/workflows/%s", id))
	return err
}

// ValidateWorkflowRequest is the request to validate a workflow.
type ValidateWorkflowRequest struct {
	Definition map[string]interface{} `json:"definition"`
}

// ValidateWorkflowResponse is the response from validating a workflow.
type ValidateWorkflowResponse struct {
	Valid   bool     `json:"valid"`
	Errors  []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

// ValidateWorkflow validates a workflow definition.
func (c *Client) ValidateWorkflow(ctx context.Context, req *ValidateWorkflowRequest) (*ValidateWorkflowResponse, error) {
	body, err := c.Post(ctx, "/workflows/validate", req)
	if err != nil {
		return nil, err
	}

	var resp ValidateWorkflowResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// ExecuteWorkflowRequest is the request to execute a workflow.
type ExecuteWorkflowRequest struct {
	Input map[string]interface{} `json:"input,omitempty"`
	Async bool                   `json:"async,omitempty"`
	Wait  bool                   `json:"wait,omitempty"`
}

// ExecuteWorkflowResponse is the response from executing a workflow.
type ExecuteWorkflowResponse struct {
	ExecutionID string                 `json:"execution_id"`
	WorkflowID  string                 `json:"workflow_id"`
	Status      string                 `json:"status"`
	Output      map[string]interface{} `json:"output,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Duration    float64                `json:"duration"`
}

// ExecuteWorkflow executes a workflow.
func (c *Client) ExecuteWorkflow(ctx context.Context, id string, req *ExecuteWorkflowRequest) (*ExecuteWorkflowResponse, error) {
	body, err := c.Post(ctx, fmt.Sprintf("/workflows/%s/execute", id), req)
	if err != nil {
		return nil, err
	}

	var resp ExecuteWorkflowResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// Collection represents a RAG collection.
type Collection struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	EmbeddingModel  string            `json:"embedding_model"`
	ChunkStrategy   string            `json:"chunk_strategy"`
	DocumentCount   int               `json:"document_count"`
	VectorCount     int               `json:"vector_count"`
	Status          string            `json:"status"`
	Labels          map[string]string `json:"labels"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// ListCollectionsResponse is the response for listing collections.
type ListCollectionsResponse struct {
	Collections []*Collection `json:"collections"`
	Total       int           `json:"total"`
}

// ListCollections returns all RAG collections.
func (c *Client) ListCollections(ctx context.Context) (*ListCollectionsResponse, error) {
	body, err := c.Get(ctx, "/rag/collections")
	if err != nil {
		return nil, err
	}

	var resp ListCollectionsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// GetCollection returns a single collection.
func (c *Client) GetCollection(ctx context.Context, id string) (*Collection, error) {
	body, err := c.Get(ctx, fmt.Sprintf("/rag/collections/%s", id))
	if err != nil {
		return nil, err
	}

	var collection Collection
	if err := json.Unmarshal(body, &collection); err != nil {
		return nil, err
	}

	return &collection, nil
}

// CreateCollection creates a new RAG collection.
func (c *Client) CreateCollection(ctx context.Context, collection *Collection) (*Collection, error) {
	body, err := c.Post(ctx, "/rag/collections", collection)
	if err != nil {
		return nil, err
	}

	var created Collection
	if err := json.Unmarshal(body, &created); err != nil {
		return nil, err
	}

	return &created, nil
}

// DeleteCollection deletes a RAG collection.
func (c *Client) DeleteCollection(ctx context.Context, id string) error {
	_, err := c.Delete(ctx, fmt.Sprintf("/rag/collections/%s", id))
	return err
}

// IngestDocumentRequest is the request to ingest documents.
type IngestDocumentRequest struct {
	CollectionID string                 `json:"collection_id"`
	Content      string                 `json:"content,omitempty"`
	FilePath     string                 `json:"file_path,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// IngestDocumentResponse is the response from ingesting documents.
type IngestDocumentResponse struct {
	DocumentID      string  `json:"document_id"`
	CollectionID    string  `json:"collection_id"`
	ChunksCreated   int     `json:"chunks_created"`
	VectorsInserted int     `json:"vectors_inserted"`
	Duration        float64 `json:"duration"`
}

// IngestDocument ingests a document into a collection.
func (c *Client) IngestDocument(ctx context.Context, req *IngestDocumentRequest) (*IngestDocumentResponse, error) {
	body, err := c.Post(ctx, "/rag/ingest", req)
	if err != nil {
		return nil, err
	}

	var resp IngestDocumentResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}

// QueryRequest is the request to query a collection.
type QueryRequest struct {
	Query        string                 `json:"query"`
	CollectionID string                 `json:"collection_id"`
	TopK         int                    `json:"top_k"`
	Filters      map[string]interface{} `json:"filters,omitempty"`
}

// QueryResult represents a single query result.
type QueryResult struct {
	Content    string                 `json:"content"`
	Score      float64                `json:"score"`
	Metadata   map[string]interface{} `json:"metadata"`
	DocumentID string                 `json:"document_id"`
}

// QueryResponse is the response from querying a collection.
type QueryResponse struct {
	Query    string         `json:"query"`
	Results  []*QueryResult `json:"results"`
	Total    int            `json:"total"`
	Duration float64        `json:"duration"`
}

// QueryCollection queries a RAG collection.
func (c *Client) QueryCollection(ctx context.Context, req *QueryRequest) (*QueryResponse, error) {
	body, err := c.Post(ctx, "/rag/query", req)
	if err != nil {
		return nil, err
	}

	var resp QueryResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, err
	}

	return &resp, nil
}
