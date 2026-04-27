package views

import (
	"testing"
)

func TestDashboardView(t *testing.T) {
	v := DashboardView{
		ActiveAgents:     5,
		RunningWorkflows: 3,
		LoadedSkills:     12,
		SystemStatus:     "healthy",
	}

	if v.ActiveAgents != 5 {
		t.Errorf("expected 5 active agents, got %d", v.ActiveAgents)
	}
	if v.SystemStatus != "healthy" {
		t.Errorf("expected status 'healthy', got %q", v.SystemStatus)
	}
}

func TestAgentDetailView(t *testing.T) {
	v := AgentDetailView{
		ID:     "agent-1",
		Name:   "Test Agent",
		Type:   "mega",
		Status: "active",
		Model:  "qwen-plus",
		Skills: []string{"web_search", "code_exec"},
	}

	if v.ID != "agent-1" {
		t.Errorf("expected ID 'agent-1', got %q", v.ID)
	}
	if len(v.Skills) != 2 {
		t.Errorf("expected 2 skills, got %d", len(v.Skills))
	}
}
