"""Unit tests for MilvusStore.delete (rag/index/milvus.py).

The Milvus client is faked at ``_client`` — these tests verify OUR wiring
(filter-expression construction, delete-count extraction), not the SDK.
Runtime behaviour against a live Milvus is integration territory.
"""

from __future__ import annotations

from typing import Any

import pytest

from resolveagent.rag.index.milvus import MilvusStore


class FakeMilvusClient:
    def __init__(self, delete_count: int = 3) -> None:
        self.calls: list[dict[str, Any]] = []
        self._delete_count = delete_count

    def delete(self, **kwargs: Any) -> dict[str, int]:
        self.calls.append(kwargs)
        return {"delete_count": self._delete_count}


@pytest.fixture
def store() -> MilvusStore:
    s = MilvusStore(host="localhost", port=19530)
    s._connected = True
    return s


class TestDeleteByIds:
    async def test_returns_sdk_delete_count(self, store: MilvusStore) -> None:
        client = FakeMilvusClient(delete_count=5)
        store._client = client

        deleted = await store.delete("demo-collection", ids=["a", "b", "c", "d", "e"])

        assert deleted == 5
        assert client.calls[0]["collection_name"].startswith("c_") or client.calls[0]["collection_name"]

    async def test_collection_name_is_sanitized(self, store: MilvusStore) -> None:
        client = FakeMilvusClient()
        store._client = client

        await store.delete("1787645583449612000-6590", ids=["a"])

        assert client.calls[0]["collection_name"] == "c_1787645583449612000_6590"
        assert "filter" not in client.calls[0]


class TestDeleteByFilter:
    async def test_filter_expression_is_built_and_count_returned(self, store: MilvusStore) -> None:
        client = FakeMilvusClient(delete_count=7)
        store._client = client

        deleted = await store.delete("demo-collection", filters={"source": "wiki", "env": 'x" or "y'})

        assert deleted == 7
        call = client.calls[0]
        assert call["collection_name"] == "demo_collection"
        # 转义后的表达式：内嵌双引号不能破坏字符串字面量
        assert call["filter"] == 'metadata["source"] == "wiki" and metadata["env"] == "x\\" or \\"y"'
        assert "ids" not in call

    async def test_illegal_filter_key_is_rejected(self, store: MilvusStore) -> None:
        store._client = FakeMilvusClient()

        with pytest.raises(ValueError, match="Illegal filter key"):
            await store.delete("demo-collection", filters={'bad"key': "v"})

    async def test_non_dict_result_defaults_to_zero(self, store: MilvusStore) -> None:
        class OddClient:
            def delete(self, **kwargs: Any) -> object:
                return None

        store._client = OddClient()
        assert await store.delete("demo-collection", filters={"k": "v"}) == 0


class TestDeleteGuards:
    async def test_not_connected_raises(self) -> None:
        store = MilvusStore(host="localhost", port=19530)
        with pytest.raises(RuntimeError, match="Not connected"):
            await store.delete("demo-collection", ids=["a"])

    async def test_no_ids_no_filters_is_noop(self, store: MilvusStore) -> None:
        client = FakeMilvusClient()
        store._client = client

        assert await store.delete("demo-collection") == 0
        assert client.calls == []
