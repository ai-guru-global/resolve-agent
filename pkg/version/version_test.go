package version

import (
	"runtime"
	"strings"
	"testing"
)

func TestInfo(t *testing.T) {
	info := Info()

	if info == "" {
		t.Error("Info() returned empty string")
	}

	if !strings.Contains(info, Version) {
		t.Errorf("Info() should contain version %q, got %q", Version, info)
	}

	if !strings.Contains(info, Commit) {
		t.Errorf("Info() should contain commit %q, got %q", Commit, info)
	}

	if !strings.Contains(info, BuildDate) {
		t.Errorf("Info() should contain build date %q, got %q", BuildDate, info)
	}

	if !strings.Contains(info, runtime.GOOS) {
		t.Errorf("Info() should contain GOOS %q, got %q", runtime.GOOS, info)
	}

	if !strings.Contains(info, runtime.GOARCH) {
		t.Errorf("Info() should contain GOARCH %q, got %q", runtime.GOARCH, info)
	}
}

func TestDefaultValues(t *testing.T) {
	if Version != "dev" {
		t.Errorf("expected default version 'dev', got %q", Version)
	}
	if Commit != "unknown" {
		t.Errorf("expected default commit 'unknown', got %q", Commit)
	}
	if BuildDate != "unknown" {
		t.Errorf("expected default build date 'unknown', got %q", BuildDate)
	}
}
