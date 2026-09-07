package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	pkgerrors "github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// MemoryRegistry implements registry.MemoryRegistry using PostgreSQL.
type MemoryRegistry struct {
	store *Store
}

// NewMemoryRegistry creates a new PostgreSQL-backed memory registry.
func NewMemoryRegistry(store *Store) *MemoryRegistry {
	return &MemoryRegistry{store: store}
}

// --- Short-term memory ---

// AddMessage inserts a conversation message, assigning the next sequence
// number when unset.
func (r *MemoryRegistry) AddMessage(ctx context.Context, msg *registry.ShortTermMemory) error {
	if msg.SequenceNum <= 0 {
		if err := r.store.pool.QueryRow(ctx, `
			SELECT COALESCE(MAX(sequence_num) + 1, 0)
			FROM memory_short_term WHERE conversation_id = $1
		`, msg.ConversationID).Scan(&msg.SequenceNum); err != nil {
			return err
		}
	}
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO memory_short_term (id, agent_id, conversation_id, role, content,
			token_count, metadata, sequence_num)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		msg.ID, msg.AgentID, msg.ConversationID, msg.Role, msg.Content,
		msg.TokenCount, msg.Metadata, msg.SequenceNum,
	)
	return err
}

// GetConversation returns a conversation's most recent messages (limit
// defaults to 200) in chronological order.
func (r *MemoryRegistry) GetConversation(ctx context.Context, conversationID string, limit int) ([]*registry.ShortTermMemory, error) {
	if limit <= 0 {
		limit = 200
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, agent_id, conversation_id, role, content, token_count,
			metadata, sequence_num, created_at
		FROM memory_short_term WHERE conversation_id = $1
		ORDER BY sequence_num DESC LIMIT $2
	`, conversationID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []*registry.ShortTermMemory
	for rows.Next() {
		var m registry.ShortTermMemory
		if err := rows.Scan(
			&m.ID, &m.AgentID, &m.ConversationID, &m.Role, &m.Content,
			&m.TokenCount, &m.Metadata, &m.SequenceNum, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		msgs = append(msgs, &m)
	}

	// Reverse to get chronological order (we queried DESC for LIMIT)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}

	return msgs, nil
}

// DeleteConversation removes all messages belonging to a conversation.
func (r *MemoryRegistry) DeleteConversation(ctx context.Context, conversationID string) error {
	_, err := r.store.pool.Exec(ctx,
		"DELETE FROM memory_short_term WHERE conversation_id = $1", conversationID,
	)
	return err
}

// ListConversations returns an agent's distinct conversation IDs ordered and
// paginated, with the total count.
func (r *MemoryRegistry) ListConversations(ctx context.Context, agentID string, opts registry.ListOptions) (convIDs []string, total int, err error) {
	err = r.store.pool.QueryRow(ctx,
		"SELECT COUNT(DISTINCT conversation_id) FROM memory_short_term WHERE agent_id = $1",
		agentID,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT DISTINCT conversation_id FROM memory_short_term
		WHERE agent_id = $1 ORDER BY conversation_id LIMIT $2 OFFSET $3
	`, agentID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		if scanErr := rows.Scan(&id); scanErr != nil {
			return nil, 0, scanErr
		}
		convIDs = append(convIDs, id)
	}
	return convIDs, total, nil
}

// --- Long-term memory ---

// StoreLongTermMemory inserts a long-term memory row.
func (r *MemoryRegistry) StoreLongTermMemory(ctx context.Context, mem *registry.LongTermMemory) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO memory_long_term (id, agent_id, user_id, memory_type, content,
			importance, access_count, source_conversations, embedding_id,
			metadata, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		mem.ID, mem.AgentID, nilIfEmpty(mem.UserID), mem.MemoryType, mem.Content,
		mem.Importance, mem.AccessCount, mem.SourceConversations, nilIfEmpty(mem.EmbeddingID),
		mem.Metadata, mem.ExpiresAt,
	)
	return err
}

