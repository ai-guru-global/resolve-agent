package corpus

import (
	"testing"
)

func TestNewCmd(t *testing.T) {
	cmd := NewCmd()
	if cmd == nil {
		t.Fatal("NewCmd() returned nil")
	}
	if cmd.Use != "corpus" {
		t.Errorf("expected use 'corpus', got %q", cmd.Use)
	}
	if len(cmd.Commands()) == 0 {
		t.Error("expected subcommands to be registered")
	}
}
