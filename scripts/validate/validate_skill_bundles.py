#!/usr/bin/env python3
"""Validate that DeckForge skill ZIPs are self-contained.

Scans extracted SKILL.md files for relative paths referenced in backticks and
verifies that each reference resolves to an existing file inside the bundle.
Any reference that escapes the bundle root or points at a missing file fails.

Usage:
    python scripts/validate/validate_skill_bundles.py <directory-with-zips>
"""
from __future__ import annotations
import argparse
import re
import tempfile
import zipfile
from pathlib import Path

PATH_RE = re.compile(r"`((?:\.\.?/)?[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+)`")


def validate_bundle(zip_path: Path) -> list[str]:
    errors: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp).resolve()
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(root)
        skill_files = list(root.rglob("SKILL.md"))
        if not skill_files:
            return ["missing SKILL.md"]
        for skill_file in skill_files:
            text = skill_file.read_text(encoding="utf-8")
            base = skill_file.parent.resolve()
            for match in PATH_RE.findall(text):
                # Skip obvious generated output placeholders.
                if match.startswith(("http/", "https/")):
                    continue
                target = (base / match).resolve()
                if root not in target.parents and target != root:
                    errors.append(f"{skill_file.relative_to(root)} escapes bundle: {match}")
                elif not target.exists():
                    errors.append(f"{skill_file.relative_to(root)} missing reference: {match}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    failed = False
    for path in sorted(args.directory.glob("*.zip")):
        errors = validate_bundle(path)
        if errors:
            failed = True
            print(f"FAIL {path.name}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS {path.name}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
