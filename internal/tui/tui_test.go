package tui

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestNew(t *testing.T) {
	m := New()
	if m.currentView != "dashboard" {
		t.Errorf("expected currentView 'dashboard', got %q", m.currentView)
	}
}

func TestModel_Init(t *testing.T) {
	m := New()
	cmd := m.Init()
	if cmd != nil {
		t.Error("expected Init() to return nil")
	}
}

func TestModel_View(t *testing.T) {
	m := New()
	view := m.View()
	if view == "" {
		t.Error("expected non-empty view")
	}
	if !contains(view, "ResolveAgent Dashboard") {
		t.Error("expected view to contain title")
	}
}

func TestModel_Update_Quit(t *testing.T) {
	m := New()
	newModel, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'q'}})
	if !newModel.(Model).quitting {
		t.Error("expected quitting to be true")
	}
	if cmd == nil {
		t.Error("expected quit command")
	}
}

func TestModel_Update_SwitchView(t *testing.T) {
	m := New()
	newModel, _ := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'2'}})
	if newModel.(Model).currentView != "agents" {
		t.Errorf("expected currentView 'agents', got %q", newModel.(Model).currentView)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
