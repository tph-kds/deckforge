"""Audit that export/index.ts re-exports every public symbol of the scaffold export/ modules."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BARREL = ROOT / "skills" / "deckforge" / "starter-components" / "export" / "index.ts"
EXPORT_DIR = BARREL.parent
MODULES = ("export-types.ts", "export-preflight.ts", "export-dialog.tsx",
           "snapshot.ts", "prepare-export.ts", "self-contained.ts",
           "resolved-theme.ts", "geometry.ts", "image-dimensions.ts",
           "export-scene.ts", "fidelity/content-parity.ts",
           "fidelity/fidelity-policy.ts", "fidelity/fidelity-report.ts",
           "fidelity/fidelity-types.ts", "fidelity/representation-planner.ts",
           "fidelity/svg/svg-chart.ts", "fidelity/svg/svg-diagram.ts",
           "fidelity/svg/svg-raster.ts", "fidelity/svg/svg-snapshot.ts",
           "pptx/pptx-exporter.ts", "pptx/pptx-verifier.ts", "pptx/pptx-context.ts",
           "pptx/pptx-theme.ts", "pptx/pptx-fonts.ts", "pptx/pptx-assets.ts",
           "pptx/pptx-fallback-renderer.ts", "pptx/pptx-placeholder.ts",
           "pptx/export-utils.ts", "pptx/block-exporters/chart.ts",
           "pptx/block-exporters/diagram.ts", "pptx/block-exporters/fallback.ts",
           "pptx/block-exporters/image.ts", "pptx/block-exporters/index.ts",
           "pptx/block-exporters/process.ts", "pptx/block-exporters/shape.ts",
           "pptx/block-exporters/table.ts", "pptx/block-exporters/text.ts",
           "pptx/block-exporters/video.ts")

SYMBOL = re.compile(r"^export\s+(?:type\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|const|class|interface|type|enum|var|let)\s+([A-Za-z_$][\w$]*)", re.MULTILINE)

def exported_symbols(path: Path) -> set[str]:
    return {m.group(1) for m in SYMBOL.finditer(path.read_text(encoding="utf-8"))}

def main() -> int:
    barrel_text = BARREL.read_text(encoding="utf-8")
    missing: list[str] = []
    for rel in MODULES:
        for sym in exported_symbols(EXPORT_DIR / rel):
            if not re.search(rf"\b{re.escape(sym)}\b", barrel_text):
                missing.append(f"{rel}: {sym}")
    if missing:
        print("Barrel is missing exports for:")
        for item in missing:
            print(f"  {item}")
        return 1
    print(f"OK: barrel re-exports all symbols from {len(MODULES)} modules")
    return 0

if __name__ == "__main__":
    sys.exit(main())
