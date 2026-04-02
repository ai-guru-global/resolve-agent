package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache implements caching using Redis.
type Cache struct {
	addr     string
	password string
	db       int
	logger   *slog.Logger
	client   *redis.Client
}

// New creates a new Redis cache.
func New(addr string, password string, db int, logger *slog.Logger) (*Cache, error) {
	c := &Cache{
		addr:     addr,
		password: password,
		db:       db,
		logger:   logger,
	}

	if err := c.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	c.logger.Info("Redis cache initialized", "addr", addr)
	return c, nil
}

// connect establishes connection to Redis.
func (c *Cache) connect() error {
	c.client = redis.NewClient(&redis.Options{
		Addr:     c.addr,
		Password: c.password,
		DB:       c.db,
		PoolSize: 10,
	})

	// Test connection
	ctx := context.Background()
	if err := c.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping redis: %w", err)
	}

	return nil
}

// Health checks the Redis connection.
func (c *Cache) Health(ctx context.Context) error {
	if c.client == nil {
		return fmt.Errorf("not connected")
	}

	if err := c.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	return nil
}

// Close releases the Redis client.
func (c *Cache) Close() error {
	if c.client != nil {
		if err := c.client.Close(); err != nil {
			return err
		}
		c.logger.Info("Redis connection closed")
	}
	return nil
}

// Get retrieves a value by key.
func (c *Cache) Get(ctx context.Context, key string) (string, error) {
	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found: %s", key)
	}
	if err != nil {
		return "", fmt.Errorf("failed to get key: %w", err)
	}
	return val, nil
}

// Set stores a value with optional expiration.
func (c *Cache) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	if err := c.client.Set(ctx, key, value, expiration).Err(); err != nil {
		return fmt.Errorf("failed to set key: %w", err)
	}
	return nil
}

// Delete removes a key.
func (c *Cache) Delete(ctx context.Context, key string) error {
	if err := c.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete key: %w", err)
	}
	return nil
}

// Exists checks if a key exists.
func (c *Cache) Exists(ctx context.Context, key string) (bool, error) {
	n, err := c.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check key: %w", err)
	}
	return n > 0, nil
}

// GetJSON retrieves and unmarshals a JSON value.
func (c *Cache) GetJSON(ctx context.Context, key string, dest interface{}) error {
	val, err := c.Get(ctx, key)
	if err != nil {
		return err
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return fmt.Errorf("failed to unmarshal json: %w", err)
	}
	return nil
}

// SetJSON marshals and stores a value.
func (c *Cache) SetJSON(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal json: %w", err)
	}

	return c.Set(ctx, key, string(data), expiration)
}
