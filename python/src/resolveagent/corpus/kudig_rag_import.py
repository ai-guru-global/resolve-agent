"""Standalone script to import kudig-database domain documents into RAG collections via HTTP API."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import signal
import sys
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from resolveagent.corpus.acquisition import CorpusAcquisition
from resolveagent.rag.ingest.chunker import TextChunker

logger = logging.getLogger("kudig-rag-import")

_DOMAIN_PATTERN = re.compile(r"^domain-\d+")
_MAX_DOCS_PER_BATCH = 20
_STATE_FILE = "~/.resolveagent/kudig-rag-import-state.json"


# ---------------------------------------------------------------------------
# HTTP API Client
# ---------------------------------------------------------------------------


class KudigRAGClient:
    """Thin HTTP client for the Go server's RAG API."""

    def __init__(self, base_url: str = "http://localhost:3004/api/v1") -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(timeout=httpx.Timeout(30.0, read=120.0))

    def close(self) -> None:
        self._client.close()

    # -- Collection operations -----------------------------------------------

    def list_collections(self) -> list[dict[str, Any]]:
        resp = self._request("GET", "/rag/collections")
        data = resp.json()
        return data.get("collections") or []

    def create_collection(
        self,
        name: str,
        description: str = "",
        embedding_model: str = "bge-large-zh",
        chunk_strategy: str = "by_h2",
    ) -> dict[str, Any]:
        body = {
            "name": name,
            "description": description,
            "embedding_model": embedding_model,
            "chunk_strategy": chunk_strategy,
        }
        resp = self._request("POST", "/rag/collections", json=body)
        return resp.json()

    def ensure_collection(self, name: str, description: str = "") -> str:
        """Return the collection ID, creating the collection if needed."""
        for col in self.list_collections():
            if col.get("name") == name:
                logger.info("Collection '%s' already exists (id=%s)", name, col["id"])
                return col["id"]

        logger.info("Creating collection '%s'", name)
        result = self.create_collection(
            name=name,
            description=description or f"kudig-database domain knowledge ({name})",
            embedding_model="bge-large-zh",
            chunk_strategy="by_h2",
        )
        collection_id = result["id"]
        logger.info("Collection created (id=%s)", collection_id)
        return collection_id

    # -- Ingest operations ---------------------------------------------------

    def ingest_documents(self, collection_id: str, documents: list[dict[str, Any]]) -> dict[str, Any]:
        body = {"documents": documents}
        resp = self._request("POST", f"/rag/collections/{collection_id}/ingest", json=body)
        return resp.json()

    # -- Health check --------------------------------------------------------

    def health_check(self) -> bool:
        try:
            resp = self._client.get(f"{self._base_url}/rag/collections", timeout=5.0)
            return resp.status_code < 500
        except httpx.HTTPError:
            return False

    # -- Internal ------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        max_retries: int = 3,
    ) -> httpx.Response:
        url = f"{self._base_url}{path}"
        backoff = 1.0
        last_exc: Exception | None = None

        for attempt in range(max_retries):
            try:
                resp = self._client.request(method, url, json=json)
                if resp.status_code < 500 and resp.status_code != 429:
                    resp.raise_for_status()
                    return resp
                # Retryable server error
                logger.warning(
                    "Server returned %d, retrying (%d/%d)",
                    resp.status_code,
                    attempt + 1,
                    max_retries,
                )
            except httpx.TimeoutException as exc:
                logger.warning("Request timeout, retrying (%d/%d)", attempt + 1, max_retries)
                last_exc = exc
            except httpx.HTTPStatusError:
                raise

            time.sleep(backoff)
            backoff *= 2.0

        if last_exc:
            raise last_exc
        raise httpx.HTTPError(f"Server error after {max_retries} retries for {method} {url}")


# ---------------------------------------------------------------------------
# Markdown Processing
# ---------------------------------------------------------------------------


class MarkdownProcessor:
    """Parse kudig-database Markdown files and prepare document chunks."""

    def __init__(self, strategy: str = "by_h2", chunk_size: int = 2000) -> None:
        self._chunker = TextChunker(strategy=strategy, chunk_size=chunk_size)

    @staticmethod
    def extract_title(content: str) -> str:
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        return match.group(1).strip() if match else ""

    @staticmethod
    def extract_blockquote_metadata(content: str) -> dict[str, str]:
        """Extract ``> key：value`` metadata lines from blockquotes."""
        metadata: dict[str, str] = {}
        for match in re.finditer(r"^>\s*\**(.+?)\**\s*[:：]\s*(.+)$", content, re.MULTILINE):
            key = match.group(1).strip()
            value = match.group(2).strip()
            metadata[key] = value
        return metadata

    @staticmethod
    def content_hash(content: str) -> str:
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def prepare_documents(self, file_path: Path, repo_root: Path, domain: str) -> tuple[list[dict[str, Any]], str]:
        """Parse a Markdown file and return (document dicts, content_hash)."""
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        if not content.strip():
            return [], self.content_hash("")

        c_hash = self.content_hash(content)
        title = self.extract_title(content) or file_path.stem
        bq_meta = self.extract_blockquote_metadata(content)

        chunks = self._chunker.chunk(content)
        if not chunks:
            return [], c_hash

        rel_path = str(file_path.relative_to(repo_root))

        documents: list[dict[str, Any]] = []
        for i, chunk_text in enumerate(chunks):
            doc = {
                "content": chunk_text,
                "metadata": {
                    "title": title,
                    "source_uri": f"kudig-database/{rel_path}",
                    "content_type": "text/markdown",
                    "domain": domain,
                    "corpus": "kudig",
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "content_hash": c_hash,
                    **bq_meta,
                },
            }
            documents.append(doc)

        return documents, c_hash


