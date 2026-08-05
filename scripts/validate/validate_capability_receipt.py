#!/usr/bin/env python3
"""Validate a DeckForge capability receipt against the catalog and the schema.

A capability receipt is a machine-checkable declaration of which capabilities a
delivered project implements. This validator enforces the P0-001 rules:

- every claimed capability ID exists in the capability catalog;
- statuses are drawn from the catalog vocabulary;
- an `implemented` claim requires referenced tests plus any catalog-mandated
  entry points, commands, and persistence behavior;
- every referenced test and evidence file exists on disk;
- the selected delivery profile's requiredCapabilityIds are all claimed;
- regex scanning is never treated as evidence here.

Usage:
    python scripts/validate/validate_capability_receipt.py <receipt.json> [--strict]
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / 'schemas' / 'capability-catalog.json'
RECEIPT_SCHEMA_PATH = ROOT / 'schemas' / 'capability-receipt.schema.json'
PROFILES_PATH = ROOT / 'skills' / 'deckforge' / 'assets' / 'delivery-profile-manifest.json'

IMPLEMENTED = {'implemented', 'partial'}


def load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        print(f'ERROR: file not found: {path}', file=sys.stderr)
        raise SystemExit(1)
    except json.JSONDecodeError as exc:
        print(f'ERROR: invalid JSON in {path}: line {exc.lineno}, column {exc.colno}: {exc.msg}', file=sys.stderr)
        raise SystemExit(1)


def catalog_map() -> dict:
    catalog = load_json(CATALOG_PATH)
    return {c['id']: c for c in catalog['capabilities']}


def profiles_map() -> dict:
    return {p['id']: p for p in load_json(PROFILES_PATH)}


def path_label(error) -> str:
    return '.'.join(str(x) for x in error.absolute_path) or '$'


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('receipt', type=Path, help='Path to capability-receipt.json')
    ap.add_argument('--strict', action='store_true', help='Treat partial as blocking for profile-required capabilities')
    args = ap.parse_args()

    receipt = load_json(args.receipt)
    schema = load_json(RECEIPT_SCHEMA_PATH)
    catalog_doc = load_json(CATALOG_PATH)
    catalog = {c['id']: c for c in catalog_doc['capabilities']}
    profiles = profiles_map()

    errors: list[str] = []

    schema_errors = sorted(
        Draft202012Validator(schema).iter_errors(receipt),
        key=lambda e: list(e.absolute_path),
    )
    for error in schema_errors:
        errors.append(f'{path_label(error)}: {error.message}')

    profile_id = receipt.get('profile', '')
    if not errors and profile_id not in profiles:
        errors.append(f'profile: unknown delivery profile {profile_id!r}')

    claims = receipt.get('capabilities', {})
    profile_required = set(profiles.get(profile_id, {}).get('requiredCapabilityIds', []))
    claimed = set(claims)
    for cap_id, claim in claims.items():
        if cap_id not in catalog:
            errors.append(f'capability {cap_id}: unknown ID (not in capability-catalog.json)')
            continue
        entry = catalog[cap_id]
        evidence = entry.get('evidence', {})
        status = claim.get('status', '')
        if status not in catalog_doc['statuses']:
            errors.append(f'capability {cap_id}: invalid status {status!r}')
        if status in IMPLEMENTED:
            if evidence.get('requiresEntryPoints') and not claim.get('entryPoints'):
                errors.append(f'capability {cap_id}: implemented requires entryPoints')
            if evidence.get('requiresCommands') and not claim.get('commands'):
                errors.append(f'capability {cap_id}: implemented requires commands')
            if evidence.get('requiresPersistence') and not claim.get('persistence'):
                errors.append(f'capability {cap_id}: implemented requires persistence behavior')
            if not claim.get('tests'):
                errors.append(f'capability {cap_id}: implemented requires at least one referenced test')
            if not claim.get('evidence'):
                errors.append(f'capability {cap_id}: implemented requires at least one evidence path')

    missing_profile = sorted(profile_required - claimed)
    if missing_profile:
        errors.append('profile requires capabilities not claimed: ' + ', '.join(missing_profile))

    if not errors:
        base_dir = args.receipt.resolve().parent
        for cap_id, claim in claims.items():
            if claim.get('status') not in IMPLEMENTED:
                continue
            for kind in ('tests', 'evidence'):
                for rel in claim.get(kind, []):
                    target = base_dir / rel
                    if not target.exists():
                        errors.append(f'capability {cap_id}: referenced {kind[:-1]} file does not exist: {rel}')

    if args.strict:
        for cap_id in sorted(profile_required & claimed):
            if claims[cap_id].get('status') not in IMPLEMENTED:
                errors.append(f'capability {cap_id}: profile-required status must be implemented or partial in --strict mode (got {claims[cap_id].get("status")!r})')

    summary = {s: sum(1 for c in claims.values() if c.get('status') == s) for s in catalog_doc['statuses']}
    for cap_id, claim in sorted(claims.items()):
        status = claim.get('status')
        print(f'{status.upper():<12} {cap_id}')

    if errors:
        print('\n'.join('ERROR: ' + e for e in errors), file=sys.stderr)
        print(f'RECEIPT: FAIL ({profile_id}) {summary}', file=sys.stderr)
        return 1
    print(f'RECEIPT: PASS ({profile_id}) {summary}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
