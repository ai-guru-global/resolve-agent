package components

// Table is a reusable table component for the TUI.
type Table struct {
	Headers []string
	Rows    [][]string
	Cursor  int
}

// NewTable creates a new table component.
func NewTable(headers []string) *Table {
	return &Table{
		Headers: headers,
	}
}

// AddRow adds a row to the table.
func (t *Table) AddRow(cells ...string) {
	t.Rows = append(t.Rows, cells)
}
