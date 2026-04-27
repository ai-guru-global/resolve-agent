package styles

import (
	"github.com/charmbracelet/lipgloss"
)

// Theme defines the visual theme for the TUI.
var (
	// Colors
	Primary    = lipgloss.Color("#7C3AED")
	Secondary  = lipgloss.Color("#3B82F6")
	Success    = lipgloss.Color("#10B981")
	Warning    = lipgloss.Color("#F59E0B")
	Error      = lipgloss.Color("#EF4444")
	Muted      = lipgloss.Color("#6B7280")
	Background = lipgloss.Color("#1F2937")

	// Text styles
	Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(Primary)

	Subtitle = lipgloss.NewStyle().
			Foreground(Secondary)

	Label = lipgloss.NewStyle().
		Foreground(Muted)

	// Status styles
	StatusHealthy = lipgloss.NewStyle().
			Foreground(Success).
			Bold(true)

	StatusError = lipgloss.NewStyle().
			Foreground(Error).
			Bold(true)

	StatusWarning = lipgloss.NewStyle().
			Foreground(Warning)

	// Layout
	Border = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(Muted).
		Padding(1, 2)
)
