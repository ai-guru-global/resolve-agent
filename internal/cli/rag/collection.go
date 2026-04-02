package rag

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

// NewCmd returns the RAG command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "rag",
		Short: "Manage RAG collections and documents",
		Long:  "Manage Retrieval-Augmented Generation collections, ingestion, and queries.",
	}

	collectionCmd := &cobra.Command{
		Use:   "collection",
		Short: "Manage RAG collections",
	}

	collectionCmd.AddCommand(newCollectionCreateCmd())
	collectionCmd.AddCommand(newCollectionListCmd())
	collectionCmd.AddCommand(newCollectionDeleteCmd())

	cmd.AddCommand(collectionCmd)
	cmd.AddCommand(newIngestCmd())
	cmd.AddCommand(newQueryCmd())

	return cmd
}

func newCollectionCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [name]",
		Short: "Create a RAG collection",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			embeddingModel, _ := cmd.Flags().GetString("embedding-model")
			chunkStrategy, _ := cmd.Flags().GetString("chunk-strategy")
			description, _ := cmd.Flags().GetString("description")

			fmt.Printf("Creating collection '%s'...\n", name)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Create collection via API
			collection := &client.Collection{
				Name:           name,
				Description:    description,
				EmbeddingModel: embeddingModel,
				ChunkStrategy:  chunkStrategy,
				Status:         "active",
			}

			created, err := c.CreateCollection(ctx, collection)
			if err != nil {
				return fmt.Errorf("failed to create collection: %w", err)
			}

			fmt.Printf("✓ Collection '%s' created successfully\n", created.Name)
			fmt.Printf("  ID:              %s\n", created.ID)
			fmt.Printf("  Embedding Model: %s\n", created.EmbeddingModel)
			fmt.Printf("  Chunk Strategy:  %s\n", created.ChunkStrategy)

			return nil
		},
	}

	cmd.Flags().String("embedding-model", "bge-large-zh", "Embedding model to use")
	cmd.Flags().String("chunk-strategy", "sentence", "Chunking strategy (fixed, sentence, semantic)")
	cmd.Flags().String("description", "", "Collection description")

	return cmd
}

func newCollectionListCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "List collections",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch collections from API
			resp, err := c.ListCollections(ctx)
			if err != nil {
				return fmt.Errorf("failed to list collections: %w", err)
			}

			if len(resp.Collections) == 0 {
				fmt.Println("No collections found.")
				return nil
			}

			// Display in table format
			w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
			fmt.Fprintln(w, "ID\tNAME\tDOCUMENTS\tVECTORS\tSTATUS")
			fmt.Fprintln(w, "--\t----\t---------\t-------\t------")

			for _, col := range resp.Collections {
				fmt.Fprintf(w, "%s\t%s\t%d\t%d\t%s\n",
					col.ID,
					col.Name,
					col.DocumentCount,
					col.VectorCount,
					col.Status,
				)
			}

			return w.Flush()
		},
	}
}

func newCollectionDeleteCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "delete [id]",
		Short:   "Delete a collection",
		Aliases: []string{"rm"},
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]
			force, _ := cmd.Flags().GetBool("force")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Get collection info first
			collection, err := c.GetCollection(ctx, id)
			if err != nil {
				return fmt.Errorf("collection not found: %s", id)
			}

			if !force {
				fmt.Printf("Are you sure you want to delete collection '%s' (%s)? [y/N]: ", collection.Name, id)
				var response string
				fmt.Scanln(&response)
				if response != "y" && response != "Y" {
					fmt.Println("Cancelled")
					return nil
				}
			}

			// Delete collection via API
			if err := c.DeleteCollection(ctx, id); err != nil {
				return fmt.Errorf("failed to delete collection: %w", err)
			}

			fmt.Printf("✓ Collection '%s' deleted successfully\n", collection.Name)
			return nil
		},
	}

	cmd.Flags().BoolP("force", "f", false, "Delete without confirmation")

	return cmd
}
