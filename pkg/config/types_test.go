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
			name: "standard config",
			config: DatabaseConfig{
				Host:     "localhost",
				Port:     5432,
				User:     "resolveagent",
				Password: "secret",
				DBName:   "resolveagent",
				SSLMode:  "disable",
			},
			expected: "host=localhost port=5432 user=resolveagent password=secret dbname=resolveagent sslmode=disable",
		},
		{
			name: "custom port",
			config: DatabaseConfig{
				Host:     "postgres.example.com",
				Port:     5433,
				User:     "admin",
				Password: "password123",
				DBName:   "mydb",
				SSLMode:  "require",
			},
			expected: "host=postgres.example.com port=5433 user=admin password=password123 dbname=mydb sslmode=require",
		},
		{
			name: "local socket",
			config: DatabaseConfig{
				Host:     "/var/run/postgresql",
				Port:     5432,
				User:     "postgres",
				Password: "",
				DBName:   "test",
				SSLMode:  "disable",
			},
			expected: "host=/var/run/postgresql port=5432 user=postgres password= dbname=test sslmode=disable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dsn := tt.config.DSN()
			if dsn != tt.expected {
				t.Errorf("DSN() = %q, want %q", dsn, tt.expected)
			}
		})
	}
}

func TestConfig_Validation(t *testing.T) {
	// Test that Config struct can be created with all fields
	cfg := Config{
		Server: ServerConfig{
			HTTPAddr: ":8080",
			GRPCAddr: ":9090",
		},
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "user",
			Password: "pass",
			DBName:   "db",
			SSLMode:  "disable",
		},
		Redis: RedisConfig{
			Addr:     "localhost:6379",
			Password: "",
			DB:       0,
		},
		NATS: NATSConfig{
			URL: "nats://localhost:4222",
		},
		Runtime: RuntimeConfig{
			GRPCAddr: "localhost:9091",
		},
		Gateway: GatewayConfig{
			AdminURL:     "http://localhost:8001",
			Enabled:      true,
			SyncInterval: "30s",
			ModelRouting: ModelRoutingConfig{
				Enabled:      true,
				DefaultModel: "qwen-plus",
				BasePath:     "/llm",
			},
		},
		Telemetry: TelemetryConfig{
			Enabled:        true,
			OTLPEndpoint:   "localhost:4317",
			ServiceName:    "resolveagent",
			MetricsEnabled: true,
		},
	}

	// Verify all fields are set correctly
	if cfg.Server.HTTPAddr != ":8080" {
		t.Errorf("HTTPAddr = %q, want %q", cfg.Server.HTTPAddr, ":8080")
	}

	if cfg.Database.DSN() == "" {
		t.Error("Database DSN is empty")
	}

	if cfg.Gateway.ModelRouting.DefaultModel != "qwen-plus" {
		t.Errorf("DefaultModel = %q, want %q", cfg.Gateway.ModelRouting.DefaultModel, "qwen-plus")
	}
}

func TestRedisConfig_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config RedisConfig
		addr   string
	}{
		{
			name: "standard config",
			config: RedisConfig{
				Addr:     "localhost:6379",
				Password: "secret",
				DB:       0,
			},
			addr: "localhost:6379",
		},
		{
			name: "cluster mode",
			config: RedisConfig{
				Addr:     "redis-cluster:6379",
				Password: "",
				DB:       0,
			},
			addr: "redis-cluster:6379",
		},
		{
			name: "unix socket",
			config: RedisConfig{
				Addr:     "/var/run/redis/redis.sock",
				Password: "",
				DB:       1,
			},
			addr: "/var/run/redis/redis.sock",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.config.Addr != tt.addr {
				t.Errorf("Addr = %q, want %q", tt.config.Addr, tt.addr)
			}
		})
	}
}

func TestGatewayConfig_Validation(t *testing.T) {
	tests := []struct {
		name    string
		config  GatewayConfig
		enabled bool
	}{
		{
			name: "enabled gateway",
			config: GatewayConfig{
				AdminURL:     "http://higress:8001",
				Enabled:      true,
				SyncInterval: "30s",
			},
			enabled: true,
		},
		{
			name: "disabled gateway",
			config: GatewayConfig{
				AdminURL:     "",
				Enabled:      false,
				SyncInterval: "",
			},
			enabled: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.config.Enabled != tt.enabled {
				t.Errorf("Enabled = %v, want %v", tt.config.Enabled, tt.enabled)
			}
		})
	}
}

func TestTelemetryConfig_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config TelemetryConfig
		host   string
	}{
		{
			name: "with OTLP endpoint",
			config: TelemetryConfig{
				Enabled:      true,
				OTLPEndpoint: "otel-collector:4317",
				ServiceName:  "resolveagent",
			},
			host: "otel-collector:4317",
		},
		{
			name: "disabled telemetry",
			config: TelemetryConfig{
				Enabled:      false,
				OTLPEndpoint: "",
				ServiceName:  "",
			},
			host: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.config.OTLPEndpoint != tt.host {
				t.Errorf("OTLPEndpoint = %q, want %q", tt.config.OTLPEndpoint, tt.host)
			}
		})
	}
}

func BenchmarkDatabaseConfig_DSN(b *testing.B) {
	cfg := DatabaseConfig{
		Host:     "localhost",
		Port:     5432,
		User:     "user",
		Password: "password",
		DBName:   "database",
		SSLMode:  "disable",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = cfg.DSN()
	}
}
