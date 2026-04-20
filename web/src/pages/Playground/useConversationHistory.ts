import { useState, useCallback, useEffect } from 'react';

export interface ConversationRecord {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; metadata?: Record<string, unknown> }[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'resolveagent-conversation-history';
const MAX_HISTORY = 50;

function loadFromStorage(): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: ConversationRecord[]) {
  try {
    // Keep only the most recent records
    const trimmed = records.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Hook for managing conversation history with localStorage persistence.
 * Records are sorted by updatedAt descending (most recent first).
 */
export function useConversationHistory() {
  const [history, setHistory] = useState<ConversationRecord[]>(() => loadFromStorage());

  // Sync to localStorage whenever history changes
  useEffect(() => {
    saveToStorage(history);
  }, [history]);

  /** Save or update a conversation record */
  const saveConversation = useCallback(
    (record: Omit<ConversationRecord, 'updatedAt'> & { updatedAt?: string }) => {
      setHistory((prev) => {
        const now = new Date().toISOString();
        const updated: ConversationRecord = {
          ...record,
          updatedAt: record.updatedAt ?? now,
          createdAt: record.createdAt || now,
        };

        const idx = prev.findIndex((r) => r.id === record.id);
        let next: ConversationRecord[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = updated;
        } else {
          next = [updated, ...prev];
        }

        // Sort by updatedAt descending
        next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return next.slice(0, MAX_HISTORY);
      });
    },
    [],
  );

  /** Delete a conversation by id */
  const deleteConversation = useCallback((id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /** Get a conversation by id */
  const getConversation = useCallback(
    (id: string): ConversationRecord | undefined => {
      return history.find((r) => r.id === id);
    },
    [history],
  );

  /** Get conversations filtered by agentId */
  const getByAgent = useCallback(
    (agentId: string): ConversationRecord[] => {
      return history.filter((r) => r.agentId === agentId);
    },
    [history],
  );

  /** Clear all history */
  const clearAll = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    saveConversation,
    deleteConversation,
    getConversation,
    getByAgent,
    clearAll,
  };
}
