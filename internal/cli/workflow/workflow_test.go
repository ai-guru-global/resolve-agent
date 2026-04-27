package workflow

import (
	"testing"
)

func TestNewCmd(t *testing.T) {
	cmd := NewCmd()
	if cmd == nil {
		t.Fatal("NewCmd() returned nil")
	}
	if cmd.Use != "workflow" {
		t.Errorf("expected use 'workflow', got %q", cmd.Use)
	}
	if len(cmd.Commands()) == 0 {
		t.Error("expected subcommands to be registered")
	}
}

func TestNewCmd_Subcommands(t *testing.T) {
	cmd := NewCmd()
	expected := []string{"create", "run", "list", "validate", "visualize"}

	for _, name := range expected {
		_, _, err := cmd.Find([]string{name})
		if err != nil {
			t.Errorf("expected subcommand %q to be registered: %v", name, err)
		}
	}
}
