package cli

import (
	"testing"
)

func TestExecute(t *testing.T) {
	// Execute should not panic; we can't test full execution without side effects.
	// Just verify the command tree is initialized.
	if rootCmd == nil {
		t.Fatal("rootCmd is nil")
	}
	if rootCmd.Use != "resolveagent" {
		t.Errorf("expected use 'resolveagent', got %q", rootCmd.Use)
	}
}

func TestRootCommand_Subcommands(t *testing.T) {
	expected := []string{
		"agent", "skill", "workflow", "rag", "corpus",
		"config", "version", "dashboard", "serve",
	}

	for _, name := range expected {
		cmd, _, _ := rootCmd.Find([]string{name})
		if cmd == nil || cmd.Name() != name {
			t.Errorf("expected subcommand %q to be registered", name)
		}
	}
}
