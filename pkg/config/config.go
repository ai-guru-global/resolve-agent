package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Load reads configuration from file and environment.
func Load(configPath string) (*Config, error) {
	v := viper.New()

	// Set defaults
	v.SetDefault("server.http_addr", ":8080")
	v.SetDefault("server.grpc_addr", ":9090")
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "resolveagent")
	v.SetDefault("database.password", "resolveagent")
	v.SetDefault("database.dbname", "resolveagent")
	v.SetDefault("database.sslmode", "disable")
	v.SetDefault("redis.addr", "localhost:6379")
	v.SetDefault("redis.db", 0)
	v.SetDefault("nats.url", "nats://localhost:4222")
	v.SetDefault("runtime.grpc_addr", "localhost:9091")
	v.SetDefault("gateway.admin_url", "http://localhost:8888")
	v.SetDefault("gateway.enabled", false)
	v.SetDefault("gateway.sync_interval", "30s")
	v.SetDefault("gateway.model_routing.enabled", true)
	v.SetDefault("gateway.model_routing.default_model", "qwen-plus")
	v.SetDefault("gateway.model_routing.base_path", "/llm")
	v.SetDefault("gateway.auth.enabled", false)
	v.SetDefault("gateway.auth.jwt_issuer", "resolveagent")
	v.SetDefault("gateway.load_balancer.strategy", "round_robin")
	v.SetDefault("gateway.load_balancer.health_check", true)
	v.SetDefault("gateway.load_balancer.check_interval", "10s")
	v.SetDefault("gateway.load_balancer.unhealthy_count", 3)
	v.SetDefault("telemetry.enabled", false)
	v.SetDefault("telemetry.service_name", "resolveagent-platform")
	v.SetDefault("telemetry.metrics_enabled", true)

	// Config file
	if configPath != "" {
		v.SetConfigFile(configPath)
	} else {
		v.SetConfigName("resolveagent")
		v.SetConfigType("yaml")
		v.AddConfigPath(".")
		v.AddConfigPath("/etc/resolveagent")
		v.AddConfigPath("$HOME/.resolveagent")
	}

	// Environment variables
	v.SetEnvPrefix("RESOLVEAGENT")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read config file (ignore file not found)
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config: %w", err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	return &cfg, nil
}
