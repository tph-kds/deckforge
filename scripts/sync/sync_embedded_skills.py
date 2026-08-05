#!/usr/bin/env python3
"""Keep the embedded skill copy and the canonical schema in sync.

The embedded copy is what an agent working inside 02-example sees, so it must
mirror the canonical skill (AGENTS.md: "Embedded skill copies at
examples/02-example/.agents/skills/deckforge/ must stay in sync with
skills/deckforge/").

The canonical DeckProject schema lives in schemas/deck-project.schema.json
(single source of truth) and is mirrored into the skill asset so the packaged
skill stays self-contained.

Validation must be read-only: CI runs `skills:check` which never repairs files.
Run `skills:sync` explicitly to write.
"""
from __future__ import annotations
import argparse, hashlib, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANON = ROOT / 'skills' / 'deckforge'
EMBED = ROOT / 'examples' / '02-example' / '.agents' / 'skills' / 'deckforge'
CANON_SCHEMA = ROOT / 'schemas' / 'deck-project.schema.json'
SKILL_SCHEMA = ROOT / 'skills' / 'deckforge' / 'assets' / 'deck-project.schema.json'
CANON_CAPABILITY_CATALOG = ROOT / 'schemas' / 'capability-catalog.json'
SKILL_CAPABILITY_CATALOG = ROOT / 'skills' / 'deckforge' / 'assets' / 'capability-catalog.json'
CANON_RECEIPT_SCHEMA = ROOT / 'schemas' / 'capability-receipt.schema.json'
SKILL_RECEIPT_SCHEMA = ROOT / 'skills' / 'deckforge' / 'assets' / 'capability-receipt.schema.json'


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def mirror(src_root: Path, dst_root: Path) -> tuple[int, int]:
    """Copy src_root tree into dst_root. Returns (copied, removed)."""
    copied = 0
    removed = 0
    for src in src_root.rglob('*'):
        rel = src.relative_to(src_root)
        dst = dst_root / rel
        if src.is_dir():
            dst.mkdir(parents=True, exist_ok=True)
            continue
        if not dst.exists() or md5(src) != md5(dst):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

    for dst in dst_root.rglob('*'):
        if dst.is_dir():
            continue
        rel = dst.relative_to(dst_root)
        src = src_root / rel
        if not src.exists():
            dst.unlink()
            removed += 1
    return copied, removed


def report_drift(src_root: Path, dst_root: Path) -> int:
    drift = 0
    for src in src_root.rglob('*'):
        if src.is_dir():
            continue
        rel = src.relative_to(src_root)
        dst = dst_root / rel
        if not dst.exists() or md5(src) != md5(dst):
            drift += 1
            print(f'DRIFT: {src_root.relative_to(ROOT)}/{rel}', file=sys.stderr)
    return drift


def sync_skill_copy() -> None:
    if not CANON.is_dir():
        print(f'ERROR: canonical skill missing: {CANON}', file=sys.stderr)
        sys.exit(1)
    copied, removed = mirror(CANON, EMBED)
    print(f'embedded skill: synced {copied} files, removed {removed} stale files')


def sync_schema_copy() -> None:
    if not CANON_SCHEMA.exists():
        print(f'ERROR: canonical schema missing: {CANON_SCHEMA}', file=sys.stderr)
        sys.exit(1)
    copied = 0
    for src, dst in (
        (CANON_SCHEMA, SKILL_SCHEMA),
        (CANON_CAPABILITY_CATALOG, SKILL_CAPABILITY_CATALOG),
        (CANON_RECEIPT_SCHEMA, SKILL_RECEIPT_SCHEMA),
    ):
        if not src.exists() or not dst.exists() or md5(src) != md5(dst):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1
    print(f'schema assets: synced {copied} files')


def check_drift() -> int:
    drift = 0
    drift += report_drift(CANON, EMBED)
    for src, dst in (
        (CANON_SCHEMA, SKILL_SCHEMA),
        (CANON_CAPABILITY_CATALOG, SKILL_CAPABILITY_CATALOG),
        (CANON_RECEIPT_SCHEMA, SKILL_RECEIPT_SCHEMA),
    ):
        if not dst.exists() or md5(src) != md5(dst):
            print(f'DRIFT: {src.relative_to(ROOT)} vs {dst.relative_to(ROOT)}', file=sys.stderr)
            drift += 1
    if drift:
        print(f'ERROR: {drift} file(s) drifted; run `npm run skills:sync`.', file=sys.stderr)
        return 1
    print('OK: embedded skill and canonical schema assets are in sync')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check', action='store_true', help='Read-only drift check; never repairs files.')
    args = ap.parse_args()

    if args.check:
        return check_drift()

    sync_schema_copy()
    sync_skill_copy()
    return check_drift()


if __name__ == '__main__':
    sys.exit(main())
