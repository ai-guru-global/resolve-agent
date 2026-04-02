package rag

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newIngestCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "ingest",
		Short: "Ingest documents into a collection",
		RunE: func(cmd *cobra.Command, args []string) error {
			collectionID, _ := cmd.Flags().GetString("collection")
			path, _ := cmd.Flags().GetString("path")
			recursive, _ := cmd.Flags().GetBool("recursive")

			if collectionID == "" {
				return fmt.Errorf("collection ID is required (--collection)")
			}

			// Check if path exists
			info, err := os.Stat(path)
			if err != nil {
				return fmt.Errorf("path not found: %s", path)
			}

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Verify collection exists
			_, err = c.GetCollection(ctx, collectionID)
			if err != nil {
				return fmt.Errorf("collection not found: %s", collectionID)
			}

			// Process files
			var files []string
			if info.IsDir() {
				files, err = collectFiles(path, recursive)
				if err != nil {
					return fmt.Errorf("failed to collect files: %w", err)
				}
			} else {
				files = []string{path}
			}

			if len(files) == 0 {
				fmt.Println("No files to ingest.")
				return nil
			}

			fmt.Printf("Ingesting %d document(s) into collection '%s'...\n", len(files), collectionID)

			// Ingest each file
			totalChunks := 0
			totalVectors := 0

			for i, file := range files {
				content, err := os.ReadFile(file)
				if err != nil {
					fmt.Printf("  ✗ %s: failed to read (%v)\n", file, err)
					continue
				}

				req := &client.IngestDocumentRequest{
					CollectionID: collectionID,
					Content:      string(content),
					FilePath:     file,
					Metadata: map[string]interface{}{
						"filename": filepath.Base(file),
						"index":    i,
					},
				}

				resp, err := c.IngestDocument(ctx, req)
				if err != nil {
					fmt.Printf("  ✗ %s: failed to ingest (%v)\n", file, err)
					continue
				}

				totalChunks += resp.ChunksCreated
				totalVectors += resp.VectorsInserted
				fmt.Printf("  ✓ %s: %d chunks, %d vectors\n", file, resp.ChunksCreated, resp.VectorsInserted)
			}

			fmt.Println()
			fmt.Printf("✓ Ingestion completed\n")
			fmt.Printf("  Total chunks:  %d\n", totalChunks)
			fmt.Printf("  Total vectors: %d\n", totalVectors)

			return nil
		},
	}

	cmd.Flags().StringP("collection", "c", "", "Target collection ID")
	cmd.Flags().StringP("path", "p", ".", "Path to documents directory or file")
	cmd.Flags().BoolP("recursive", "r", false, "Process directories recursively")

	return cmd
}

// collectFiles collects all files from a directory.
func collectFiles(root string, recursive bool) ([]string, error) {
	var files []string

	if recursive {
		err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && isSupportedFile(path) {
				files = append(files, path)
			}
			return nil
		})
		return files, err
	}

	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			path := filepath.Join(root, entry.Name())
			if isSupportedFile(path) {
				files = append(files, path)
			}
		}
	}

	return files, nil
}

// isSupportedFile checks if the file type is supported.
func isSupportedFile(path string) bool {
	ext := filepath.Ext(path)
	supported := []string{".txt", ".md", ".json", ".yaml", ".yml", ".pdf", ".docx", ".html"}
	for _, s := range supported {
		if ext == s {
			return true
		}
	}
	return false
}
