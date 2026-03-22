package rag

import (
	"fmt"

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
			fmt.Printf("Creating collection '%s'...\n", name)
			// TODO: Create collection via API
			return nil
		},
	}

	cmd.Flags().String("embedding-model", "bge-large-zh", "Embedding model to use")
	cmd.Flags().String("chunk-strategy", "sentence", "Chunking strategy (fixed, sentence, semantic)")

	return cmd
}

func newCollectionListCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "List collections",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("ID\tNAME\tDOCUMENTS\tVECTORS")
			fmt.Println("--\t----\t---------\t-------")
			// TODO: Fetch collections from API
			fmt.Println("(no collections found)")
			return nil
		},
	}
}

func newCollectionDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete [id]",
		Short: "Delete a collection",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]
			fmt.Printf("Deleting collection '%s'...\n", id)
			// TODO: Delete collection via API
			return nil
		},
	}
}
