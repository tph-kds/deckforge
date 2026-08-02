#!/usr/bin/env python3
from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
errors=[]; count=0
for skill in sorted((root/'skills').glob('*/SKILL.md')):
    count+=1; text=skill.read_text(encoding='utf-8')
    if not text.startswith('---\n'): errors.append(f'{skill}: missing YAML frontmatter')
    for key in ['name:','description:','version:']:
        if key not in text[:1200]: errors.append(f'{skill}: missing {key}')
    if len(text.split())<60: errors.append(f'{skill}: too thin')
    name=re.search(r'^name:\s*(.+)$',text,re.M)
    if name and name.group(1).strip()!=skill.parent.name: errors.append(f'{skill}: name does not match folder')
if errors:
    print('\n'.join('ERROR: '+e for e in errors),file=sys.stderr); raise SystemExit(1)
print(f'OK: {count} skills linted')
