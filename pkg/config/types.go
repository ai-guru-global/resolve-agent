package config

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
	HTTPAddr string `mapstructure:"http_addr"`
	GRPCAddr string `mapstructure:"grpc_addr"`
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
		" port=" + string(rune(d.Port)) +
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
	AdminURL string `mapstructure:"admin_url"`
	Enabled  bool   `mapstructure:"enabled"`
}

// TelemetryConfig holds observability settings.
type TelemetryConfig struct {
	Enabled        bool   `mapstructure:"enabled"`
	OTLPEndpoint   string `mapstructure:"otlp_endpoint"`
	ServiceName    string `mapstructure:"service_name"`
	MetricsEnabled bool   `mapstructure:"metrics_enabled"`
}
