package config

import "strconv"

// Config holds the complete platform configuration.
type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	Database  DatabaseConfig  `mapstructure:"database"`
	Redis     RedisConfig     `mapstructure:"redis"`
	NATS      NATSConfig      `mapstructure:"nats"`
	Runtime   RuntimeConfig   `mapstructure:"runtime"`
	Gateway   GatewayConfig   `mapstructure:"gateway"`
	Telemetry TelemetryConfig `mapstructure:"telemetry"`
}

// ServerConfig holds HTTP/gRPC server settings.
type ServerConfig struct {
	HTTPAddr    string `mapstructure:"http_addr"`
	GRPCAddr    string `mapstructure:"grpc_addr"`
	RuntimeAddr string `mapstructure:"runtime_addr"` // Python runtime HTTP address
}

// DatabaseConfig holds PostgreSQL settings.
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

// DSN returns the PostgreSQL connection string.
func (d DatabaseConfig) DSN() string {
	return "host=" + d.Host +
		" port=" + strconv.Itoa(d.Port) +
		" user=" + d.User +
		" password=" + d.Password +
		" dbname=" + d.DBName +
		" sslmode=" + d.SSLMode
}

// RedisConfig holds Redis settings.
type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

// NATSConfig holds NATS settings.
type NATSConfig struct {
	URL string `mapstructure:"url"`
}

// RuntimeConfig holds agent runtime connection settings.
type RuntimeConfig struct {
	GRPCAddr string `mapstructure:"grpc_addr"`
}

// GatewayConfig holds Higress gateway settings.
type GatewayConfig struct {
	AdminURL     string             `mapstructure:"admin_url"`
	Enabled      bool               `mapstructure:"enabled"`
	SyncInterval string             `mapstructure:"sync_interval"` // Route sync interval (e.g., "30s")
	ModelRouting ModelRoutingConfig `mapstructure:"model_routing"`
	Auth         GatewayAuthConfig  `mapstructure:"auth"`
	LoadBalancer LoadBalancerConfig `mapstructure:"load_balancer"`
}

// ModelRoutingConfig configures LLM model routing through Higress.
type ModelRoutingConfig struct {
	Enabled      bool   `mapstructure:"enabled"`
	DefaultModel string `mapstructure:"default_model"`
	BasePath     string `mapstructure:"base_path"` // API base path for LLM routes (e.g., "/llm")
}

// GatewayAuthConfig configures authentication at the gateway level.
type GatewayAuthConfig struct {
	Enabled     bool     `mapstructure:"enabled"`
	JWTSecret   string   `mapstructure:"jwt_secret"`
	JWTIssuer   string   `mapstructure:"jwt_issuer"`
	APIKeyNames []string `mapstructure:"api_key_names"` // Header names for API keys
}

// LoadBalancerConfig configures load balancing strategy.
type LoadBalancerConfig struct {
	Strategy       string `mapstructure:"strategy"` // "round_robin", "least_conn", "random"
	HealthCheck    bool   `mapstructure:"health_check"`
	CheckInterval  string `mapstructure:"check_interval"`
	UnhealthyCount int    `mapstructure:"unhealthy_count"`
}

// TelemetryConfig holds observability settings.
type TelemetryConfig struct {
	Enabled        bool   `mapstructure:"enabled"`
	OTLPEndpoint   string `mapstructure:"otlp_endpoint"`
	ServiceName    string `mapstructure:"service_name"`
	MetricsEnabled bool   `mapstructure:"metrics_enabled"`
}
