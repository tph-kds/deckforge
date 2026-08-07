#!/usr/bin/env python3
"""Validate that DeckForge skill ZIPs are self-contained.

Scans extracted SKILL.md files for relative paths referenced in backticks and
verifies that each reference resolves to an existing file inside the bundle.
Any reference that escapes the bundle root or points at a missing file fails.

Also enforces YAML front matter on every SKILL.md: `name`, `description`, and
`version` are required, and `user-invocable: true` is restricted to the known
user-facing skills (the primary `deckforge` skill and the `deckforge-export`
skill); worker/verification skills must be `user-invocable: false`.

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

# Skills that are directly user-invocable. New user-facing skills must be added
# here deliberately; worker/verification skills stay `user-invocable: false`.
USER_INVOCABLE_ALLOWED = {"deckforge", "deckforge-export"}


def check_frontmatter(skill_file: Path, root: Path) -> list[str]:
    errors: list[str] = []
    text = skill_file.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{skill_file.relative_to(root)}: missing YAML frontmatter")
        return errors
    fm = text.split("---\n", 2)
    if len(fm) < 3:
        errors.append(f"{skill_file.relative_to(root)}: malformed YAML frontmatter")
        return errors
    header = fm[1]
    for key in ("name:", "description:", "version:"):
        if key not in header:
            errors.append(f"{skill_file.relative_to(root)}: frontmatter missing {key}")
    if "user-invocable: true" in header and skill_file.parent.name not in USER_INVOCABLE_ALLOWED:
        errors.append(f"{skill_file.relative_to(root)}: user-invocable restricted to {', '.join(sorted(USER_INVOCABLE_ALLOWED))}")
    return errors


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
            errors.extend(check_frontmatter(skill_file, root))
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
