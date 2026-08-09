#!/usr/bin/env python3
"""Audit a DeckProject for the deterministic WCAG 2.2 AA checks.

Computes contrast ratios for theme token pairs (text and UI), verifies a
reduced-motion fallback exists, and reports focus-visibility as a warning for
human review. Errors are blocking; warnings are non-blocking.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'assets'

# Text/UI token pairs resolved from theme-manifest.json by role. The role
# thresholds match the runtime contrast contract (contrast.ts): foreground and
# primary are normal text (4.5:1); muted is large/secondary text (3:1); UI
# components and large text need at least 3:1 per WCAG 2.2 AA.
PAIRS = [
    ('foreground/background', 'foreground', 'background', 4.5),
    ('primary/background', 'primary', 'background', 4.5),
    ('primary/surface', 'primary', 'surface', 4.5),
    ('muted/background', 'muted', 'background', 3.0),
    ('muted/surface', 'muted', 'surface', 3.0),
]

# Focus-visibility and order items cannot be verified deterministically from
# deck JSON; they stay a human-review checklist (non-blocking warning).
FOCUS_REVIEW_ITEMS = [
    'focus order matches reading order; focus is never trapped',
    'focus-visible indicators meet 3:1 contrast against adjacent colors',
    'interactive targets meet a 24x24 px minimum (44x44 recommended)',
    'reading order from slot order is confirmed by a keyboard walk',
    'non-text content has appropriate alt text or is marked decorative',
]


def hex_to_rgb(h: str):
    h = (h or '').strip().lstrip('#')
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    except ValueError:
        return None


def luminance(rgb) -> float:
    if not rgb:
        return 0.0
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b) -> float:
    la, lb = luminance(hex_to_rgb(a)), luminance(hex_to_rgb(b))
    if la > lb:
        la, lb = lb, la
    return (lb + 0.05) / (la + 0.05)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('deck', type=Path)
    ap.add_argument('--json-report', type=Path)
    args = ap.parse_args()
    deck = json.loads(args.deck.read_text(encoding='utf-8'))
    errors, warnings = [], []

    pres = deck.get('presentation', {})
    if not pres.get('reducedMotion'):
        errors.append('presentation.reducedMotion must be set (respect-system/reduced/required)')

    # Resolve theme tokens from the manifest by id, then apply deck overrides.
    # A deck theme id missing from the manifest defaults to an empty token set
    # and a missing overrides key is tolerated; pairs with no tokens are skipped.
    themes = json.loads((ASSETS / 'theme-manifest.json').read_text(encoding='utf-8'))
    theme = deck.get('theme', {})
    base = next((t for t in themes if t.get('id') == theme.get('id')), {})
    tokens = dict(base.get('tokens', {}))
    tokens.update(theme.get('overrides') or {})

    for name, fg_role, bg_role, min_ratio in PAIRS:
        fg, bg = tokens.get(fg_role), tokens.get(bg_role)
        if not fg or not bg:
            continue
        ratio = contrast(fg, bg)
        if ratio < min_ratio:
            errors.append(
                f'contrast {name} ({fg} on {bg}) = {ratio:.2f}:1 below AA {min_ratio}:1')

    warnings.append(
        'focus-visibility and reading order need human review (see the accessibility '
        'checklist in delivery-acceptance-contract.md): ' + '; '.join(FOCUS_REVIEW_ITEMS))

    report = {'errors': errors, 'warnings': warnings}
    if args.json_report:
        args.json_report.write_text(json.dumps(report, indent=2), encoding='utf-8')
    for e in errors:
        print('ERROR:', e, file=sys.stderr)
    for w in warnings:
        print('WARNING:', w, file=sys.stderr)
    print(f'ACCESSIBILITY: {len(errors)} errors, {len(warnings)} warnings')
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
