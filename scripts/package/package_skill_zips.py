#!/usr/bin/env python3
"""Package each DeckForge skill into a self-contained ZIP.

A bundle is self-contained when every relative path referenced from its
SKILL.md resolves to a file inside the bundle. Because dependent skills
reference `../deckforge/...` and `../../docs/...`, each bundle mirrors the
repository layout: `skills/<name>/`, its `skills/deckforge/` dependency, and
any referenced `docs/` files, stored under repo-root-relative paths.

Usage:
    python scripts/package/package_skill_zips.py
"""
from __future__ import annotations
import re
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / 'skills'
DOCS = ROOT / 'docs'
OUT = ROOT / 'skill-zips'

# Same relative-path pattern used by validate_skill_bundles.py.
PATH_RE = re.compile(r"`((?:\.\.?/)?[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+)`")


def referenced_paths(skill_dir: Path) -> list[str]:
    paths: list[str] = []
    for md in skill_dir.rglob('*.md'):
        text = md.read_text(encoding='utf-8')
        for match in PATH_RE.findall(text):
            if match.startswith(('http/', 'https/')):
                continue
            if match not in paths:
                paths.append(match)
    return paths


def pack_skill(skill_name: str, tmp: Path) -> Path:
    skill_dir = SKILLS / skill_name
    target = tmp / skill_name
    # Stage the skill's own tree plus its deckforge sibling dependency.
    for dep in (skill_dir, SKILLS / 'deckforge'):
        if dep.exists():
            shutil.copytree(dep, target / 'skills' / dep.name, dirs_exist_ok=True)
    # Stage any referenced docs files so ../../docs/... resolves.
    for ref in referenced_paths(skill_dir):
        if ref.startswith('../../docs/') or ref.startswith('../docs/'):
            rel = Path(ref).name if not ref.startswith('../../docs/') else ref[len('../../docs/'):]
            source = DOCS / rel
            if source.exists():
                dest = target / 'docs' / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
    zip_path = OUT / f'{skill_name}.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(target.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(tmp))
    return zip_path


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for d in sorted(SKILLS.iterdir()):
        if d.is_dir() and (d / 'SKILL.md').exists():
            with tempfile.TemporaryDirectory() as tmp:
                pack_skill(d.name, Path(tmp))
            print('packed', f'{d.name}.zip')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
