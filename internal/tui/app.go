package tui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

var (
	titleStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7C3AED")).
		MarginBottom(1)

	statusStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#6B7280"))
)

// Model is the main TUI application model.
type Model struct {
	currentView string
	width       int
	height      int
	quitting    bool
}

// New creates a new TUI application model.
func New() Model {
	return Model{
		currentView: "dashboard",
	}
}

// Init implements tea.Model.
func (m Model) Init() tea.Cmd {
	return nil
}

// Update implements tea.Model.
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			m.quitting = true
			return m, tea.Quit
		case "1":
			m.currentView = "dashboard"
		case "2":
			m.currentView = "agents"
		case "3":
			m.currentView = "workflows"
		case "4":
			m.currentView = "logs"
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}

	return m, nil
}

// View implements tea.Model.
func (m Model) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	s := titleStyle.Render("ResolveNet Dashboard")
	s += "\n"
	s += statusStyle.Render(fmt.Sprintf("View: %s | Size: %dx%d", m.currentView, m.width, m.height))
	s += "\n\n"

	switch m.currentView {
	case "dashboard":
		s += "System Status: Healthy\n"
		s += "Active Agents: 0\n"
		s += "Running Workflows: 0\n"
		s += "Loaded Skills: 0\n"
	case "agents":
		s += "No agents registered.\n"
	case "workflows":
		s += "No workflows defined.\n"
	case "logs":
		s += "No recent logs.\n"
	}

	s += "\n"
	s += statusStyle.Render("[1] Dashboard  [2] Agents  [3] Workflows  [4] Logs  [q] Quit")

	return s
}

// Run starts the TUI application.
func Run() error {
	p := tea.NewProgram(New(), tea.WithAltScreen())
	_, err := p.Run()
	return err
}
