"""CLI for bilingual document synchronization."""

from __future__ import annotations

import argparse
from pathlib import Path

from resolveagent.docsync.engine import SyncEngine


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ResolveAgent bilingual document sync")
    parser.add_argument(
        "--config",
        default="docs/i18n/sync-config.yaml",
        help="Path to sync configuration file",
    )
    parser.add_argument(
        "--workspace-root",
        default=".",
        help="Workspace root used to resolve relative paths",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    sync_parser = subparsers.add_parser("sync", help="Synchronize changed bilingual files")
    sync_parser.add_argument("--pair", help="Only sync one pair by id")

    watch_parser = subparsers.add_parser("watch", help="Watch files and sync continuously")
    watch_parser.add_argument("--pair", help="Only watch one pair by id")
    watch_parser.add_argument("--interval", type=float, help="Polling interval in seconds")

    proofread_parser = subparsers.add_parser("proofread", help="Run terminology and structure checks")
    proofread_parser.add_argument("--pair", help="Only proofread one pair by id")

    glossary_parser = subparsers.add_parser("glossary", help="Manage glossary terms")
    glossary_subparsers = glossary_parser.add_subparsers(dest="glossary_command", required=True)
    glossary_subparsers.add_parser("list", help="List glossary terms")
    glossary_add = glossary_subparsers.add_parser("add", help="Add or replace a glossary term")
    glossary_add.add_argument("--zh", required=True, help="Chinese term")
    glossary_add.add_argument("--en", required=True, help="English term")
    glossary_add.add_argument("--category", default="", help="Term category")
    glossary_add.add_argument("--notes", default="", help="Notes")

    review_parser = subparsers.add_parser("review", help="Inspect or resolve proofreading items")
    review_subparsers = review_parser.add_subparsers(dest="review_command", required=True)
    review_list = review_subparsers.add_parser("list", help="List pending review items")
    review_list.add_argument("--all", action="store_true", help="Include resolved items")
    review_resolve = review_subparsers.add_parser("resolve", help="Mark a review item as resolved")
    review_resolve.add_argument("--id", required=True, help="Review item id")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    workspace_root = Path(args.workspace_root).resolve()
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = workspace_root / config_path
    engine = SyncEngine(
        config_path=config_path,
        workspace_root=workspace_root,
    )

    if args.command == "sync":
        for outcome in engine.sync(pair_id=args.pair):
            direction = f" ({outcome.direction})" if outcome.direction else ""
            detail = f": {outcome.details}" if outcome.details else ""
            print(f"{outcome.pair_id}: {outcome.status}{direction}{detail}")
        return 0

    if args.command == "watch":
        engine.watch(pair_id=args.pair, interval_seconds=args.interval)
        return 0

    if args.command == "proofread":
        issues = engine.proofread(pair_id=args.pair)
        if not issues:
            print("no issues")
            return 0
        for item in issues:
            print(f"{item.id} [{item.severity}] {item.pair_id}: {item.issue}")
        return 0

    if args.command == "glossary":
        if args.glossary_command == "list":
            for term in engine.glossary.list_terms():
                category = f" [{term.category}]" if term.category else ""
                print(f"{term.zh} -> {term.en}{category}")
            return 0
        engine.add_glossary_term(
            zh=args.zh,
            en=args.en,
            category=args.category,
            notes=args.notes,
        )
        print(f"added: {args.zh} -> {args.en}")
        return 0

    if args.command == "review":
        if args.review_command == "list":
            for item in engine.list_reviews(unresolved_only=not args.all):
                suffix = " [resolved]" if item.resolved else ""
                print(f"{item.id} [{item.severity}] {item.pair_id}: {item.issue}{suffix}")
            return 0
        resolved = engine.resolve_review(args.id)
        print("resolved" if resolved else "not-found")
        return 0

    parser.error("unsupported command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
