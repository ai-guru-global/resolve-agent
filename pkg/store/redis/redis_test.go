package redis

import (
	"log/slog"
	"testing"
)

func TestNew(t *testing.T) {
	// New requires a running Redis instance; test error case with invalid address.
	logger := slog.Default()
	_, err := New("localhost:63799", "", 0, logger)
	if err == nil {
		t.Skip("Redis is available on localhost:63799; skipping error test")
	}
}

func TestCache_Struct(t *testing.T) {
	c := &Cache{
		addr:     "localhost:6379",
		password: "",
		db:       0,
	}
	if c.addr != "localhost:6379" {
		t.Errorf("expected addr 'localhost:6379', got %q", c.addr)
	}
	if c.db != 0 {
		t.Errorf("expected db 0, got %d", c.db)
	}
}
