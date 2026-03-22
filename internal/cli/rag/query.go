package rag

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "query [text]",
		Short: "Query a RAG collection",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			query := args[0]
			collection, _ := cmd.Flags().GetString("collection")
			topK, _ := cmd.Flags().GetInt("top-k")
			fmt.Printf("Querying collection '%s' (top_k=%d): %s\n", collection, topK, query)
			// TODO: Query collection via API
			return nil
		},
	}

	cmd.Flags().String("collection", "", "Collection ID to query")
	cmd.Flags().Int("top-k", 5, "Number of results to return")
	_ = cmd.MarkFlagRequired("collection")

	return cmd
}
