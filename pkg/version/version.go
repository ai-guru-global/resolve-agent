// Package version exposes build-time metadata (version, commit, build date,
// and Go runtime) for the ResolveAgent binaries.
package version

import (
	"fmt"
	"runtime"
)

// Build-time variables set via ldflags
var (
	Version   = "dev"
	Commit    = "unknown"
	BuildDate = "unknown"
)

// Info returns formatted version information.
func Info() string {
	return fmt.Sprintf("ResolveAgent %s (commit: %s, built: %s, %s/%s)",
		Version, Commit, BuildDate, runtime.GOOS, runtime.GOARCH)
}
