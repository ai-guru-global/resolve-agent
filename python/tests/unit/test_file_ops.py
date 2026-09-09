"""Unit tests for file_ops path validation (symlink escape prevention)."""

from __future__ import annotations

import os

from resolveagent.skills.builtin import file_ops


class TestValidatePath:
    def test_allowed_path(self, tmp_path, monkeypatch):
        base = tmp_path / "workspace"
        base.mkdir()
        target = base / "ok.txt"
        target.write_text("hi", encoding="utf-8")
        monkeypatch.setattr(file_ops, "ALLOWED_BASE_DIRS", [str(base)])

        assert file_ops._validate_path(str(target)) == os.path.realpath(target)

    def test_symlink_escape_rejected(self, tmp_path, monkeypatch):
        base = tmp_path / "workspace"
        base.mkdir()
        outside = tmp_path / "secret.txt"
        outside.write_text("nope", encoding="utf-8")
        link = base / "link.txt"
        link.symlink_to(outside)
        monkeypatch.setattr(file_ops, "ALLOWED_BASE_DIRS", [str(base)])

        assert file_ops._validate_path(str(link)) is None

    def test_symlink_dir_escape_rejected(self, tmp_path, monkeypatch):
        base = tmp_path / "workspace"
        base.mkdir()
        outside_dir = tmp_path / "outside"
        outside_dir.mkdir()
        link_dir = base / "linked"
        link_dir.symlink_to(outside_dir)
        monkeypatch.setattr(file_ops, "ALLOWED_BASE_DIRS", [str(base)])

        assert file_ops._validate_path(str(link_dir / "file.txt")) is None

    def test_relative_path_resolved_under_base(self, tmp_path, monkeypatch):
        base = tmp_path / "workspace"
        base.mkdir()
        monkeypatch.setattr(file_ops, "ALLOWED_BASE_DIRS", [str(base)])

        assert file_ops._validate_path("sub/dir/file.txt") == os.path.realpath(base / "sub" / "dir" / "file.txt")

    def test_run_write_through_symlink_rejected(self, tmp_path, monkeypatch):
        base = tmp_path / "workspace"
        base.mkdir()
        outside = tmp_path / "secret.txt"
        outside.write_text("nope", encoding="utf-8")
        (base / "link.txt").symlink_to(outside)
        monkeypatch.setattr(file_ops, "ALLOWED_BASE_DIRS", [str(base)])

        result = file_ops.run("write", str(base / "link.txt"), "pwned")

        assert result["success"] is False
        assert outside.read_text(encoding="utf-8") == "nope"
