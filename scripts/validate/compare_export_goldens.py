#!/usr/bin/env python3
"""Compare exported artifacts against committed goldens.

Verifies that every expected golden exists in the export dir and that PNG
exports match the golden dimensions. JSON exports are compared structurally
(key presence). PPTX round-trip fidelity requires external extraction tooling
and is documented as out of scope for CI (see docs/RELEASE_PROCESS.md).

Usage:
    python scripts/validate/compare_export_goldens.py --export-dir PATH [--golden-dir PATH] [--allow-missing]
"""
from __future__ import annotations
import argparse, json, struct, sys
from pathlib import Path

DEFAULT_GOLDEN = Path(__file__).resolve().parents[2] / 'tests' / 'goldens'


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path.name}: not a PNG')
    w, h = struct.unpack('>II', data[16:24])
    return w, h


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--export-dir', type=Path, required=True)
    ap.add_argument('--golden-dir', type=Path, default=DEFAULT_GOLDEN)
    ap.add_argument('--allow-missing', action='store_true', help='Exit 0 when golden dir has no goldens yet')
    args = ap.parse_args()

    if not args.golden_dir.is_dir() and args.allow_missing:
        print('EXPORT GOLDENS: no golden dir; skipped')
        return 0

    errors = []
    for golden in sorted(args.golden_dir.glob('*')):
        artifact = args.export_dir / golden.name
        if not artifact.exists():
            errors.append(f'missing export artifact {golden.name}')
            continue
        if golden.suffix.lower() == '.png' and golden.name.startswith('slide-'):
            try:
                gw, gh = png_size(golden)
                aw, ah = png_size(artifact)
                if (gw, gh) != (aw, ah):
                    errors.append(f'{golden.name}: golden {gw}x{gh} != export {aw}x{ah}')
            except ValueError as exc:
                errors.append(str(exc))
        elif golden.suffix.lower() == '.json':
            g = json.loads(golden.read_text(encoding='utf-8'))
            a = json.loads(artifact.read_text(encoding='utf-8'))
            if set(g.keys()) - set(a.keys()):
                errors.append(f'{golden.name}: export missing keys {set(g.keys()) - set(a.keys())}')

    for e in errors:
        print('ERROR:', e, file=sys.stderr)
    print(f'EXPORT GOLDENS: {"FAIL" if errors else "PASS"} ({len(list(args.golden_dir.glob("*")))} goldens)')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