# ---------------------------------------------------------------------------
# Import State (resumability)
# ---------------------------------------------------------------------------


@dataclass
class ImportState:
    """Tracks import progress for resumability."""

    collection_id: str = ""
    collection_name: str = ""
    completed_files: dict[str, dict[str, Any]] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)

    _path: str = field(default=_STATE_FILE, repr=False)

    def is_imported(self, relative_path: str, content_hash: str) -> bool:
        entry = self.completed_files.get(relative_path)
        return bool(entry and entry.get("hash") == content_hash)

    def record_success(self, relative_path: str, content_hash: str, chunks: int) -> None:
        self.completed_files[relative_path] = {
            "hash": content_hash,
            "chunks": chunks,
            "at": datetime.now(UTC).isoformat(),
        }

    def record_error(self, relative_path: str, error: str) -> None:
        self.errors.append(
            {
                "file": relative_path,
                "error": error,
                "at": datetime.now(UTC).isoformat(),
            }
        )

    def save(self) -> None:
        path = Path(self._path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "collection_id": self.collection_id,
            "collection_name": self.collection_name,
            "completed_files": self.completed_files,
            "errors": self.errors,
        }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.debug("State saved (%d files)", len(self.completed_files))

    @classmethod
    def load(cls, state_path: str = _STATE_FILE) -> ImportState:
        path = Path(state_path).expanduser()
        if not path.exists():
            return cls(_path=state_path)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return cls(
                collection_id=data.get("collection_id", ""),
                collection_name=data.get("collection_name", ""),
                completed_files=data.get("completed_files", {}),
                errors=data.get("errors", []),
                _path=state_path,
            )
        except (json.JSONDecodeError, KeyError) as exc:
            logger.warning("Corrupted state file, starting fresh: %s", exc)
            return cls(_path=state_path)


# ---------------------------------------------------------------------------
# Main Importer
# ---------------------------------------------------------------------------


@dataclass
class ImportResult:
    """Summary of an import run."""

    files_total: int = 0
    files_processed: int = 0
    files_skipped: int = 0
    files_errored: int = 0
    chunks_total: int = 0
    duration_seconds: float = 0.0


