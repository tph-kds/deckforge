#!/usr/bin/env python3
"""Release gate: every core eval case must score 100 under the current condition.

Exit 0 only when every case passes; exit 1 otherwise. Intended for CI before a
skill release is tagged.
"""
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / 'scripts' / 'evals' / 'run_skill_eval.py'
CASES = ROOT / 'skills' / 'deckforge-skill-evaluator' / 'evals' / 'core-eval-cases.json'


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--workdir', type=Path, default=ROOT / 'examples' / '02-example')
    ap.add_argument('--condition', choices=['baseline', 'current', 'candidate'], default='current')
    ap.add_argument('--toolchain', action='append', default=['npm'])
    args = ap.parse_args()

    cases = json.loads(CASES.read_text(encoding='utf-8'))['cases']
    failed = []
    for case in cases:
        cmd = [sys.executable, str(RUNNER), '--case-id', case['id'], '--condition', args.condition, '--workdir', str(args.workdir)]
        for tc in args.toolchain:
            cmd += ['--toolchain', tc]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if proc.returncode != 0:
            failed.append(f"{case['id']}: runner exited {proc.returncode}")
            continue
        result = json.loads(proc.stdout)
        if result.get('score') != 100:
            failed.append(f"{case['id']}: score {result.get('score')}/100 under {args.condition}")
    if failed:
        print('RELEASE GATE: FAILED', file=sys.stderr)
        for f in failed:
            print('  -', f, file=sys.stderr)
        return 1
    print(f'RELEASE GATE: PASS — {len(cases)} case(s) score 100 under {args.condition}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
