package rag

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newIngestCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "ingest",
		Short: "Ingest documents into a collection",
		RunE: func(cmd *cobra.Command, args []string) error {
			collection, _ := cmd.Flags().GetString("collection")
			path, _ := cmd.Flags().GetString("path")
			fmt.Printf("Ingesting documents from '%s' into collection '%s'...\n", path, collection)
			// TODO: Upload and ingest documents
			return nil
		},
	}

	cmd.Flags().String("collection", "", "Target collection ID")
	cmd.Flags().String("path", ".", "Path to documents directory or file")
	_ = cmd.MarkFlagRequired("collection")

	return cmd
}
