package event

import "testing"

func TestStreamSubject(t *testing.T) {
	cases := []struct {
		eventType string
		want      string
	}{
		{"agent.created", "AGENTS.agent.created"},
		{"skill.invoked", "SKILLS.skill.invoked"},
		{"workflow.completed", "WORKFLOWS.workflow.completed"},
		{"execution.started", "EXECUTIONS.execution.started"},
		{"agent", "AGENTS.agent"},
		// Already stream-prefixed types must not be double-pluralized.
		{"AGENTS.agent.created", "AGENTS.AGENTS.agent.created"},
	}

	for _, tc := range cases {
		if got := streamSubject(tc.eventType); got != tc.want {
			t.Errorf("streamSubject(%q) = %q, want %q", tc.eventType, got, tc.want)
		}
	}
}
