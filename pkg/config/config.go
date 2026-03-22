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
	v.SetDefault("database.user", "resolvenet")
	v.SetDefault("database.password", "resolvenet")
	v.SetDefault("database.dbname", "resolvenet")
	v.SetDefault("database.sslmode", "disable")
	v.SetDefault("redis.addr", "localhost:6379")
	v.SetDefault("redis.db", 0)
	v.SetDefault("nats.url", "nats://localhost:4222")
	v.SetDefault("runtime.grpc_addr", "localhost:9091")
	v.SetDefault("gateway.admin_url", "http://localhost:8888")
	v.SetDefault("gateway.enabled", false)
	v.SetDefault("telemetry.enabled", false)
	v.SetDefault("telemetry.service_name", "resolvenet-platform")
	v.SetDefault("telemetry.metrics_enabled", true)

	// Config file
	if configPath != "" {
		v.SetConfigFile(configPath)
	} else {
		v.SetConfigName("resolvenet")
		v.SetConfigType("yaml")
		v.AddConfigPath(".")
		v.AddConfigPath("/etc/resolvenet")
		v.AddConfigPath("$HOME/.resolvenet")
	}

	// Environment variables
	v.SetEnvPrefix("RESOLVENET")
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