class KudigImporter:
    """Orchestrates the kudig-database domain import via HTTP API."""

    def __init__(
        self,
        api_base_url: str = "http://localhost:3004/api/v1",
        source: str = "https://github.com/kudig-io/kudig-database",
        collection_name: str = "kudig-rag",
        force_clone: bool = False,
        force_reimport: bool = False,
        batch_delay: float = 0.2,
        dry_run: bool = False,
    ) -> None:
        self.api_base_url = api_base_url
        self.source = source
        self.collection_name = collection_name
        self.force_clone = force_clone
        self.force_reimport = force_reimport
        self.batch_delay = batch_delay
        self.dry_run = dry_run

    def run(self) -> ImportResult:
        start_time = time.monotonic()
        result = ImportResult()

        client = KudigRAGClient(self.api_base_url)
        processor = MarkdownProcessor(strategy="by_h2", chunk_size=2000)

        # Load or reset state
        state = ImportState() if self.force_reimport else ImportState.load()

        # Handle Ctrl+C gracefully
        interrupted = False

        def _sigint_handler(sig: int, frame: Any) -> None:
            nonlocal interrupted
            interrupted = True
            logger.info("\nInterrupted! Saving state...")

        original_handler = signal.getsignal(signal.SIGINT)
        signal.signal(signal.SIGINT, _sigint_handler)

        try:
            # 1. Acquire repository
            self._log("Acquiring repository...")
            repo_path = CorpusAcquisition().acquire(source=self.source, force=self.force_clone)
            self._log(f"Repository at {repo_path}")

            # 2. Scan domain-* directories
            files = self._scan_domain_files(repo_path)
            result.files_total = len(files)
            self._log(f"Found {len(files)} markdown files in domain-* directories")

            if self.dry_run:
                self._print_dry_run(files, Path(repo_path))
                return result

            # 3. Health check
            if not client.health_check():
                logger.error("API server at %s is unreachable", self.api_base_url)
                sys.exit(1)

            # 4. Ensure collection exists
            collection_id = client.ensure_collection(self.collection_name)
            state.collection_id = collection_id
            state.collection_name = self.collection_name

            # 5. Process files
            root = Path(repo_path)
            for i, file_path in enumerate(files):
                if interrupted:
                    break

                rel_path = str(file_path.relative_to(root))
                domain = file_path.parent.name

                # Read content for hash check
                try:
                    content = file_path.read_text(encoding="utf-8", errors="ignore")
                except OSError as exc:
                    self._log(f"  [{i + 1}/{len(files)}] {rel_path} -> ERROR: {exc}")
                    state.record_error(rel_path, str(exc))
                    result.files_errored += 1
                    continue

                c_hash = processor.content_hash(content)

                # Skip if already imported
                if not self.force_reimport and state.is_imported(rel_path, c_hash):
                    result.files_skipped += 1
                    continue

                # Prepare documents
                try:
                    docs, _ = processor.prepare_documents(file_path, root, domain)
                except Exception as exc:
                    self._log(f"  [{i + 1}/{len(files)}] {rel_path} -> PARSE ERROR: {exc}")
                    state.record_error(rel_path, str(exc))
                    result.files_errored += 1
                    continue

                if not docs:
                    self._log(f"  [{i + 1}/{len(files)}] {rel_path} -> skipped (empty)")
                    result.files_skipped += 1
                    continue

                # Ingest via API (batch if too many chunks)
                try:
                    total_chunks = 0
                    for batch_start in range(0, len(docs), _MAX_DOCS_PER_BATCH):
                        batch = docs[batch_start : batch_start + _MAX_DOCS_PER_BATCH]
                        client.ingest_documents(collection_id, batch)
                        total_chunks += len(batch)

                    result.files_processed += 1
                    result.chunks_total += total_chunks
                    state.record_success(rel_path, c_hash, total_chunks)
                    state.save()

                    self._log(f"  [{i + 1}/{len(files)}] {rel_path} -> {total_chunks} chunks")
                except Exception as exc:
                    self._log(f"  [{i + 1}/{len(files)}] {rel_path} -> INGEST ERROR: {exc}")
                    state.record_error(rel_path, str(exc))
                    result.files_errored += 1

                if self.batch_delay > 0:
                    time.sleep(self.batch_delay)

        finally:
            # Always save state
            state.save()
            signal.signal(signal.SIGINT, original_handler)
            client.close()

        result.duration_seconds = time.monotonic() - start_time
        self._print_summary(result)
        return result

    # -- Helpers -------------------------------------------------------------

    @staticmethod
    def _scan_domain_files(repo_path: str) -> list[Path]:
        root = Path(repo_path)
        files: list[Path] = []
        domain_dirs = sorted(d for d in root.iterdir() if d.is_dir() and _DOMAIN_PATTERN.match(d.name))
        for domain_dir in domain_dirs:
            for md_file in sorted(domain_dir.rglob("*.md")):
                files.append(md_file)
        return files

    @staticmethod
    def _log(msg: str) -> None:
        print(f"[kudig-rag-import] {msg}", flush=True)

    def _print_dry_run(self, files: list[Path], root: Path) -> None:
        domain_counts: dict[str, int] = {}
        for f in files:
            domain = f.parent.name
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

        self._log("DRY RUN - no data will be imported")
        self._log(f"  Domains: {len(domain_counts)}")
        self._log(f"  Total files: {len(files)}")
        for domain, count in sorted(domain_counts.items()):
            self._log(f"    {domain}: {count} files")

    def _print_summary(self, result: ImportResult) -> None:
        minutes = int(result.duration_seconds // 60)
        seconds = int(result.duration_seconds % 60)

        print()
        print("=" * 55)
        print("  Import Summary")
        print("=" * 55)
        print(f"  Collection:       {self.collection_name}")
        print(f"  Files total:      {result.files_total}")
        print(f"  Files processed:  {result.files_processed}")
        print(f"  Files skipped:    {result.files_skipped}")
        print(f"  Files errored:    {result.files_errored}")
        print(f"  Chunks created:   {result.chunks_total}")
        print(f"  Duration:         {minutes}m {seconds}s")
        print("=" * 55)
        print(flush=True)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="kudig-rag-import",
        description="Import kudig-database domain documents into RAG collections via HTTP API.",
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:3004/api/v1",
        help="Base URL for the RAG API (default: http://localhost:3004/api/v1)",
    )
    parser.add_argument(
        "--source",
        default="https://github.com/kudig-io/kudig-database",
        help="Git URL or local path to the kudig-database repository",
    )
    parser.add_argument(
        "--collection",
        default="kudig-rag",
        help="RAG collection name (default: kudig-rag)",
    )
    parser.add_argument(
        "--force-clone",
        action="store_true",
        help="Force re-clone even if cached",
    )
    parser.add_argument(
        "--force-reimport",
        action="store_true",
        help="Ignore resume state and re-import all files",
    )
    parser.add_argument(
        "--batch-delay",
        type=float,
        default=0.2,
        help="Delay in seconds between API calls (default: 0.2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and report without importing",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable DEBUG logging",
    )

    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    importer = KudigImporter(
        api_base_url=args.api_url,
        source=args.source,
        collection_name=args.collection,
        force_clone=args.force_clone,
        force_reimport=args.force_reimport,
        batch_delay=args.batch_delay,
        dry_run=args.dry_run,
    )

    importer.run()


if __name__ == "__main__":
    main()
