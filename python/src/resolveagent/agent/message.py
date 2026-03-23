"""Message types and serialization."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel


class MessageRole(str, Enum):
    """Message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Message(BaseModel):
    """A message in the agent conversation."""

    role: MessageRole
    content: str
    name: str | None = None
    metadata: dict[str, Any] = {}

    def to_dict(self) -> dict[str, Any]:
        """Convert to dict for LLM API calls."""
        d: dict[str, Any] = {"role": self.role.value, "content": self.content}
        if self.name:
            d["name"] = self.name
        return d


class ToolCall(BaseModel):
    """A tool/skill invocation within a message."""

    id: str
    name: str
    arguments: dict[str, Any] = {}


class ToolResult(BaseModel):
    """Result of a tool/skill execution."""

    tool_call_id: str
    output: str
    success: bool = True
    error: str | None = None
