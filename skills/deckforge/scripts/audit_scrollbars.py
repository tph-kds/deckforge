#!/usr/bin/env python3
"""Audit that a generated project implements the DeckForge scrollbar system.

Static source audit (no browser runtime) verifying:
- themed custom scrollbars on scrollable surfaces,
- cross-browser fallbacks (WebKit + Firefox),
- stable gutters and contained overscroll,
- reduced-motion, forced-colors, and coarse-pointer behavior,
- slide stage and fullscreen presenter are never scrollable,
- presenter fullscreen body lock and lifecycle hooks,
- speaker notes scroll outside the audience stage,
- semantic ScrollSurface wrappers and theme mappings,
- no wheel-event interception to fake smoothness.
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path

TEXT_EXT = {'.html', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.css', '.scss', '.json', '.md'}
SKIP = {'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'skill-zips', '.agents', '.claude', '.codex', '.grok', '.gemini', '.cursor', '.windsurf', '.roo', '.cline'}


def corpus(root: Path):
    chunks = []
    files = []
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT or any(part in SKIP for part in p.parts):
            continue
        try:
            t = p.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        if len(t) > 2_000_000:
            continue
        chunks.append(f'\nFILE:{p.relative_to(root)}\n{t}')
        files.append(p)
    return '\n'.join(chunks).lower(), files


def has(text, pattern):
    return re.search(pattern, text, re.I | re.S) is not None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project', type=Path)
    ap.add_argument('--json-report', type=Path)
    a = ap.parse_args()
    root = a.project.resolve()
    if not root.is_dir():
        raise SystemExit(f'ERROR: project directory not found: {root}')
    text, files = corpus(root)
    checks = []

    def check(id_, label, ok):
        checks.append({'id': id_, 'label': label, 'ok': bool(ok)})

    check('themed', 'Theme-aware custom scrollbar styling', has(text, r'::-\s*webkit-scrollbar|scrollbar-color|data-scroll-surface|data-scrollbar-style|--scrollbar-width'))
    check('webkit-track-thumb', 'WebKit track and thumb styling', has(text, r'::-\s*webkit-scrollbar-track') and has(text, r'::-\s*webkit-scrollbar-thumb'))
    check('firefox-fallback', 'Firefox scrollbar-color fallback', has(text, r'scrollbar-width:\s*thin') and has(text, r'scrollbar-color'))
    check('gutter-stable', 'Stable scrollbar gutter', has(text, r'scrollbar-gutter'))
    check('overscroll-contained', 'Overscroll contained', has(text, r'overscroll-behavior:\s*contain'))
    check('smooth-programmatic', 'Smooth programmatic scrolling', has(text, r'scroll-behavior:\s*smooth'))
    check('reduced-motion', 'Reduced-motion scroll override', has(text, r'prefers-reduced-motion[\s\S]{0,500}scroll'))
    check('forced-colors', 'Forced-colors override', has(text, r'forced-colors'))
    check('coarse-pointer', 'Coarse-pointer native fallback', has(text, r'pointer:\s*coarse'))
    check('stage-not-scrollable', 'Slide stage never scrollable', has(text, r'slide[-_ ]stage[^{]{0,120}\{[^}]{0,300}overflow:\s*hidden'))
    check('presenter-hidden', 'Presenter shell overflow hidden', has(text, r'presenter[-_ ]?shell[^{]{0,120}\{[^}]{0,300}overflow:\s*hidden'))
    check('presenter-scrollbar-none', 'Presenter tree hides scrollbars', has(text, r'presenter[-_ ]stage[^{]{0,120}\{[^}]{0,200}(scrollbar-width:\s*none|::-webkit-scrollbar[\s\S]{0,120}display:\s*none)'))
    check('fullscreen-body-lock', 'Fullscreen body scroll lock', has(text, r'presentation[-_ ]?mode') and has(text, r'overflow:\s*hidden'))
    check('lifecycle-restore', 'Fullscreen lifecycle save/restore', has(text, r'fullscreenchange|requestfullscreen') and has(text, r'previousscroll|scrollx|scrollto'))
    check('theme-mapping', 'Theme-to-scrollbar mapping', has(text, r'data-scrollbar-style|scrollbar-style') or has(text, r'"scrollbar"') or has(text, r'scrollbarmapping'))
    check('semantic-surface', 'Semantic scroll-surface wrapper', has(text, r'data-scroll-surface|scroll-surface'))
    check('speaker-notes-scroll', 'Speaker notes scroll independently', has(text, r'speaker[-_ ]?notes[\s\S]{0,300}overflow') or has(text, r'overflow[\s\S]{0,300}speaker[-_ ]?notes'))
    check('no-wheel-intercept', 'No wheel-event interception', not has(text, r'scrolltop\s*\+?=\s*event\.delta|preventdefault\(\).{0,80}scrolltop|event\.deltay.{0,80}preventdefault'))

    missing = [c for c in checks if not c['ok']]
    report = {'project': str(root), 'scannedFiles': len(files), 'checks': checks, 'missing': [c['id'] for c in missing]}
    if a.json_report:
        a.json_report.write_text(__import__('json').dumps(report, indent=2), encoding='utf-8')
    for c in checks:
        print(('PASS' if c['ok'] else 'FAIL') + f": {c['label']}")
    print(f'SCROLLBARS: {len(checks) - len(missing)}/{len(checks)} checks passed across {len(files)} files')
    if missing:
        print('ERROR: missing scrollbar requirements: ' + ', '.join(c['id'] for c in missing), file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
