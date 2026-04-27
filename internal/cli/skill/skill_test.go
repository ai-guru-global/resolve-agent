package skill

import (
	"testing"
)

func TestNewCmd(t *testing.T) {
	cmd := NewCmd()
	if cmd == nil {
		t.Fatal("NewCmd() returned nil")
	}
	if cmd.Use != "skill" {
		t.Errorf("expected use 'skill', got %q", cmd.Use)
	}
	if len(cmd.Commands()) == 0 {
		t.Error("expected subcommands to be registered")
	}
}

func TestNewCmd_Subcommands(t *testing.T) {
	cmd := NewCmd()
	expected := []string{"install", "remove", "info", "list"}

	for _, name := range expected {
		_, _, err := cmd.Find([]string{name})
		if err != nil {
			t.Errorf("expected subcommand %q to be registered: %v", name, err)
		}
	}
}

func TestIsGitURL(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"https://github.com/org/repo.git", true},
		{"git@github.com:org/repo.git", true},
		{"/local/path", false},
		{"./relative/path", false},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			if got := isGitURL(tt.input); got != tt.want {
				t.Errorf("isGitURL(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}
