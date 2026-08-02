#!/usr/bin/env python3
"""Sync the embedded skill copy in examples/02-example with canonical skills/deckforge.

The embedded copy is what an agent working inside the 02-example sees, so it must
mirror the canonical skill (AGENTS.md: "Embedded skill copies at
examples/02-example/.agents/skills/deckforge/ must stay in sync with skills/deckforge/").
This script mirrors the tree and reports any leftover drift as a non-zero exit.
"""
from __future__ import annotations
import hashlib, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANON = ROOT / 'skills' / 'deckforge'
EMBED = ROOT / 'examples' / '02-example' / '.agents' / 'skills' / 'deckforge'


def md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def main() -> int:
    if not CANON.is_dir():
        print(f'ERROR: canonical skill missing: {CANON}', file=sys.stderr)
        return 1

    copied = 0
    removed = 0
    for src in CANON.rglob('*'):
        rel = src.relative_to(CANON)
        dst = EMBED / rel
        if src.is_dir():
            dst.mkdir(parents=True, exist_ok=True)
            continue
        if not dst.exists() or md5(src) != md5(dst):
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1

    for dst in EMBED.rglob('*'):
        if dst.is_dir():
            continue
        rel = dst.relative_to(EMBED)
        src = CANON / rel
        if not src.exists():
            dst.unlink()
            removed += 1

    print(f'synced {copied} files, removed {removed} stale files')

    drift = 0
    for src in CANON.rglob('*'):
        if src.is_dir():
            continue
        rel = src.relative_to(CANON)
        dst = EMBED / rel
        if not dst.exists() or md5(src) != md5(dst):
            drift += 1
            print(f'DRIFT: {rel}')
    if drift:
        print(f'ERROR: {drift} files still drift after sync', file=sys.stderr)
        return 1
    print('embedded copy is in sync')
    return 0


if __name__ == '__main__':
    sys.exit(main())
