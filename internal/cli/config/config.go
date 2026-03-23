package config

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// NewCmd returns the config command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Manage CLI configuration",
	}

	cmd.AddCommand(newSetCmd())
	cmd.AddCommand(newGetCmd())
	cmd.AddCommand(newViewCmd())
	cmd.AddCommand(newInitCmd())

	return cmd
}

func newSetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set [key] [value]",
		Short: "Set a configuration value",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			key, value := args[0], args[1]
			viper.Set(key, value)
			if err := viper.WriteConfig(); err != nil {
				return fmt.Errorf("writing config: %w", err)
			}
			fmt.Printf("Set %s = %s\n", key, value)
			return nil
		},
	}
}

func newGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get [key]",
		Short: "Get a configuration value",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			key := args[0]
			value := viper.Get(key)
			if value == nil {
				fmt.Printf("%s: (not set)\n", key)
			} else {
				fmt.Printf("%s: %v\n", key, value)
			}
			return nil
		},
	}
}

func newViewCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "view",
		Short: "View full configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			for _, key := range viper.AllKeys() {
				fmt.Printf("%s: %v\n", key, viper.Get(key))
			}
			return nil
		},
	}
}

func newInitCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "init",
		Short: "Initialize default configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Initializing default ResolveAgent configuration...")
			// TODO: Create default config file
			return nil
		},
	}
}
