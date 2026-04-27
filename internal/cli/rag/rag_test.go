package rag

import (
	"testing"
)

func TestNewCmd(t *testing.T) {
	cmd := NewCmd()
	if cmd == nil {
		t.Fatal("NewCmd() returned nil")
	}
	if cmd.Use != "rag" {
		t.Errorf("expected use 'rag', got %q", cmd.Use)
	}
	if len(cmd.Commands()) == 0 {
		t.Error("expected subcommands to be registered")
	}
}
