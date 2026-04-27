package service

import (
	"log/slog"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/gateway"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

func TestNewRegistryService(t *testing.T) {
	logger := slog.Default()
	agentReg := registry.NewInMemoryAgentRegistry()
	skillReg := registry.NewInMemorySkillRegistry()
	workflowReg := registry.NewInMemoryWorkflowRegistry()
	modelRouter := gateway.NewModelRouter(nil, logger)

	svc := NewRegistryService(agentReg, skillReg, workflowReg, modelRouter, logger)

	if svc == nil {
		t.Fatal("NewRegistryService() returned nil")
	}
	if svc.agentRegistry != agentReg {
		t.Error("agentRegistry not set correctly")
	}
	if svc.skillRegistry != skillReg {
		t.Error("skillRegistry not set correctly")
	}
	if svc.workflowRegistry != workflowReg {
		t.Error("workflowRegistry not set correctly")
	}
	if svc.modelRouter != modelRouter {
		t.Error("modelRouter not set correctly")
	}
	if svc.logger != logger {
		t.Error("logger not set correctly")
	}
}

func TestRegistryAgentResponse(t *testing.T) {
	resp := RegistryAgentResponse{
		ID:          "agent-1",
		Name:        "Test Agent",
		Description: "A test agent",
		Type:        "mega",
		Status:      "active",
		Config:      map[string]any{"model": "qwen-plus"},
		Labels:      map[string]string{"env": "test"},
	}

	if resp.ID != "agent-1" {
		t.Errorf("expected ID 'agent-1', got %q", resp.ID)
	}
	if resp.Name != "Test Agent" {
		t.Errorf("expected name 'Test Agent', got %q", resp.Name)
	}
}

func TestRegistrySkillResponse(t *testing.T) {
	resp := RegistrySkillResponse{
		Name:        "web_search",
		Version:     "1.0.0",
		Description: "Web search skill",
		Author:      "test",
		Status:      "active",
		SourceType:  "builtin",
		SourceURI:   "",
		Labels:      map[string]string{"category": "search"},
	}

	if resp.Name != "web_search" {
		t.Errorf("expected name 'web_search', got %q", resp.Name)
	}
	if resp.Version != "1.0.0" {
		t.Errorf("expected version '1.0.0', got %q", resp.Version)
	}
}
