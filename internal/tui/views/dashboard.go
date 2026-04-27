package views

// DashboardView displays system overview metrics.
type DashboardView struct {
	ActiveAgents     int
	RunningWorkflows int
	LoadedSkills     int
	SystemStatus     string
}

// NewDashboardView creates a new dashboard view.
func NewDashboardView() *DashboardView {
	return &DashboardView{
		SystemStatus: "Healthy",
	}
}