// GetLongTermMemory scans the long-term memory row with the given ID,
// reporting not-found as an error.
func (r *MemoryRegistry) GetLongTermMemory(ctx context.Context, id string) (*registry.LongTermMemory, error) {
	var mem registry.LongTermMemory
	var userID, embeddingID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, agent_id, user_id, memory_type, content, importance, access_count,
			source_conversations, embedding_id, metadata, expires_at,
			last_accessed_at, created_at, updated_at
		FROM memory_long_term WHERE id = $1
	`, id).Scan(
		&mem.ID, &mem.AgentID, &userID, &mem.MemoryType, &mem.Content,
		&mem.Importance, &mem.AccessCount, &mem.SourceConversations,
		&embeddingID, &mem.Metadata, &mem.ExpiresAt,
		&mem.LastAccessedAt, &mem.CreatedAt, &mem.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pkgerrors.NotFound("long-term memory", id)
		}
		return nil, err
	}
	if userID != nil {
		mem.UserID = *userID
	}
	if embeddingID != nil {
		mem.EmbeddingID = *embeddingID
	}
	return &mem, nil
}

// SearchLongTermMemory returns non-expired memories of an agent filtered by
// user and type, ordered by importance and paginated, with the total count.
func (r *MemoryRegistry) SearchLongTermMemory(ctx context.Context, agentID, userID, memoryType string, opts registry.ListOptions) ([]*registry.LongTermMemory, int, error) {
	// Build dynamic query
	baseWhere := "WHERE agent_id = $1 AND (expires_at IS NULL OR expires_at > NOW())"
	args := []interface{}{agentID}
	argIdx := 2

	if userID != "" {
		baseWhere += fmt.Sprintf(" AND user_id = $%d", argIdx)
		args = append(args, userID)
		argIdx++
	}
	if memoryType != "" {
		baseWhere += fmt.Sprintf(" AND memory_type = $%d", argIdx)
		args = append(args, memoryType)
		argIdx++
	}

	var total int
	countSQL := "SELECT COUNT(*) FROM memory_long_term " + baseWhere
	if err := r.store.pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	querySQL := fmt.Sprintf(`
		SELECT id, agent_id, user_id, memory_type, content, importance, access_count,
			source_conversations, embedding_id, metadata, expires_at,
			last_accessed_at, created_at, updated_at
		FROM memory_long_term %s
		ORDER BY importance DESC LIMIT $%d OFFSET $%d
	`, baseWhere, argIdx, argIdx+1)
	args = append(args, limit, opts.Offset)

	rows, err := r.store.pool.Query(ctx, querySQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var memories []*registry.LongTermMemory
	for rows.Next() {
		var m registry.LongTermMemory
		var uid, eid *string
		if err := rows.Scan(
			&m.ID, &m.AgentID, &uid, &m.MemoryType, &m.Content,
			&m.Importance, &m.AccessCount, &m.SourceConversations,
			&eid, &m.Metadata, &m.ExpiresAt,
			&m.LastAccessedAt, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if uid != nil {
			m.UserID = *uid
		}
		if eid != nil {
			m.EmbeddingID = *eid
		}
		memories = append(memories, &m)
	}
	return memories, total, nil
}

// UpdateLongTermMemory overwrites the long-term memory row, reporting an
// error when the ID is absent.
func (r *MemoryRegistry) UpdateLongTermMemory(ctx context.Context, mem *registry.LongTermMemory) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE memory_long_term SET agent_id=$2, user_id=$3, memory_type=$4, content=$5,
			importance=$6, access_count=$7, source_conversations=$8, embedding_id=$9,
			metadata=$10, expires_at=$11
		WHERE id = $1
	`,
		mem.ID, mem.AgentID, nilIfEmpty(mem.UserID), mem.MemoryType, mem.Content,
		mem.Importance, mem.AccessCount, mem.SourceConversations,
		nilIfEmpty(mem.EmbeddingID), mem.Metadata, mem.ExpiresAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.NotFound("long-term memory", mem.ID)
	}
	return nil
}

// DeleteLongTermMemory removes the long-term memory row with the given ID.
func (r *MemoryRegistry) DeleteLongTermMemory(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM memory_long_term WHERE id = $1", id)
	return err
}

// IncrementAccessCount bumps a long-term memory's access counter and
// refreshes its last-accessed time, reporting an error when the ID is absent.
func (r *MemoryRegistry) IncrementAccessCount(ctx context.Context, id string) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE memory_long_term SET access_count = access_count + 1, last_accessed_at = $2
		WHERE id = $1
	`, id, time.Now())
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.NotFound("long-term memory", id)
	}
	return nil
}

// PruneExpiredMemories deletes expired long-term memories and returns how
// many rows were removed.
func (r *MemoryRegistry) PruneExpiredMemories(ctx context.Context) (int, error) {
	tag, err := r.store.pool.Exec(ctx,
		"DELETE FROM memory_long_term WHERE expires_at IS NOT NULL AND expires_at < NOW()",
	)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
