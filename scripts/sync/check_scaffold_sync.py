"""Drift-guard: scaffold starter-components must stay byte-in-sync with 02-example.

Excludes:
- deck/seed.ts           (trimmed: loadSeedDeck + deck.json import removed)
- deck/commands.ts       (kept verbatim, but listed here for clarity/explicit whitelist)
- deck-types.ts          (intentional shim, not a copy)
- export/index.ts        (intentional barrel, not a copy)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANON = ROOT / "examples" / "02-example" / "src"
SCAFFOLD = ROOT / "skills" / "deckforge" / "starter-components"

# (02-example rel path) -> (scaffold rel path)
VERBATIM = [
    # deck layer (Task 1-2)
    "deck/types.ts", "deck/layout.ts", "deck/layout-manifest.json",
    "deck/assets.ts", "deck/themes.ts", "deck/slot-validation.ts",
    "deck/chart-spec.ts",
    "deck/geometry-resolver.ts", "deck/scrollbars/scrollbarTypes.ts",
    "deck/commands.ts",
    # export layer (Task 3-4)
    "export/geometry.ts", "export/snapshot.ts", "export/prepare-export.ts",
    "export/self-contained.ts", "export/resolved-theme.ts",
    "export/image-dimensions.ts", "export/export-scene.ts",
    "export/fidelity/svg/svg-chart.ts", "export/fidelity/svg/svg-raster.ts",
    "export/pptx/export-utils.ts", "export/pptx/pptx-placeholder.ts",
    "export/pptx/block-exporters/process.ts",
    "export/export-dialog.tsx", "export/export-preflight.ts",
    "export/export-types.ts",
    "export/fidelity/content-parity.ts", "export/fidelity/fidelity-report.ts",
    "export/pptx/pptx-assets.ts", "export/pptx/pptx-context.ts",
    "export/pptx/pptx-exporter.ts", "export/pptx/pptx-fallback-renderer.ts",
    "export/pptx/pptx-fonts.ts", "export/pptx/pptx-theme.ts",
    "export/pptx/pptx-verifier.ts",
    "export/pptx/block-exporters/chart.ts",
    "export/pptx/block-exporters/diagram.ts",
    "export/pptx/block-exporters/fallback.ts",
    "export/pptx/block-exporters/image.ts",
    "export/pptx/block-exporters/index.ts",
    "export/pptx/block-exporters/shape.ts",
    "export/pptx/block-exporters/table.ts",
    "export/pptx/block-exporters/text.ts",
    "export/pptx/block-exporters/video.ts",
]

# seed.ts is trimmed: compare everything except loadSeedDeck and the deck.json import.
SEED_KEEP = [
    "export function newId",
    "export function makeTextBlock",
    "export function makeHeadingBlock",
    "export function migrateLayoutBindings",
    "export function migrateLegacyBlockSlots",
    "export function migrateLegacyDeckSlots",
]


def check() -> list[str]:
    issues: list[str] = []
    for rel in VERBATIM:
        c = CANON / rel
        s = SCAFFOLD / rel
        if not s.exists():
            issues.append(f"MISSING scaffold file: {rel}")
            continue
        if c.read_bytes() != s.read_bytes():
            issues.append(f"DRIFT (byte difference): {rel}")

    # trimmed seed.ts verification
    seed_path = SCAFFOLD / "deck" / "seed.ts"
    if not seed_path.exists():
        issues.append("MISSING scaffold file: deck/seed.ts")
    else:
        text = seed_path.read_text(encoding="utf-8")
        if "loadSeedDeck" in text:
            issues.append("DRIFT: scaffold deck/seed.ts must not contain loadSeedDeck")
        if "deck.json" in text:
            issues.append("DRIFT: scaffold deck/seed.ts must not import deck.json")
        for sym in SEED_KEEP:
            if sym not in text:
                issues.append(f"DRIFT: scaffold deck/seed.ts missing {sym}")
    return issues


def main() -> int:
    if "--check" not in sys.argv:
        print("usage: python scripts/sync/check_scaffold_sync.py --check")
        return 2
    issues = check()
    if issues:
        print("scaffold sync check FAILED:")
        for issue in issues:
            print(f"  - {issue}")
        return 1
    print("OK: starter-components deck/ + export/ are in sync with examples/02-example")
    return 0


if __name__ == "__main__":
    sys.exit(main())
