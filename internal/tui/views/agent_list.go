package views

// AgentListView displays a list of agents.
type AgentListView struct {
	Agents []AgentItem
}

// AgentItem represents an agent in the list.
type AgentItem struct {
	ID     string
	Name   string
	Type   string
	Status string
}
