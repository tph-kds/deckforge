#!/usr/bin/env python3
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
required = ['README.md','AGENTS.md','CLAUDE.md','rules/README.md','rules/repository-boundaries.md','rules/design-quality.md','rules/security-rules.md','skills/deckforge/SKILL.md','skills/deckforge/system-prompt.md']
errors = [f'missing: {p}' for p in required if not (root / p).exists()]
for forbidden in ['.env','apps/production-server','prisma/schema.prisma','secrets']:
    if (root / forbidden).exists(): errors.append(f'forbidden path: {forbidden}')
if errors:
    print('\n'.join('ERROR: '+e for e in errors), file=sys.stderr); raise SystemExit(1)
print('OK: repository rules and boundaries')
