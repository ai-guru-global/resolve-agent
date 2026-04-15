package corpus

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

type corpusImportEvent struct {
	Type    string                 `json:"type"`
	Message string                 `json:"message,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

func newImportCmd() *cobra.Command {
	var (
		importTypes     []string
		ragCollectionID string
		profile         string
		forceClone      bool
		dryRun          bool
	)

	cmd := &cobra.Command{
		Use:   "import <source>",
		Short: "Import external corpus into ResolveAgent",
		Long: `Import knowledge corpus from an external source (git repository or local path).

The source can be:
  - A git URL (e.g., https://github.com/kudig-io/kudig-database)
  - A local directory path

Import types control what gets imported:
  - rag:    Knowledge documents into RAG collections
  - fta:    Fault tree analysis documents
  - skills: Skill definitions

Examples:
  # Import all content from a git repository
  resolveagent corpus import https://github.com/kudig-io/kudig-database

  # Import only RAG and FTA content
  resolveagent corpus import --type rag --type fta https://github.com/kudig-io/kudig-database

  # Import from local path with specific profile
  resolveagent corpus import --profile rag-sre-profile ./kudig-database

  # Dry run to see what would be imported
  resolveagent corpus import --dry-run https://github.com/kudig-io/kudig-database`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			source := args[0]
			return runImport(cmd.Context(), source, importTypes, ragCollectionID, profile, forceClone, dryRun)
		},
	}

	cmd.Flags().StringSliceVar(&importTypes, "type", []string{"rag", "fta", "skills"}, "Import types (rag, fta, skills)")
	cmd.Flags().StringVar(&ragCollectionID, "collection", "", "RAG collection ID (auto-created if empty)")
	cmd.Flags().StringVar(&profile, "profile", "", "Corpus config profile name")
	cmd.Flags().BoolVar(&forceClone, "force", false, "Force re-clone even if cached")
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show what would be imported without executing")

	return cmd
}

func runImport(ctx context.Context, source string, importTypes []string, ragCollectionID, profile string, forceClone, dryRun bool) error {
	server := viper.GetString("server")
	if server == "" {
		server = "localhost:8080"
	}

	baseURL := fmt.Sprintf("http://%s/api/v1", server)

	// Build request
	reqBody := map[string]interface{}{
		"source":       source,
		"import_types": importTypes,
		"force_clone":  forceClone,
		"dry_run":      dryRun,
	}
	if ragCollectionID != "" {
		reqBody["rag_collection_id"] = ragCollectionID
	}
	if profile != "" {
		reqBody["profile"] = profile
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	// Print header
	fmt.Printf("Importing corpus from: %s\n", source)
	fmt.Printf("Import types: %s\n", strings.Join(importTypes, ", "))
	if dryRun {
		fmt.Println("Mode: DRY RUN")
	}
	fmt.Println(strings.Repeat("-", 60))

	// Make SSE request
	url := fmt.Sprintf("%s/corpus/import", baseURL)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "text/event-stream")

	client := &http.Client{} // No timeout for long-running imports
	resp, err := client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("connect to server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server error %d: %s", resp.StatusCode, string(body))
	}

	// Parse SSE stream
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	startTime := time.Now()

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := line[6:]
		if data == "[DONE]" {
			break
		}

		var event corpusImportEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			continue
		}

		printEvent(&event)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read stream: %w", err)
	}

	elapsed := time.Since(startTime)
	fmt.Println(strings.Repeat("-", 60))
	fmt.Printf("Import completed in %s\n", elapsed.Round(time.Millisecond))

	return nil
}

func printEvent(event *corpusImportEvent) {
	switch event.Type {
	case "start":
		fmt.Printf("[START] %s\n", event.Message)
	case "phase_start":
		fmt.Printf("\n[PHASE] %s\n", event.Message)
	case "progress":
		fmt.Printf("  -> %s\n", event.Message)
	case "file_processed":
		if event.Data != nil {
			if file, ok := event.Data["file"].(string); ok {
				chunks := ""
				if c, ok := event.Data["chunks"]; ok {
					chunks = fmt.Sprintf(" (%v chunks)", c)
				}
				fmt.Printf("  [OK] %s%s\n", file, chunks)
			}
		}
	case "file_error":
		if event.Data != nil {
			file, _ := event.Data["file"].(string)
			errMsg, _ := event.Data["error"].(string)
			fmt.Printf("  [ERR] %s: %s\n", file, errMsg)
		}
	case "phase_completed":
		fmt.Printf("[DONE] %s\n", event.Message)
		if event.Data != nil {
			if stats, ok := event.Data["stats"].(map[string]interface{}); ok {
				for k, v := range stats {
					fmt.Printf("        %s: %v\n", k, v)
				}
			}
		}
	case "completed":
		fmt.Printf("\n[COMPLETED] %s\n", event.Message)
		if event.Data != nil {
			if summary, ok := event.Data["summary"].(map[string]interface{}); ok {
				for category, v := range summary {
					if stats, ok := v.(map[string]interface{}); ok {
						fmt.Printf("  %s: processed=%v errors=%v chunks=%v\n",
							category,
							stats["processed"],
							stats["errors"],
							stats["chunks"],
						)
					}
				}
			}
		}
	case "error":
		fmt.Printf("[ERROR] %s\n", event.Message)
	default:
		if event.Message != "" {
			fmt.Printf("  %s\n", event.Message)
		}
	}
}
