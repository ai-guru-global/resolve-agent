package styles

import (
	"testing"

	"github.com/charmbracelet/lipgloss"
)

func TestThemeColors(t *testing.T) {
	colors := map[string]lipgloss.Color{
		"Primary":    Primary,
		"Secondary":  Secondary,
		"Success":    Success,
		"Warning":    Warning,
		"Error":      Error,
		"Muted":      Muted,
		"Background": Background,
	}

	for name, color := range colors {
		if color == "" {
			t.Errorf("expected %s color to be non-empty", name)
		}
	}
}

func TestTitleStyle(t *testing.T) {
	if Title.GetForeground() != Primary {
		t.Error("expected Title foreground to be Primary")
	}
}

func TestSubtitleStyle(t *testing.T) {
	if Subtitle.GetForeground() != Secondary {
		t.Error("expected Subtitle foreground to be Secondary")
	}
}

func TestStatusStyles(t *testing.T) {
	if StatusHealthy.GetForeground() != Success {
		t.Error("expected StatusHealthy foreground to be Success")
	}
	if StatusError.GetForeground() != Error {
		t.Error("expected StatusError foreground to be Error")
	}
	if StatusWarning.GetForeground() != Warning {
		t.Error("expected StatusWarning foreground to be Warning")
	}
}
