"""Unit tests for RouteDecisionCache."""

import time

import pytest

from resolveagent.selector.cache import RouteDecisionCache, get_global_cache
from resolveagent.selector.selector import RouteDecision


class TestRouteDecisionCache:
    """Tests for the TTL-aware LRU cache."""

    @pytest.fixture
    def cache(self):
        return RouteDecisionCache(max_size=5, ttl_seconds=2.0)

    @pytest.fixture
    def decision(self):
        return RouteDecision(
            route_type="skill",
            route_target="web-search",
            confidence=0.9,
            reasoning="test",
        )

    def test_put_and_get(self, cache, decision):
        """Test basic put/get."""
        key = RouteDecisionCache.make_key("hello", "agent", "hybrid")
        cache.put(key, decision)
        result = cache.get(key)
        assert result is not None
        assert result.route_type == "skill"
        assert result.confidence == 0.9

    def test_cache_miss(self, cache):
        """Test get on nonexistent key returns None."""
        result = cache.get("nonexistent")
        assert result is None

    def test_ttl_expiry(self):
        """Test that entries expire after TTL."""
        cache = RouteDecisionCache(max_size=10, ttl_seconds=0.1)
        decision = RouteDecision(route_type="rag", confidence=0.8)
        key = "expire-test"
        cache.put(key, decision)

        assert cache.get(key) is not None
        time.sleep(0.15)
        assert cache.get(key) is None

    def test_lru_eviction(self, cache):
        """Test that LRU eviction works when max_size is reached."""
        for i in range(6):
            cache.put(f"key-{i}", RouteDecision(route_type="direct", confidence=0.1 * i))

        # key-0 should have been evicted (oldest)
        assert cache.get("key-0") is None
        # key-5 (newest) should still be there
        assert cache.get("key-5") is not None

    def test_lru_access_refreshes(self, cache):
        """Test that accessing an entry moves it to most-recently-used."""
        for i in range(5):
            cache.put(f"key-{i}", RouteDecision(route_type="direct", confidence=0.1))

        # Access key-0 to refresh it
        cache.get("key-0")

        # Now insert a 6th entry; key-1 should be evicted (oldest non-refreshed)
        cache.put("key-5", RouteDecision(route_type="direct", confidence=0.1))
        assert cache.get("key-0") is not None
        assert cache.get("key-1") is None

    def test_invalidate(self, cache, decision):
        """Test explicit invalidation of a key."""
        key = "invalidate-test"
        cache.put(key, decision)
        assert cache.invalidate(key) is True
        assert cache.get(key) is None
        assert cache.invalidate(key) is False

    def test_clear(self, cache, decision):
        """Test clearing all entries."""
        cache.put("a", decision)
        cache.put("b", decision)
        cache.clear()
        stats = cache.cache_stats()
        assert stats["size"] == 0
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        # After clear, gets should be misses
        assert cache.get("a") is None
        assert cache.get("b") is None

    def test_cache_stats(self, cache, decision):
        """Test cache statistics tracking."""
        key = "stats-test"
        cache.put(key, decision)
        cache.get(key)  # hit
        cache.get("miss-key")  # miss

        stats = cache.cache_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["hit_rate"] == 0.5
        assert stats["size"] == 1
        assert stats["max_size"] == 5

    def test_make_key_deterministic(self):
        """Test that make_key produces the same hash for the same inputs."""
        k1 = RouteDecisionCache.make_key("input", "agent", "hybrid")
        k2 = RouteDecisionCache.make_key("input", "agent", "hybrid")
        assert k1 == k2

    def test_make_key_differs_for_different_inputs(self):
        """Test that different inputs produce different keys."""
        k1 = RouteDecisionCache.make_key("hello", "a", "hybrid")
        k2 = RouteDecisionCache.make_key("world", "a", "hybrid")
        assert k1 != k2

    def test_overwrite_existing_key(self, cache):
        """Test that putting with an existing key updates the value."""
        key = "overwrite-test"
        cache.put(key, RouteDecision(route_type="direct", confidence=0.1))
        cache.put(key, RouteDecision(route_type="rag", confidence=0.9))
        result = cache.get(key)
        assert result is not None
        assert result.route_type == "rag"
        assert result.confidence == 0.9


class TestGlobalCache:
    """Tests for the global cache singleton."""

    def test_singleton_returns_same_instance(self):
        """Test that get_global_cache returns the same object."""
        # Reset the module-level singleton for isolation.
        import resolveagent.selector.cache as _cm

        _cm._global_cache = None

        c1 = get_global_cache(max_size=50, ttl_seconds=60.0)
        c2 = get_global_cache(max_size=100, ttl_seconds=120.0)
        assert c1 is c2
        # First-call params should stick.
        assert c1.max_size == 50

        # Cleanup
        _cm._global_cache = None

    def test_global_cache_usable(self):
        """Test basic operations on the global cache."""
        import resolveagent.selector.cache as _cm

        _cm._global_cache = None

        gc = get_global_cache()
        gc.put("g-key", RouteDecision(route_type="skill", confidence=0.7))
        assert gc.get("g-key") is not None

        # Cleanup
        _cm._global_cache = None
