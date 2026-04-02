package rag

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newQueryCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "query [text]",
		Short: "Query a RAG collection",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			query := args[0]
			collectionID, _ := cmd.Flags().GetString("collection")
			topK, _ := cmd.Flags().GetInt("top-k")

			if collectionID == "" {
				return fmt.Errorf("collection ID is required (--collection)")
			}

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Verify collection exists
			_, err := c.GetCollection(ctx, collectionID)
			if err != nil {
				return fmt.Errorf("collection not found: %s", collectionID)
			}

			fmt.Printf("Querying collection '%s': %s\n\n", collectionID, query)

			// Query collection via API
			req := &client.QueryRequest{
				Query:        query,
				CollectionID: collectionID,
				TopK:         topK,
			}

			resp, err := c.QueryCollection(ctx, req)
			if err != nil {
				return fmt.Errorf("query failed: %w", err)
			}

			// Display results
			if len(resp.Results) == 0 {
				fmt.Println("No results found.")
				return nil
			}

			fmt.Printf("Found %d result(s) in %.3fs:\n\n", len(resp.Results), resp.Duration)

			for i, result := range resp.Results {
				fmt.Printf("[%d] Score: %.4f\n", i+1, result.Score)
				if docID, ok := result.Metadata["document_id"]; ok {
					fmt.Printf("    Document: %v\n", docID)
				}
				content := result.Content
				if len(content) > 200 {
					content = content[:200] + "..."
				}
				fmt.Printf("    Content: %s\n", content)
				fmt.Println()
			}

			return nil
		},
	}

	cmd.Flags().StringP("collection", "c", "", "Collection ID to query")
	cmd.Flags().IntP("top-k", "k", 5, "Number of results to return")

	return cmd
}
