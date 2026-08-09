#!/usr/bin/env python3
"""Deterministic skill evaluation runner.

Runs a case's assertions (shell commands) for a given condition and writes a
skill-eval-result document per the schema. Baseline/current/candidate comparison
is produced by running the same case under each condition and diffing scores.

Usage:
    python scripts/evals/run_skill_eval.py --case-id editable-deck --condition current [--workdir DIR]
"""
from __future__ import annotations
import argparse, json, os, shutil, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / 'skills' / 'deckforge-skill-evaluator' / 'evals' / 'core-eval-cases.json'
PROFILES = ROOT / 'config' / 'evaluation-profiles.json'


def load_cases() -> list[dict]:
    return json.loads(CASES.read_text(encoding='utf-8'))['cases']


def run_eval_case(case: dict, condition: str, toolchain: list[str], workdir: Path) -> dict:
    started = time.perf_counter()
    assertions: dict[str, bool] = {}
    failures: list[str] = []
    for assertion in case.get('assertions', []):
        name = assertion['name']
        try:
            cmd = list(assertion['cmd'])
            if toolchain and cmd and cmd[0] in toolchain and cmd[0] != toolchain[0]:
                cmd = [toolchain[0]] + cmd
            if os.name == 'nt' and cmd:
                resolved = shutil.which(cmd[0])
                if resolved:
                    cmd = [resolved] + cmd[1:]
            proc = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=600)
            ok = proc.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            ok = False
            failures.append(f'{name}: {exc}')
        assertions[name] = ok
        if not ok:
            failures.append(name)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return {
        'schemaVersion': '1.0.0',
        'condition': condition,
        'caseId': case['id'],
        'score': int(100 * sum(assertions.values()) / max(len(assertions), 1)),
        'assertions': assertions,
        'runtimeMs': elapsed_ms,
        'contextTokens': case.get('contextTokens', 0),
        'failures': failures,
        'runAt': datetime.now(timezone.utc).isoformat(),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--case-id', required=True)
    ap.add_argument('--condition', choices=['baseline', 'current', 'candidate'], required=True)
    ap.add_argument('--workdir', type=Path, default=ROOT)
    ap.add_argument('--toolchain', action='append', default=[])
    args = ap.parse_args()
    case = next((c for c in load_cases() if c['id'] == args.case_id), None)
    if case is None:
        print(f'unknown case: {args.case_id}', file=sys.stderr)
        return 1
    result = run_eval_case(case, args.condition, args.toolchain, args.workdir)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
