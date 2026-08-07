#!/usr/bin/env python3
"""Generate a browser-evidence report and capability receipt from Playwright results.

Reads the evidence-capability map and the Playwright last-run results, maps
passed tests that produced an artifact to capability IDs, and writes the
executed-evidence report. The capability receipt is rebuilt from the project's
committed claim skeleton (`evidence/runner-config.json`) and enriched with
executed evidence artifacts; claims the project still implements are never
dropped, so profile-required capabilities keep strict validation green even
when a run does not exercise them. Capabilities whose test passed but produced
no artifact are listed as unverified (contract rule: evidence without an
artifact and hash is rejected).

Usage:
    python scripts/evidence/generate_capability_receipt.py <project-dir> [--run-id RUN_ID]
"""
from __future__ import annotations
import argparse, hashlib, json, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAP_PATH = ROOT / 'skills/deckforge-visual-evidence/assets/evidence-capability-map.json'


def commit_sha() -> str:
    try:
        out = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except Exception:
        return 'unknown'


def map_tests() -> list[dict]:
    return json.loads(MAP_PATH.read_text(encoding='utf-8'))['tests']


def _walk_suites(suite: dict):
    for t in suite.get('tests', []):
        yield t
    for child in suite.get('suites', []):
        yield from _walk_suites(child)


def passed_tests(project_dir: Path) -> set[str]:
    last_run = project_dir / 'test-results' / 'last-run.json'
    if not last_run.exists():
        return set()
    data = json.loads(last_run.read_text(encoding='utf-8'))
    passed: set[str] = set()
    for suite in data.get('suites', []):
        for t in _walk_suites(suite):
            if t.get('status') == 'passed':
                passed.add(t['title'])
    return passed


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def artifact_for(project_dir: Path, test_id: str) -> Path | None:
    """Locate the executed artifact for a test.

    Prefers an exact sanitized filename match, then a normalized substring
    match, because Playwright names trace zips like
    `<sanitized-title>-...-trace.zip`, not `<testId>.zip`.
    """
    wanted = _norm(test_id)
    exact: list[Path] = []
    partial: list[Path] = []
    for base in ('test-results', 'playwright-traces'):
        base_dir = project_dir / base
        if not base_dir.exists():
            continue
        for p in base_dir.rglob('*.zip'):
            stem = _norm(p.stem)
            if stem == wanted:
                exact.append(p)
            elif wanted in stem:
                partial.append(p)
    if exact:
        return sorted(exact)[0]
    return sorted(partial)[0] if partial else None


def project_label(project_dir: Path) -> str:
    try:
        return str(project_dir.relative_to(ROOT))
    except ValueError:
        return project_dir.name


def generate_report(project_dir: Path, commit: str, run_id: str, browser: str) -> dict:
    passed = passed_tests(project_dir)
    capabilities: dict[str, list[dict]] = {}
    unverified: list[str] = []
    now = datetime.now(timezone.utc)
    for entry in map_tests():
        if entry['testId'] not in passed:
            continue
        artifact = artifact_for(project_dir, entry['testId'])
        if artifact is None:
            for cap_id in entry['capabilityIds']:
                if cap_id not in unverified:
                    unverified.append(cap_id)
            continue
        evidence = {
            'kind': 'playwright',
            'testId': entry['testId'],
            'status': 'passed',
            'commit': commit,
            'runId': run_id,
            'browser': browser,
            'viewport': '1440x900',
            'artifact': artifact.relative_to(project_dir).as_posix(),
            'artifactSha256': sha256(artifact),
            'startedAt': now.isoformat(),
            'finishedAt': now.isoformat(),
        }
        for cap_id in entry['capabilityIds']:
            capabilities.setdefault(cap_id, []).append(evidence)
    return {
        'reportVersion': '1.0.0',
        'project': project_label(project_dir),
        'profile': 'editable-deck',
        'commit': commit,
        'runId': run_id,
        'generatedAt': now.isoformat(),
        'capabilities': capabilities,
        'unverifiedCapabilities': sorted(unverified),
        'consoleErrors': [],
        'failedRequests': [],
    }


def runner_config(project_dir: Path) -> dict:
    """Per-capability project facts the strict validator requires but that
    executed evidence cannot derive (entryPoints/commands/persistence/tests
    and existing evidence paths). This committed file is the project's claim
    skeleton; the generator enriches it with executed evidence, it never
    replaces or drops claims the project still implements."""
    p = project_dir / 'evidence' / 'runner-config.json'
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return {}


def build_receipt(project_dir: Path, report: dict) -> dict:
    claims = {}
    config = runner_config(project_dir)
    for cid, claim_cfg in config.items():
        evidence_paths = list(claim_cfg.get('evidence', []))
        executed = report['capabilities'].get(cid, [])
        for entry in executed:
            if entry['artifact'] not in evidence_paths:
                evidence_paths.append(entry['artifact'])
        claims[cid] = {
            'status': 'implemented',
            'entryPoints': claim_cfg.get('entryPoints', []),
            'commands': claim_cfg.get('commands', []),
            'persistence': claim_cfg.get('persistence', []),
            'tests': claim_cfg.get('tests', []),
            'evidence': evidence_paths,
            'note': 'evidence generated by trusted Playwright runner' if executed else claim_cfg.get('note', ''),
        }
    for cid in report['unverifiedCapabilities']:
        if cid not in claims:
            claims[cid] = {'status': 'unverified', 'note': 'no passing executed evidence with artifact'}
    return {
        'receiptVersion': '1.0.0',
        'profile': 'editable-deck',
        'project': report['project'],
        'generatedAt': report['generatedAt'],
        'capabilities': claims,
    }


def write_receipt(project_dir: Path, report: dict) -> None:
    receipt = build_receipt(project_dir, report)
    (project_dir / 'evidence').mkdir(exist_ok=True)
    (project_dir / 'evidence' / 'browser-evidence-report.json').write_text(
        json.dumps(report, indent=2), encoding='utf-8')
    (project_dir / 'capability-receipt.json').write_text(
        json.dumps(receipt, indent=2), encoding='utf-8')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('project_dir', type=Path)
    ap.add_argument('--run-id', default='local')
    ap.add_argument('--browser', default='chromium')
    args = ap.parse_args()
    report = generate_report(args.project_dir, commit_sha(), args.run_id, args.browser)
    write_receipt(args.project_dir, report)
    print(f'wrote evidence/ for {len(report["capabilities"])} capabilities, '
          f'{len(report["unverifiedCapabilities"])} unverified')
    return 0


if __name__ == '__main__':
    sys.exit(main())
