"""OpenAI-compatible /v1/embeddings shim backed by MiniMax embo-01.

The ResolveAgent RAG embedder speaks the OpenAI embeddings format
({"model", "input": [...]} -> {"data": [{"embedding": [...]}]}), while the
MiniMax token-plan endpoint speaks its native format
({"model", "texts": [...], "type"} -> {"vectors": [...]}).
This shim translates between the two so the runtime can use MiniMax for
embeddings without code changes.
"""

from __future__ import annotations

import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM = os.getenv("MINIMAX_BASE_URL", "https://api.minimaxi.com/v1").rstrip("/")
API_KEY = os.environ["MINIMAX_API_KEY"]
UPSTREAM_MODEL = os.getenv("MINIMAX_EMBEDDING_MODEL", "embo-01")
BATCH = 16
TIMEOUT = 60.0


def embed_batch(texts: list[str], emb_type: str) -> list[list[float]]:
    body = json.dumps(
        {"model": UPSTREAM_MODEL, "texts": texts, "type": emb_type}
    ).encode()
    req = urllib.request.Request(
        f"{UPSTREAM}/embeddings",
        data=body,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        data = json.loads(resp.read())
    base = data.get("base_resp") or {}
    if base.get("status_code", 0) != 0:
        raise RuntimeError(f"upstream error: {base}")
    vectors = data.get("vectors")
    if not vectors or len(vectors) != len(texts):
        raise RuntimeError(f"upstream returned {len(vectors or [])} vectors for {len(texts)} texts")
    return vectors


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/health", "/healthz"):
            self._send(200, {"status": "ok"})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self.path.rstrip("/").endswith("/v1/embeddings"):
            self._send(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            req = json.loads(self.rfile.read(length) or b"{}")
            texts = req.get("input") or []
            if isinstance(texts, str):
                texts = [texts]
            vectors: list[list[float]] = []
            # MiniMax embo-01 区分 db(文档)/query(查询)两种向量空间,而 OpenAI
            # 格式没有这个字段。runtime 的 Embedder 摄入时按批(16 条)调用、
            # 检索时单条调用(embed_query),因此按批次大小近似区分。
            emb_type = "query" if len(texts) == 1 else "db"
            for i in range(0, len(texts), BATCH):
                vectors.extend(embed_batch(texts[i : i + BATCH], emb_type))
            self._send(
                200,
                {
                    "object": "list",
                    "data": [
                        {"object": "embedding", "index": i, "embedding": v}
                        for i, v in enumerate(vectors)
                    ],
                    "model": req.get("model", UPSTREAM_MODEL),
                },
            )
        except Exception as exc:  # noqa: BLE001
            self._send(502, {"error": f"shim upstream failure: {exc}"})

    def log_message(self, fmt: str, *args: object) -> None:
        pass


if __name__ == "__main__":
    port = int(os.getenv("SHIM_PORT", "9000"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
