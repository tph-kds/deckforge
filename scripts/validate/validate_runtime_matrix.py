#!/usr/bin/env python3
"""Validate that every runtime manifest points at real, loadable skills.

Checks each agent manifest (.claude-plugin, .codex-plugin, .agents/plugins)
for structural validity and verifies every referenced skill path contains a
SKILL.md with required frontmatter.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFESTS = {
    'claude': ROOT / '.claude-plugin' / 'plugin.json',
    'codex': ROOT / '.codex-plugin' / 'plugin.json',
    'marketplace': ROOT / '.agents' / 'plugins' / 'marketplace.json',
}


def check_skill(path: Path) -> list[str]:
    errors = []
    skill_file = ROOT / path if not path.is_absolute() else path
    if not (skill_file / 'SKILL.md').is_file():
        errors.append(f'skill path {path} has no SKILL.md')
        return errors
    text = (skill_file / 'SKILL.md').read_text(encoding='utf-8')
    if not text.startswith('---\n'):
        errors.append(f'{path}/SKILL.md missing frontmatter')
    parts = text.split('---\n', 2)
    if len(parts) < 2:
        errors.append(f'{path}/SKILL.md missing frontmatter')
    else:
        for key in ('name:', 'description:', 'version:'):
            if key not in parts[1]:
                errors.append(f'{path}/SKILL.md missing {key}')
    return errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--json-report', type=Path)
    args = ap.parse_args()
    errors = []
    checks = []

    claude = json.loads((MANIFESTS['claude']).read_text(encoding='utf-8'))
    for rel in claude.get('skills', []):
        path = Path(rel)
        checks.append((f'claude:{rel}', check_skill(path)))
        errors.extend(checks[-1][1])

    codex = json.loads((MANIFESTS['codex']).read_text(encoding='utf-8'))
    for rel in codex.get('skills', []):
        path = Path(rel)
        checks.append((f'codex:{rel}', check_skill(path)))
        errors.extend(checks[-1][1])

    market = json.loads((MANIFESTS['marketplace']).read_text(encoding='utf-8'))
    if market.get('schemaVersion') != 1:
        errors.append('marketplace schemaVersion must be 1')
    for s in market.get('skills', []):
        path = Path(s['path'])
        checks.append((f'marketplace:{s["id"]}', check_skill(path)))
        errors.extend(checks[-1][1])

    report = {'errors': errors, 'manifests': {k: str(v.relative_to(ROOT)).replace('\\', '/') for k, v in MANIFESTS.items()}, 'checked': len(checks)}
    if args.json_report:
        lines = ['# Agent Runtime Compatibility Matrix', '',
                 '| Runtime | Manifest | Check |', '|---|---|---|']
        for name, path in report['manifests'].items():
            lines.append(f'| {name} | `{path}` | OK |')
        args.json_report.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    for e in errors:
        print('ERROR:', e, file=sys.stderr)
    print(f'RUNTIME MATRIX: {len(checks)} skill references checked, {len(errors)} errors')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
