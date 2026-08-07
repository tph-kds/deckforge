#!/usr/bin/env python3
"""Generate plugin/manifest files from the canonical skill registry.

Single source of truth is config/skill-registry.json. Generated outputs:
.claude-plugin/plugin.json, .codex-plugin/plugin.json,
.agents/plugins/marketplace.json, config/skill-routing-manifest.json.

Usage:
    python scripts/generate/generate_manifests.py [--check]
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = ROOT / 'config' / 'skill-registry.json'
OUTPUTS = {
    'claude-plugin': ROOT / '.claude-plugin' / 'plugin.json',
    'codex-plugin': ROOT / '.codex-plugin' / 'plugin.json',
    'marketplace': ROOT / '.agents' / 'plugins' / 'marketplace.json',
    'routing': ROOT / 'config' / 'skill-routing-manifest.json',
}


def load_registry() -> dict:
    return json.loads(REGISTRY_PATH.read_text(encoding='utf-8'))


def generate_all(registry: dict) -> dict[str, object]:
    skills = registry['skills']
    invocable = [s for s in skills if s.get('userInvocable', True)]
    workers = [s for s in skills if not s.get('userInvocable', True)]

    claude = {
        'name': 'deckforge',
        'version': '3.0.0',
        'description': 'Reliable editable web-native presentation skills with semantic layouts, editor and presenter contracts, archetypes, motion, and deterministic validation.',
        'author': {'name': 'DeckForge contributors'},
        'skills': ['./skills/' + s['id'] for s in skills],
    }

    codex = dict(claude)
    codex['skillsDirectory'] = 'skills'

    marketplace = {
        'schemaVersion': 1,
        'name': registry['name'],
        'displayName': 'DeckForge Web Slides Agent Skills',
        'version': '3.0.0',
        'description': 'Agent Skills for reliable editable browser-native presentations with semantic layouts, real editor and presenter modes, validation, and publishing workflows.',
        'repository': registry['repository'],
        'homepage': 'https://github.com/tph-kds/deckforge',
        'defaultSkill': registry['defaultSkill'],
        'skills': [
            {
                'id': s['id'],
                'path': s['path'],
                'title': s['title'],
                'description': s['description'],
                'tags': s['tags'],
            }
            for s in skills
        ],
        'agents': {
            'claude-code': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent claude-code'},
            'codex': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent codex'},
            'cursor': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent cursor'},
            'opencode': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent opencode'},
            'windsurf': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent windsurf'},
            'cline': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent cline'},
            'roo': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent roo'},
            'aider': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent aider'},
            'gemini-cli': {'supported': True, 'install': 'npx skills@latest add tph-kds/deckforge --skill deckforge --agent gemini-cli'},
            'grok': {'supported': True, 'install': 'Use the OpenAI-compatible or Anthropic-compatible mode in your Grok/xAI coding setup, then install the repository files or import the skills directory directly.'},
        },
    }

    routing = {
        'version': '1.0.0',
        'coreSkills': [s['id'] for s in invocable],
        'conditionalSkills': {
            'verification': [s['id'] for s in workers if s['id'] == 'deckforge-visual-evidence'],
            'skill-change': [s['id'] for s in workers if s['id'] == 'deckforge-skill-evaluator'],
        },
        'externalProviders': [
            {'id': 'ui-ux-pro-max', 'required': False},
            {'id': 'dembrandt', 'required': False},
            {'id': 'figma', 'required': False},
            {'id': 'mermaid', 'required': False},
        ],
    }

    return {'claude-plugin': claude, 'codex-plugin': codex, 'marketplace': marketplace, 'routing': routing}


def write_all(generated: dict[str, object]) -> None:
    for key, path in OUTPUTS.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(generated[key], indent=2) + '\n', encoding='utf-8')
        print(f'wrote {path.relative_to(ROOT)}')


def check_drift(generated: dict[str, object]) -> int:
    drift = 0
    for key, path in OUTPUTS.items():
        expected = json.dumps(generated[key], indent=2) + '\n'
        actual = path.read_text(encoding='utf-8') if path.exists() else ''
        if actual != expected:
            print(f'DRIFT: {path.relative_to(ROOT)}', file=sys.stderr)
            drift += 1
    if drift:
        print(f'ERROR: {drift} generated manifest(s) drifted; run generate_manifests.py.', file=sys.stderr)
        return 1
    print('OK: generated manifests are in sync with the registry')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--check', action='store_true', help='Read-only drift check.')
    args = ap.parse_args()
    generated = generate_all(load_registry())
    if args.check:
        return check_drift(generated)
    write_all(generated)
    return check_drift(generated)


if __name__ == '__main__':
    sys.exit(main())
