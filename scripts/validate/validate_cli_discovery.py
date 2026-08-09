#!/usr/bin/env python3
"""Validate Agent Skills CLI discovery surfaces for DeckForge.

Offline (default): structurally verify .claude-plugin/plugin.json,
.codex-plugin/plugin.json, and .agents/plugins/marketplace.json are in sync
with config/skill-registry.json.

Online (--online): additionally attempt a real discovery against the built
skill-zips bundle using `npx skills@latest`. If the network is unavailable,
the online step is skipped with a warning and the structural check still gates.
"""
from __future__ import annotations
import argparse, json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / 'config' / 'skill-registry.json'
MANIFESTS = [
    ROOT / '.claude-plugin' / 'plugin.json',
    ROOT / '.codex-plugin' / 'plugin.json',
    ROOT / '.agents' / 'plugins' / 'marketplace.json',
]


def structural() -> list[str]:
    errors = []
    registry = json.loads(REGISTRY.read_text(encoding='utf-8'))
    skill_ids = [s['id'] for s in registry['skills']]
    claude = json.loads((ROOT / '.claude-plugin' / 'plugin.json').read_text(encoding='utf-8'))
    codex = json.loads((ROOT / '.codex-plugin' / 'plugin.json').read_text(encoding='utf-8'))
    market = json.loads((ROOT / '.agents' / 'plugins' / 'marketplace.json').read_text(encoding='utf-8'))
    for manifest, field in ((claude, 'skills'), (codex, 'skills')):
        listed = [s.split('/')[-1] for s in manifest[field]]
        if listed != skill_ids:
            errors.append(f'skills list mismatch: {listed} != {skill_ids}')
    if market['name'] != registry['name']:
        errors.append(f"marketplace name {market['name']} != registry {registry['name']}")
    if [s['id'] for s in market['skills']] != skill_ids:
        errors.append('marketplace skills mismatch registry')
    return errors


def online(zip_dir: Path) -> list[str]:
    errors = []
    if not zip_dir.is_dir():
        return ['skill-zips not found; run npm run package-skills first']
    if shutil.which('npx') is None:
        return ['npx unavailable; skipping online discovery']
    # Smoke: `npx skills@latest` must at least run and resolve the registry.
    cmd = ['npx', '--yes', 'skills@latest', 'list', '--local', str(zip_dir)]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        return ['online discovery timed out']
    if proc.returncode != 0:
        errors.append(f'online discovery failed (rc={proc.returncode}): {proc.stderr[-500:]}')
    return errors


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--online', action='store_true', help='Attempt live CLI discovery when network is available')
    ap.add_argument('--skill-zips', type=Path, default=ROOT / 'skill-zips')
    args = ap.parse_args()

    errors = structural()
    if args.online:
        try:
            errors.extend(online(args.skill_zips))
        except Exception as exc:  # network failure must not block the offline gate
            print(f'ONLINE DISCOVERY SKIPPED: {exc}', file=sys.stderr)
    if errors:
        for e in errors:
            print('ERROR:', e, file=sys.stderr)
        return 1
    print('CLI DISCOVERY: OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
