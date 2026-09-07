// Package views provides the view models rendered by the TUI dashboard.
package views

// AgentDetailView displays detailed information about an agent.
type AgentDetailView struct {
	ID         string
	Name       string
	Type       string
	Status     string
	Model      string
	Skills     []string
	Executions int
}
