package registry

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// ShortTermMemory represents a single conversation message entry.
type ShortTermMemory struct {
	ID             string         `json:"id"`
	AgentID        string         `json:"agent_id"`
	ConversationID string         `json:"conversation_id"`
	Role           string         `json:"role"` // "system", "user", "assistant", "tool"
	Content        string         `json:"content"`
	TokenCount     int            `json:"token_count"`
	Metadata       map[string]any `json:"metadata"`
	SequenceNum    int            `json:"sequence_num"`
	CreatedAt      time.Time      `json:"created_at"`
}

// LongTermMemory represents a cross-session memory entry.
type LongTermMemory struct {
	ID                  string         `json:"id"`
	AgentID             string         `json:"agent_id"`
	UserID              string         `json:"user_id"`
	MemoryType          string         `json:"memory_type"` // "summary", "preference", "pattern", "fact", "skill_learned"
	Content             string         `json:"content"`
	Importance          float64        `json:"importance"` // 0.0 - 1.0
	AccessCount         int            `json:"access_count"`
	SourceConversations []string       `json:"source_conversations"`
	EmbeddingID         string         `json:"embedding_id"`
	Metadata            map[string]any `json:"metadata"`
	ExpiresAt           *time.Time     `json:"expires_at"`
	LastAccessedAt      time.Time      `json:"last_accessed_at"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
}

// MemoryRegistry manages short-term and long-term agent memory.
type MemoryRegistry interface {
	// Short-term memory (conversation history)
	AddMessage(ctx context.Context, msg *ShortTermMemory) error
	GetConversation(ctx context.Context, conversationID string, limit int) ([]*ShortTermMemory, error)
	DeleteConversation(ctx context.Context, conversationID string) error
	ListConversations(ctx context.Context, agentID string, opts ListOptions) ([]string, int, error)

	// Long-term memory (cross-session knowledge)
	StoreLongTermMemory(ctx context.Context, mem *LongTermMemory) error
	GetLongTermMemory(ctx context.Context, id string) (*LongTermMemory, error)
	SearchLongTermMemory(ctx context.Context, agentID string, userID string, memoryType string, opts ListOptions) ([]*LongTermMemory, int, error)
	UpdateLongTermMemory(ctx context.Context, mem *LongTermMemory) error
	DeleteLongTermMemory(ctx context.Context, id string) error
	IncrementAccessCount(ctx context.Context, id string) error

	// Maintenance
	PruneExpiredMemories(ctx context.Context) (int, error)
}

// InMemoryMemoryRegistry is an in-memory implementation for development.
type InMemoryMemoryRegistry struct {
	mu        sync.RWMutex
	shortTerm map[string]*ShortTermMemory // keyed by ID
	longTerm  map[string]*LongTermMemory  // keyed by ID
}

// NewInMemoryMemoryRegistry creates a new in-memory memory registry.
func NewInMemoryMemoryRegistry() *InMemoryMemoryRegistry {
	return &InMemoryMemoryRegistry{
		shortTerm: make(map[string]*ShortTermMemory),
		longTerm:  make(map[string]*LongTermMemory),
	}
}

func (r *InMemoryMemoryRegistry) AddMessage(_ context.Context, msg *ShortTermMemory) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	msg.CreatedAt = time.Now()
	r.shortTerm[msg.ID] = msg
	return nil
}

func (r *InMemoryMemoryRegistry) GetConversation(_ context.Context, conversationID string, limit int) ([]*ShortTermMemory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var msgs []*ShortTermMemory
	for _, m := range r.shortTerm {
		if m.ConversationID == conversationID {
			msgs = append(msgs, m)
		}
	}

	// Sort by sequence number
	sort.Slice(msgs, func(i, j int) bool {
		return msgs[i].SequenceNum < msgs[j].SequenceNum
	})

	if limit > 0 && len(msgs) > limit {
		msgs = msgs[len(msgs)-limit:]
	}

	return msgs, nil
}

func (r *InMemoryMemoryRegistry) DeleteConversation(_ context.Context, conversationID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for id, m := range r.shortTerm {
		if m.ConversationID == conversationID {
			delete(r.shortTerm, id)
		}
	}
	return nil
}

func (r *InMemoryMemoryRegistry) ListConversations(_ context.Context, agentID string, opts ListOptions) ([]string, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	seen := make(map[string]bool)
	for _, m := range r.shortTerm {
		if m.AgentID == agentID {
			seen[m.ConversationID] = true
		}
	}

	convIDs := make([]string, 0, len(seen))
	for id := range seen {
		convIDs = append(convIDs, id)
	}
	sort.Strings(convIDs)

	total := len(convIDs)
	if offset >= total {
		return []string{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return convIDs[offset:end], total, nil
}

func (r *InMemoryMemoryRegistry) StoreLongTermMemory(_ context.Context, mem *LongTermMemory) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	mem.CreatedAt = now
	mem.UpdatedAt = now
	mem.LastAccessedAt = now
	if mem.Importance == 0 {
		mem.Importance = 0.5
	}

	r.longTerm[mem.ID] = mem
	return nil
}

func (r *InMemoryMemoryRegistry) GetLongTermMemory(_ context.Context, id string) (*LongTermMemory, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	mem, ok := r.longTerm[id]
	if !ok {
		return nil, fmt.Errorf("long-term memory %s not found", id)
	}
	return mem, nil
}

func (r *InMemoryMemoryRegistry) SearchLongTermMemory(_ context.Context, agentID string, userID string, memoryType string, opts ListOptions) ([]*LongTermMemory, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var results []*LongTermMemory
	for _, m := range r.longTerm {
		if m.AgentID != agentID {
			continue
		}
		if userID != "" && m.UserID != userID {
			continue
		}
		if memoryType != "" && m.MemoryType != memoryType {
			continue
		}
		// Skip expired memories
		if m.ExpiresAt != nil && m.ExpiresAt.Before(time.Now()) {
			continue
		}
		results = append(results, m)
	}

	// Sort by importance (descending)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Importance > results[j].Importance
	})

	total := len(results)
	if offset >= total {
		return []*LongTermMemory{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], total, nil
}

func (r *InMemoryMemoryRegistry) UpdateLongTermMemory(_ context.Context, mem *LongTermMemory) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.longTerm[mem.ID]; !exists {
		return fmt.Errorf("long-term memory %s not found", mem.ID)
	}

	mem.UpdatedAt = time.Now()
	r.longTerm[mem.ID] = mem
	return nil
}

func (r *InMemoryMemoryRegistry) DeleteLongTermMemory(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.longTerm, id)
	return nil
}

func (r *InMemoryMemoryRegistry) IncrementAccessCount(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	mem, ok := r.longTerm[id]
	if !ok {
		return fmt.Errorf("long-term memory %s not found", id)
	}

	mem.AccessCount++
	mem.LastAccessedAt = time.Now()
	return nil
}

func (r *InMemoryMemoryRegistry) PruneExpiredMemories(_ context.Context) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	pruned := 0
	for id, m := range r.longTerm {
		if m.ExpiresAt != nil && m.ExpiresAt.Before(now) {
			delete(r.longTerm, id)
			pruned++
		}
	}
	return pruned, nil
}
