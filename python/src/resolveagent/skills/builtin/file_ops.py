"""File operations skill with permission checks."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# Allowed base directories for file operations
ALLOWED_BASE_DIRS = [
    "/tmp/resolveagent",
    os.path.expanduser("~/.resolveagent/workspace"),
]

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def run(operation: str, path: str, content: str = "", **kwargs: Any) -> dict[str, Any]:
    """Perform file operations with permission checks.

    Args:
        operation: Operation type (read, write, list, delete, exists, mkdir).
        path: File or directory path.
        content: Content for write operations.

    Returns:
        Dict with operation result.
    """
    try:
        # Validate and sanitize path
        safe_path = _validate_path(path)
        if not safe_path:
            return {
                "operation": operation,
                "path": path,
                "success": False,
                "message": f"Path not allowed or invalid: {path}",
            }

        # Ensure base directories exist
        _ensure_base_dirs()

        # Execute operation
        if operation == "read":
            return _read_file(safe_path)
        elif operation == "write":
            return _write_file(safe_path, content)
        elif operation == "list":
            return _list_directory(safe_path or ".")
        elif operation == "delete":
            return _delete_path(safe_path)
        elif operation == "exists":
            return _check_exists(safe_path)
        elif operation == "mkdir":
            return _make_directory(safe_path)
        elif operation == "append":
            return _append_file(safe_path, content)
        else:
            return {
                "operation": operation,
                "path": path,
                "success": False,
                "message": f"Unknown operation: {operation}",
            }

    except Exception as e:
        logger.error(f"File operation failed: {e}", extra={"operation": operation, "path": path})
        return {
            "operation": operation,
            "path": path,
            "success": False,
            "message": f"Operation failed: {str(e)}",
        }


def _validate_path(path: str) -> str | None:
    """Validate and sanitize file path."""
    path = os.path.expanduser(path)
    abs_path = os.path.abspath(path)

    for allowed_dir in ALLOWED_BASE_DIRS:
        allowed_abs = os.path.abspath(os.path.expanduser(allowed_dir))
        if abs_path == allowed_abs or abs_path.startswith(allowed_abs + os.sep):
            return abs_path

    if not path.startswith("/"):
        base_dir = os.path.expanduser(ALLOWED_BASE_DIRS[0])
        full_path = os.path.join(base_dir, path)
        abs_full_path = os.path.abspath(full_path)
        if abs_full_path.startswith(os.path.abspath(base_dir) + os.sep) or abs_full_path == os.path.abspath(base_dir):
            return abs_full_path

    logger.warning(f"Path validation failed: {path}")
    return None


def _ensure_base_dirs() -> None:
    """Ensure allowed base directories exist."""
    for dir_path in ALLOWED_BASE_DIRS:
        expanded = os.path.expanduser(dir_path)
        if not os.path.exists(expanded):
            try:
                os.makedirs(expanded, exist_ok=True)
                logger.info(f"Created directory: {expanded}")
            except Exception as e:
                logger.error(f"Failed to create directory {expanded}: {e}")


def _read_file(path: str) -> dict[str, Any]:
    """Read file contents."""
    try:
        if not os.path.isfile(path):
            return {
                "operation": "read",
                "path": path,
                "success": False,
                "message": "File does not exist or is not a file",
            }

        size = os.path.getsize(path)
        if size > MAX_FILE_SIZE:
            return {
                "operation": "read",
                "path": path,
                "success": False,
                "message": f"File too large ({size} bytes, max {MAX_FILE_SIZE})",
            }

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        return {
            "operation": "read",
            "path": path,
            "success": True,
            "content": content,
            "size": size,
        }

    except Exception as e:
        return {
            "operation": "read",
            "path": path,
            "success": False,
            "message": f"Failed to read file: {str(e)}",
        }


def _write_file(path: str, content: str) -> dict[str, Any]:
    """Write content to file."""
    try:
        parent = os.path.dirname(path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)

        content_bytes = content.encode("utf-8")
        if len(content_bytes) > MAX_FILE_SIZE:
            return {
                "operation": "write",
                "path": path,
                "success": False,
                "message": f"Content too large ({len(content_bytes)} bytes)",
            }

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

        size = os.path.getsize(path)
        return {
            "operation": "write",
            "path": path,
            "success": True,
            "message": f"File written successfully ({size} bytes)",
            "size": size,
        }

    except Exception as e:
        return {
            "operation": "write",
            "path": path,
            "success": False,
            "message": f"Failed to write file: {str(e)}",
        }


def _append_file(path: str, content: str) -> dict[str, Any]:
    """Append content to file."""
    try:
        if os.path.exists(path):
            current_size = os.path.getsize(path)
            content_bytes = content.encode("utf-8")
            if current_size + len(content_bytes) > MAX_FILE_SIZE:
                return {
                    "operation": "append",
                    "path": path,
                    "success": False,
                    "message": "File would exceed size limit after append",
                }

        with open(path, "a", encoding="utf-8") as f:
            f.write(content)

        size = os.path.getsize(path)
        return {
            "operation": "append",
            "path": path,
            "success": True,
            "message": f"Content appended successfully ({size} bytes total)",
            "size": size,
        }

    except Exception as e:
        return {
            "operation": "append",
            "path": path,
            "success": False,
            "message": f"Failed to append to file: {str(e)}",
        }


def _list_directory(path: str) -> dict[str, Any]:
    """List directory contents."""
    try:
        if not os.path.isdir(path):
            return {
                "operation": "list",
                "path": path,
                "success": False,
                "message": "Path does not exist or is not a directory",
            }

        entries = []
        for entry in os.listdir(path):
            full_path = os.path.join(path, entry)
            entry_info = {
                "name": entry,
                "path": full_path,
                "type": "directory" if os.path.isdir(full_path) else "file",
            }
            if os.path.isfile(full_path):
                entry_info["size"] = os.path.getsize(full_path)
            entries.append(entry_info)

        return {
            "operation": "list",
            "path": path,
            "success": True,
            "entries": entries,
            "count": len(entries),
        }

    except Exception as e:
        return {
            "operation": "list",
            "path": path,
            "success": False,
            "message": f"Failed to list directory: {str(e)}",
        }


def _delete_path(path: str) -> dict[str, Any]:
    """Delete file or directory."""
    try:
        if not os.path.exists(path):
            return {
                "operation": "delete",
                "path": path,
                "success": False,
                "message": "Path does not exist",
            }

        if os.path.isfile(path):
            os.remove(path)
            return {
                "operation": "delete",
                "path": path,
                "success": True,
                "message": "File deleted successfully",
            }
        elif os.path.isdir(path):
            import shutil
            shutil.rmtree(path)
            return {
                "operation": "delete",
                "path": path,
                "success": True,
                "message": "Directory deleted successfully",
            }

    except Exception as e:
        return {
            "operation": "delete",
            "path": path,
            "success": False,
            "message": f"Failed to delete: {str(e)}",
        }


def _check_exists(path: str) -> dict[str, Any]:
    """Check if path exists."""
    exists = os.path.exists(path)
    result = {
        "operation": "exists",
        "path": path,
        "success": True,
        "exists": exists,
    }
    if exists:
        result["type"] = "directory" if os.path.isdir(path) else "file"
        if os.path.isfile(path):
            result["size"] = os.path.getsize(path)
    return result


def _make_directory(path: str) -> dict[str, Any]:
    """Create directory."""
    try:
        if os.path.exists(path):
            return {
                "operation": "mkdir",
                "path": path,
                "success": False,
                "message": "Path already exists",
            }

        os.makedirs(path, exist_ok=True)
        return {
            "operation": "mkdir",
            "path": path,
            "success": True,
            "message": "Directory created successfully",
        }

    except Exception as e:
        return {
            "operation": "mkdir",
            "path": path,
            "success": False,
            "message": f"Failed to create directory: {str(e)}",
        }
