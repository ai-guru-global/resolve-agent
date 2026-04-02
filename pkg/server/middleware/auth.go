package middleware

import (
	"context"
	"crypto/subtle"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AuthConfig holds authentication configuration.
type AuthConfig struct {
	Enabled     bool     `mapstructure:"enabled"`
	JWTSecret   string   `mapstructure:"jwt_secret"`
	JWTIssuer   string   `mapstructure:"jwt_issuer"`
	APIKeyNames []string `mapstructure:"api_key_names"`
	SkipPaths   []string `mapstructure:"skip_paths"`
}

// DefaultAuthConfig returns default authentication configuration.
func DefaultAuthConfig() AuthConfig {
	return AuthConfig{
		Enabled:     false,
		JWTIssuer:   "resolveagent",
		APIKeyNames: []string{"X-API-Key", "Authorization"},
		SkipPaths:   []string{"/health", "/ready", "/metrics"},
	}
}

// AuthMiddleware provides unified authentication for the platform.
type AuthMiddleware struct {
	config  AuthConfig
	logger  *slog.Logger
	apiKeys map[string]APIKeyInfo
}

// APIKeyInfo holds information about an API key.
type APIKeyInfo struct {
	Key       string
	Name      string
	UserID    string
	Roles     []string
	RateLimit int
	ExpiresAt time.Time
}

// AuthContext holds authenticated user information.
type AuthContext struct {
	UserID    string
	Username  string
	Roles     []string
	AuthType  string
	ExpiresAt time.Time
}

type authContextKey struct{}

// NewAuthMiddleware creates a new authentication middleware.
func NewAuthMiddleware(config AuthConfig, logger *slog.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		config:  config,
		logger:  logger,
		apiKeys: make(map[string]APIKeyInfo),
	}
}

// RegisterAPIKey registers an API key for authentication.
func (m *AuthMiddleware) RegisterAPIKey(key APIKeyInfo) {
	m.apiKeys[key.Key] = key
}

// Middleware returns the HTTP middleware function.
func (m *AuthMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if m.shouldSkip(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		if !m.config.Enabled {
			next.ServeHTTP(w, r)
			return
		}

		authCtx, err := m.authenticate(r)
		if err != nil {
			m.logger.Warn("Authentication failed",
				"path", r.URL.Path,
				"method", r.Method,
				"error", err,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), authContextKey{}, authCtx)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (m *AuthMiddleware) shouldSkip(path string) bool {
	for _, skip := range m.config.SkipPaths {
		if strings.HasPrefix(path, skip) {
			return true
		}
	}
	return false
}

func (m *AuthMiddleware) authenticate(r *http.Request) (*AuthContext, error) {
	if user := r.Header.Get("X-Auth-User"); user != "" {
		return m.authFromGatewayHeaders(r)
	}

	if authHeader := r.Header.Get("Authorization"); authHeader != "" {
		if strings.HasPrefix(authHeader, "Bearer ") {
			return m.authFromJWT(authHeader[7:])
		}
	}

	for _, keyName := range m.config.APIKeyNames {
		if key := r.Header.Get(keyName); key != "" {
			return m.authFromAPIKey(key)
		}
	}

	return nil, fmt.Errorf("no valid authentication provided")
}

func (m *AuthMiddleware) authFromGatewayHeaders(r *http.Request) (*AuthContext, error) {
	user := r.Header.Get("X-Auth-User")
	if user == "" {
		return nil, fmt.Errorf("missing X-Auth-User header")
	}

	roles := strings.Split(r.Header.Get("X-Auth-Roles"), ",")
	for i := range roles {
		roles[i] = strings.TrimSpace(roles[i])
	}

	return &AuthContext{
		UserID:   user,
		Username: user,
		Roles:    roles,
		AuthType: "gateway",
	}, nil
}

func (m *AuthMiddleware) authFromJWT(tokenStr string) (*AuthContext, error) {
	if m.config.JWTSecret == "" {
		return nil, fmt.Errorf("JWT authentication not configured")
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(m.config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid JWT: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid JWT claims")
	}

	if m.config.JWTIssuer != "" {
		if iss, _ := claims["iss"].(string); iss != m.config.JWTIssuer {
			return nil, fmt.Errorf("invalid JWT issuer")
		}
	}

	userID, _ := claims["sub"].(string)
	username, _ := claims["name"].(string)
	if username == "" {
		username = userID
	}

	var roles []string
	if rolesRaw, ok := claims["roles"].([]interface{}); ok {
		for _, r := range rolesRaw {
			if role, ok := r.(string); ok {
				roles = append(roles, role)
			}
		}
	}

	var expiresAt time.Time
	if exp, ok := claims["exp"].(float64); ok {
		expiresAt = time.Unix(int64(exp), 0)
	}

	return &AuthContext{
		UserID:    userID,
		Username:  username,
		Roles:     roles,
		AuthType:  "jwt",
		ExpiresAt: expiresAt,
	}, nil
}

func (m *AuthMiddleware) authFromAPIKey(key string) (*AuthContext, error) {
	key = strings.TrimPrefix(key, "Bearer ")

	keyInfo, ok := m.apiKeys[key]
	if !ok {
		return nil, fmt.Errorf("invalid API key")
	}

	if !keyInfo.ExpiresAt.IsZero() && time.Now().After(keyInfo.ExpiresAt) {
		return nil, fmt.Errorf("API key expired")
	}

	return &AuthContext{
		UserID:    keyInfo.UserID,
		Username:  keyInfo.Name,
		Roles:     keyInfo.Roles,
		AuthType:  "apikey",
		ExpiresAt: keyInfo.ExpiresAt,
	}, nil
}

// GetAuthContext extracts auth context from request context.
func GetAuthContext(ctx context.Context) *AuthContext {
	if auth, ok := ctx.Value(authContextKey{}).(*AuthContext); ok {
		return auth
	}
	return nil
}

// HasRole checks if the authenticated user has a specific role.
func HasRole(ctx context.Context, role string) bool {
	auth := GetAuthContext(ctx)
	if auth == nil {
		return false
	}
	for _, r := range auth.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// GenerateJWT generates a JWT token for a user.
func (m *AuthMiddleware) GenerateJWT(userID, username string, roles []string, duration time.Duration) (string, error) {
	if m.config.JWTSecret == "" {
		return "", fmt.Errorf("JWT secret not configured")
	}

	claims := jwt.MapClaims{
		"sub":   userID,
		"name":  username,
		"roles": roles,
		"iss":   m.config.JWTIssuer,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(duration).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.config.JWTSecret))
}

// ValidateAPIKey validates an API key using constant-time comparison.
func ValidateAPIKey(provided, expected string) bool {
	return subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}
