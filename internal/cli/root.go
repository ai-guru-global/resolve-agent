package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	agentcmd "github.com/ai-guru-global/resolve-net/internal/cli/agent"
	configcmd "github.com/ai-guru-global/resolve-net/internal/cli/config"
	ragcmd "github.com/ai-guru-global/resolve-net/internal/cli/rag"
	skillcmd "github.com/ai-guru-global/resolve-net/internal/cli/skill"
	workflowcmd "github.com/ai-guru-global/resolve-net/internal/cli/workflow"
)

var cfgFile string

var rootCmd = &cobra.Command{
	Use:   "resolvenet",
	Short: "ResolveNet - Mega Agent Platform",
	Long: `ResolveNet is a CNCF-grade Mega Agent platform that integrates
Agent Skills, FTA Workflows, RAG, and intelligent routing.

Built on AgentScope and Higress for enterprise-grade agent orchestration.`,
}

// Execute runs the root command.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "",
		"config file (default is $HOME/.resolvenet/config.yaml)")
	rootCmd.PersistentFlags().String("server", "localhost:8080",
		"ResolveNet platform server address")

	_ = viper.BindPFlag("server", rootCmd.PersistentFlags().Lookup("server"))

	// Register subcommands
	rootCmd.AddCommand(agentcmd.NewCmd())
	rootCmd.AddCommand(skillcmd.NewCmd())
	rootCmd.AddCommand(workflowcmd.NewCmd())
	rootCmd.AddCommand(ragcmd.NewCmd())
	rootCmd.AddCommand(configcmd.NewCmd())
	rootCmd.AddCommand(newVersionCmd())
	rootCmd.AddCommand(newDashboardCmd())
	rootCmd.AddCommand(newServeCmd())
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		viper.AddConfigPath(home + "/.resolvenet")
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	viper.SetEnvPrefix("RESOLVENET")
	viper.AutomaticEnv()
	_ = viper.ReadInConfig()
}
