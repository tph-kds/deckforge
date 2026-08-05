#!/usr/bin/env python3
"""Validate repository JSON and relative Markdown links."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IGNORED_DIRS = {".git", "skill-zips", "__pycache__", "node_modules", "dist"}
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
errors: list[str] = []
json_count = 0
link_count = 0

for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in IGNORED_DIRS for part in path.parts):
        continue
    if path.suffix == ".json":
        json_count += 1
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")
    if path.suffix.lower() == ".md":
        text = path.read_text(encoding="utf-8")
        for target in LINK_RE.findall(text):
            target = target.strip().split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            link_count += 1
            resolved = (path.parent / target).resolve()
            try:
                resolved.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{path.relative_to(ROOT)}: link escapes repository: {target}")
                continue
            if not resolved.exists():
                errors.append(f"{path.relative_to(ROOT)}: missing relative link target: {target}")

if errors:
    print("\n".join("ERROR: " + error for error in errors), file=sys.stderr)
    raise SystemExit(1)
print(f"OK: repository assets ({json_count} JSON files, {link_count} relative Markdown links)")
