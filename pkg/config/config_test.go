package config

import (
	"testing"
)

func TestDatabaseConfig_DSN(t *testing.T) {
	tests := []struct {
		name     string
		config   DatabaseConfig
		expected string
	}{
		{
			name: "default values",
			config: DatabaseConfig{
				Host:     "localhost",
				Port:     5432,
				User:     "postgres",
				Password: "password",
				Database: "resolveagent",
				SSLMode:  "disable",
			},
			expected: "postgres://postgres:password@localhost:5432/resolveagent?sslmode=disable",
		},
		{
			name: "with ssl mode require",
			config: DatabaseConfig{
				Host:     "localhost",
				Port:     5432,
				User:     "postgres",
				Password: "password",
				Database: "resolveagent",
				SSLMode:  "require",
			},
			expected: "postgres://postgres:password@localhost:5432/resolveagent?sslmode=require",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.config.DSN()
			if got != tt.expected {
				t.Errorf("DSN() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestLoad(t *testing.T) {
	// Test loading config with defaults
	cfg, err := Load("")
	if err != nil {
		t.Errorf("Load() error = %v", err)
	}

	if cfg == nil {
		t.Error("Load() returned nil config")
		return
	}

	// Check default values
	if cfg.Server.HTTPAddr != ":8080" {
		t.Errorf("Expected default HTTPAddr :8080, got %s", cfg.Server.HTTPAddr)
	}

	if cfg.Server.GRPCAddr != ":9090" {
		t.Errorf("Expected default GRPCAddr :9090, got %s", cfg.Server.GRPCAddr)
	}

	if cfg.Database.Host != "localhost" {
		t.Errorf("Expected default Database Host localhost, got %s", cfg.Database.Host)
	}
}

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg == nil {
		t.Fatal("DefaultConfig() returned nil")
	}

	// Verify default server config
	if cfg.Server.HTTPAddr != ":8080" {
		t.Errorf("Expected HTTPAddr :8080, got %s", cfg.Server.HTTPAddr)
	}

	// Verify default database config
	if cfg.Database.Port != 5432 {
		t.Errorf("Expected Database Port 5432, got %d", cfg.Database.Port)
	}

	// Verify default Redis config
	if cfg.Redis.Addr != "localhost:6379" {
		t.Errorf("Expected Redis Addr localhost:6379, got %s", cfg.Redis.Addr)
	}
}
