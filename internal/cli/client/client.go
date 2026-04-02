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
