package workflow

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newVisualizeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "visualize [id]",
		Short: "Render workflow tree in terminal",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch workflow from API
			workflow, err := c.GetWorkflow(ctx, id)
			if err != nil {
				return fmt.Errorf("failed to get workflow: %w", err)
			}

			fmt.Printf("Workflow: %s (%s)\n", workflow.Name, workflow.ID)
			if workflow.Description != "" {
				fmt.Printf("Description: %s\n", workflow.Description)
			}
			fmt.Println()

			// Render ASCII tree from definition
			if workflow.Definition != nil {
				renderWorkflowTree(workflow.Definition)
			} else {
				fmt.Println("(empty workflow definition)")
			}

			return nil
		},
	}
}

// renderWorkflowTree renders a simple ASCII tree representation
func renderWorkflowTree(definition map[string]interface{}) {
	// Try to extract tree structure from definition
	if tree, ok := definition["tree"].(map[string]interface{}); ok {
		renderNode(tree, "", true)
	} else if root, ok := definition["root"].(map[string]interface{}); ok {
		renderNode(root, "", true)
	} else {
		// Simple placeholder visualization
		fmt.Println("  [TOP] Root Event")
		fmt.Println("    |")
		fmt.Println("  [OR Gate]")
		fmt.Println("   / \\")
		fmt.Println("  A   B")
	}
}

func renderNode(node map[string]interface{}, prefix string, isLast bool) {
	name, _ := node["name"].(string)
	if name == "" {
		name, _ = node["id"].(string)
	}
	nodeType, _ := node["type"].(string)

	connector := "├── "
	if isLast {
		connector = "└── "
	}

	if nodeType != "" {
		fmt.Printf("%s%s[%s] %s\n", prefix, connector, nodeType, name)
	} else {
		fmt.Printf("%s%s%s\n", prefix, connector, name)
	}

	// Render children
	if children, ok := node["children"].([]interface{}); ok {
		childPrefix := prefix + "│   "
		if isLast {
			childPrefix = prefix + "    "
		}
		for i, child := range children {
			if childMap, ok := child.(map[string]interface{}); ok {
				renderNode(childMap, childPrefix, i == len(children)-1)
			}
		}
	}
}
