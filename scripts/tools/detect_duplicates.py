#!/usr/bin/env python3
"""Detect byte-identical duplicate source files across the repository.

Motivation (P0-007): several files exist as intentional, byte-for-byte mirrors
(e.g. canonical JSON schemas copied into `skills/deckforge/assets/` so a skill
package ships self-contained). Those duplicates are by design and must never be
flagged. This tool groups files by SHA-256 of their bytes and reports clusters
whose members are NOT all covered by the intentional-mirror ignore list below.

INTENTIONAL-MIRROR IGNORE LIST (never flagged)
    IGNORED_PATH_GLOBS is a constant list of glob patterns (Python `fnmatch`;
    `*` matches across directory separators) matched against each file's path
    relative to the scan root, normalized to forward slashes so the tool behaves
    identically on Windows and POSIX CI:
      - `skills/deckforge/*` - the canonical skill tree. Every file here is by
        design mirrored into self-contained embedded copies, so a file that
        exists only as "canonical skill + embedded copy" is never a finding.
      - the schemas side of the `schemas/` <-> `skills/deckforge/assets/`
        mirror (schema + capability-catalog + receipt-schema). The assets side
        is already covered by the canonical skill tree glob above.
      - embedded copies under any `.agents/`, `.claude-plugin/`, or
        `.codex-plugin/` tree anywhere in the repository (e.g. the whole skill
        embedded under examples/02-example/.agents/skills/deckforge/...)
      - `.planning/` (planning/archive docs may intentionally embed copies)

A cluster is flagged if and only if at least one of its members is NOT covered
by IGNORED_PATH_GLOBS. Clusters whose members are all ignored are counted as
"intentional mirror cluster(s) ignored" and never listed.

SKIP_DIRS lists directory names that are never descended into: VCS metadata,
sibling worktree checkouts, dependencies, build output, and Python caches.

Usage:
    python scripts/tools/detect_duplicates.py [root] [--check] [--min-size <bytes>]

Modes:
    default   scan ROOT (the repository root) and print duplicate clusters; exit 0.
    --check   print the same listing, but exit 1 when an unexpected cluster exists.
    --min-size  only files strictly larger than this many bytes are scanned.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MIN_SIZE = 8

SKIP_DIRS = frozenset({'.git', '.worktrees', 'node_modules', '__pycache__', 'dist'})

IGNORED_PATH_GLOBS = (
    'skills/deckforge/*',
    'schemas/capability-catalog.json',
    'schemas/capability-receipt.schema.json',
    'schemas/deck-project.schema.json',
    '.agents/*',
    '*/.agents/*',
    '.claude-plugin/*',
    '*/.claude-plugin/*',
    '.codex-plugin/*',
    '*/.codex-plugin/*',
    '.planning/*',
)


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            yield Path(dirpath) / name


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b''):
            digest.update(chunk)
    return digest.hexdigest()


def find_clusters(root: Path, min_size: int) -> list[list[Path]]:
    by_hash: dict[str, list[Path]] = {}
    for path in iter_files(root):
        size = path.stat().st_size
        if size <= min_size:
            continue
        by_hash.setdefault(sha256_file(path), []).append(path)
    return [paths for paths in by_hash.values() if len(paths) > 1]


def rel_posix(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def is_ignored(rel: str) -> bool:
    return any(fnmatch.fnmatch(rel, pattern) for pattern in IGNORED_PATH_GLOBS)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument('root', nargs='?', type=Path, default=ROOT,
                    help='Directory to scan (default: the repository root)')
    ap.add_argument('--check', action='store_true',
                    help='Exit 1 if any duplicate cluster falls outside the intentional-mirror ignore list')
    ap.add_argument('--min-size', type=int, default=DEFAULT_MIN_SIZE,
                    help=f'Only files strictly larger than this many bytes are scanned (default: {DEFAULT_MIN_SIZE})')
    args = ap.parse_args(argv)

    root = args.root.resolve()
    clusters = find_clusters(root, args.min_size)

    unexpected = [c for c in clusters if any(not is_ignored(rel_posix(root, p)) for p in c)]
    ignored = [c for c in clusters if all(is_ignored(rel_posix(root, p)) for p in c)]
    unexpected.sort(key=lambda c: min(rel_posix(root, p) for p in c))

    for cluster in unexpected:
        members = sorted((rel_posix(root, p) for p in cluster), key=str.casefold)
        digest = sha256_file(cluster[0])[:16]
        print(f'DUPLICATE CLUSTER ({len(members)} files, sha256:{digest})')
        for name in members:
            print(f'  {name}')

    print(f'Summary: {len(unexpected)} unexpected cluster(s), {len(ignored)} intentional-mirror cluster(s) ignored')

    if args.check:
        if unexpected:
            print(f'ERROR: {len(unexpected)} unexpected duplicate cluster(s) found', file=sys.stderr)
            return 1
        print('OK: no unexpected duplicate files')
    return 0


if __name__ == '__main__':
    sys.exit(main())
