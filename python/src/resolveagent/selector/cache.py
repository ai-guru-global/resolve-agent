"""Route decision caching with TTL-aware LRU eviction.

Supports two scope modes:
- ``"instance"``: Each IntelligentSelector owns its own cache.
- ``"global"``: A module-level singleton shared across all selectors.
"""

from __future__ import annotations

import hashlib
import threading
import time
from collections import OrderedDict
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from resolveagent.selector.selector import RouteDecision


class RouteDecisionCache:
    """TTL-aware LRU cache for RouteDecision objects.

    Args:
        max_size: Maximum number of cached entries.
        ttl_seconds: Time-to-live in seconds for each entry.
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: float = 300.0) -> None:
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple[RouteDecision, float]] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    @staticmethod
    def make_key(input_text: str, agent_id: str, strategy: str) -> str:
        """Create a deterministic cache key."""
        raw = f"{input_text}|{agent_id}|{strategy}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, key: str) -> RouteDecision | None:
        """Retrieve a cached decision if it exists and is not expired."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                return None
            decision, created_at = entry
            if time.monotonic() - created_at > self.ttl_seconds:
                # Expired -- remove and treat as miss
                del self._cache[key]
                self._misses += 1
                return None
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1
            return decision

    def put(self, key: str, decision: RouteDecision) -> None:
        """Store a decision in the cache, evicting LRU entries if needed."""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = (decision, time.monotonic())
            else:
                if len(self._cache) >= self.max_size:
                    self._cache.popitem(last=False)  # Evict oldest
                self._cache[key] = (decision, time.monotonic())

    def invalidate(self, key: str) -> bool:
        """Remove a specific entry. Returns True if it existed."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def clear(self) -> None:
        """Remove all entries."""
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def cache_stats(self) -> dict[str, Any]:
        """Return hit/miss/size statistics."""
        with self._lock:
            total = self._hits + self._misses
            return {
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": self._hits / total if total > 0 else 0.0,
                "size": len(self._cache),
                "max_size": self.max_size,
                "ttl_seconds": self.ttl_seconds,
            }


# Module-level singleton for ``"global"`` scope mode.
_global_cache: RouteDecisionCache | None = None
_global_cache_lock = threading.Lock()


def get_global_cache(
    max_size: int = 1000, ttl_seconds: float = 300.0
) -> RouteDecisionCache:
    """Return (and lazily create) the module-level singleton cache."""
    global _global_cache
    with _global_cache_lock:
        if _global_cache is None:
            _global_cache = RouteDecisionCache(
                max_size=max_size, ttl_seconds=ttl_seconds
            )
        return _global_cache
