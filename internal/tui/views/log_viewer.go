package views

// LogViewerView displays streaming log output.
type LogViewerView struct {
	Lines    []string
	MaxLines int
	Follow   bool
}

// NewLogViewerView creates a new log viewer.
func NewLogViewerView() *LogViewerView {
	return &LogViewerView{
		MaxLines: 1000,
		Follow:   true,
	}
}
