#!/usr/bin/env python3
"""Check a Lighthouse report against config/performance-budget.json.

Usage:
    python scripts/validate/check_performance_budget.py --report lhr.json
    python scripts/validate/check_performance_budget.py --allow-missing
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUDGET_PATH = ROOT / 'config' / 'performance-budget.json'


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--report', type=Path)
    ap.add_argument('--allow-missing', action='store_true', help='Exit 0 when no report is provided (offline)')
    args = ap.parse_args()

    if args.report is None:
        if args.allow_missing:
            print('PERF BUDGET: no report provided; skipped (offline mode)')
            return 0
        print('ERROR: --report required unless --allow-missing', file=sys.stderr)
        return 1

    budget = json.loads(BUDGET_PATH.read_text(encoding='utf-8'))['budgets']
    lhr = json.loads(args.report.read_text(encoding='utf-8'))
    audits = lhr.get('audits', {})
    measured = {
        'lcpMs': audits.get('largest-contentful-paint', {}).get('numericValue'),
        'interactiveMs': audits.get('interactive', {}).get('numericValue'),
        'totalByteWeight': audits.get('total-byte-weight', {}).get('numericValue'),
    }
    failures = []
    for key, limit in budget.items():
        value = measured.get(key)
        if value is None:
            continue
        if value > limit:
            failures.append(f'{key}: {value:,.0f} exceeds budget {limit:,.0f}')
    if failures:
        for f in failures:
            print('ERROR:', f, file=sys.stderr)
        return 1
    print('PERF BUDGET: PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
