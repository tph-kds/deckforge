#!/usr/bin/env python3
"""Validate DeckForge catalogs and their cross-references."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "skills" / "deckforge" / "assets"
CHECKS = {
    "theme-manifest.json": (30, "id"),
    "template-manifest.json": (30, "id"),
    "layout-manifest.json": (20, "id"),
    "block-manifest.json": (20, "type"),
    "animation-manifest.json": (10, "id"),
    "interaction-manifest.json": (20, "id"),
    "presenter-control-manifest.json": (15, "id"),
    "export-manifest.json": (5, "id"),
}


def load(name: str):
    return json.loads((BASE / name).read_text(encoding="utf-8"))


def main() -> None:
    errors: list[str] = []
    catalogs: dict[str, list[dict]] = {}
    for name, (minimum, key) in CHECKS.items():
        try:
            data = load(name)
        except Exception as exc:
            errors.append(f"{name}: invalid JSON: {exc}")
            continue
        catalogs[name] = data
        if not isinstance(data, list) or len(data) < minimum:
            errors.append(f"{name}: expected at least {minimum} entries")
            continue
        ids = [item.get(key) for item in data if isinstance(item, dict)]
        if len(ids) != len(data) or None in ids or len(ids) != len(set(ids)):
            errors.append(f"{name}: missing or duplicate {key}")

    if not errors:
        layouts = {item["id"] for item in catalogs["layout-manifest.json"]}
        themes = {item["id"] for item in catalogs["theme-manifest.json"]}
        block_types = {item["type"] for item in catalogs["block-manifest.json"]}
        animation_ids = {item["id"] for item in catalogs["animation-manifest.json"]}

        for template in catalogs["template-manifest.json"]:
            for step in template.get("slidePlan", []):
                if step.get("layout") not in layouts:
                    errors.append(f"template {template['id']}: unknown layout {step.get('layout')}")
            for theme in template.get("recommendedThemeIds", []):
                if theme not in themes:
                    errors.append(f"template {template['id']}: unknown theme {theme}")

        for layout in catalogs["layout-manifest.json"]:
            for block_type in layout.get("recommendedBlocks", []):
                if block_type not in block_types:
                    errors.append(f"layout {layout['id']}: unknown block type {block_type}")

        for block in catalogs["block-manifest.json"]:
            default_animation = block.get("defaultAnimation")
            if default_animation and default_animation not in animation_ids:
                errors.append(f"block {block['type']}: unknown default animation {default_animation}")

    if errors:
        print("\n".join("ERROR: " + error for error in errors), file=sys.stderr)
        raise SystemExit(1)

    summary = ", ".join(f"{name.replace('-manifest.json', '')}={len(data)}" for name, data in catalogs.items())
    print(f"OK: catalogs are valid ({summary})")


if __name__ == "__main__":
    main()
