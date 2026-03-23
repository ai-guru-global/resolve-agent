package main

import (
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli"
)

func main() {
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
