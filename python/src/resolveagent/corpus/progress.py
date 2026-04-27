"""Progress tracking for corpus import operations."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable, Coroutine

logger = logging.getLogger(__name__)


@dataclass
class ImportStats:
    """Counters for a single import category."""

    total: int = 0
    processed: int = 0
    errors: int = 0
    chunks: int = 0


@dataclass
class ProgressEvent:
    """A single progress event emitted during import."""

    type: str
    message: str
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"type": self.type, "message": self.message, "data": self.data}


class ProgressTracker:
    """Tracks import progress and emits events via a callback.

    Supports four import categories: rag, fta, skills, code_analysis.
    """

    def __init__(
        self,
        callback: Callable[[ProgressEvent], Coroutine[Any, Any, None]] | None = None,
    ) -> None:
        self.stats: dict[str, ImportStats] = {
            "rag": ImportStats(),
            "fta": ImportStats(),
            "skills": ImportStats(),
            "code_analysis": ImportStats(),
        }
        self._callback = callback
        self._start_time = time.monotonic()
        self._errors: list[dict[str, str]] = []

    async def emit(self, event: ProgressEvent) -> None:
        """Emit a progress event."""
        logger.debug("Progress event", extra={"event_type": event.type, "message": event.message})
        if self._callback is not None:
            await self._callback(event)

    async def start(self, rag_total: int, fta_total: int, skills_total: int, code_analysis_total: int = 0) -> None:
        self.stats["rag"].total = rag_total
        self.stats["fta"].total = fta_total
        self.stats["skills"].total = skills_total
        self.stats["code_analysis"].total = code_analysis_total
        await self.emit(
            ProgressEvent(
                type="import.started",
                message="Corpus import started",
                data={
                    "rag_total": rag_total,
                    "fta_total": fta_total,
                    "skills_total": skills_total,
                    "code_analysis_total": code_analysis_total,
                },
            )
        )

    async def file_processed(
        self,
        category: str,
        file_path: str,
        chunks: int = 0,
        extra: dict[str, Any] | None = None,
    ) -> None:
        stats = self.stats[category]
        stats.processed += 1
        stats.chunks += chunks
        data: dict[str, Any] = {
            "file": file_path,
            "chunks": chunks,
            "processed": stats.processed,
            "total": stats.total,
        }
        if extra:
            data.update(extra)
        await self.emit(
            ProgressEvent(
                type=f"import.{category}.file_processed",
                message=f"Processed {file_path}",
                data=data,
            )
        )

    async def file_error(self, category: str, file_path: str, error: str) -> None:
        stats = self.stats[category]
        stats.errors += 1
        self._errors.append({"category": category, "file": file_path, "error": error})
        await self.emit(
            ProgressEvent(
                type="import.error",
                message=f"Error processing {file_path}: {error}",
                data={"category": category, "file": file_path, "error": error},
            )
        )

    async def phase_completed(self, category: str) -> None:
        stats = self.stats[category]
        await self.emit(
            ProgressEvent(
                type=f"import.{category}.completed",
                message=f"{category.upper()} import completed",
                data={
                    "processed": stats.processed,
                    "total": stats.total,
                    "errors": stats.errors,
                    "chunks": stats.chunks,
                },
            )
        )

    async def completed(self) -> None:
        duration = time.monotonic() - self._start_time
        await self.emit(
            ProgressEvent(
                type="import.completed",
                message="Corpus import completed",
                data={
                    "rag": {
                        "processed": self.stats["rag"].processed,
                        "chunks": self.stats["rag"].chunks,
                        "errors": self.stats["rag"].errors,
                    },
                    "fta": {
                        "processed": self.stats["fta"].processed,
                        "errors": self.stats["fta"].errors,
                    },
                    "skills": {
                        "processed": self.stats["skills"].processed,
                        "errors": self.stats["skills"].errors,
                    },
                    "code_analysis": {
                        "processed": self.stats["code_analysis"].processed,
                        "chunks": self.stats["code_analysis"].chunks,
                        "errors": self.stats["code_analysis"].errors,
                    },
                    "duration_seconds": round(duration, 2),
                    "total_errors": len(self._errors),
                },
            )
        )

    @property
    def all_errors(self) -> list[dict[str, str]]:
        return list(self._errors)
