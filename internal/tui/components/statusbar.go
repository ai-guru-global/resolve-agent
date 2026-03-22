package components

import (
	"github.com/charmbracelet/lipgloss"
)

var statusBarStyle = lipgloss.NewStyle().
	Background(lipgloss.Color("#7C3AED")).
	Foreground(lipgloss.Color("#FFFFFF")).
	Padding(0, 1)

// StatusBar renders a status bar at the bottom of the TUI.
type StatusBar struct {
	Text  string
	Width int
}

// Render returns the rendered status bar string.
func (s StatusBar) Render() string {
	return statusBarStyle.Width(s.Width).Render(s.Text)
}
