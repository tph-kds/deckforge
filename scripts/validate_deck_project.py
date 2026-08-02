#!/usr/bin/env python3
"""Validate a DeckProject 2.0 document against JSON Schema plus catalog references."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "skills" / "deckforge" / "assets"
SCHEMA_PATH = ASSETS / "deck-project.schema.json"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"file not found: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: line {exc.lineno}, column {exc.colno}: {exc.msg}")


def path_label(error) -> str:
    return ".".join(str(part) for part in error.absolute_path) or "$"


def catalog_ids(name: str, key: str) -> set[str]:
    data = load_json(ASSETS / name)
    return {str(item[key]) for item in data}


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_deck_project.py <deck.json>")

    path = Path(sys.argv[1])
    deck = load_json(path)
    schema = load_json(SCHEMA_PATH)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(deck), key=lambda err: list(err.absolute_path))
    if errors:
        for error in errors[:30]:
            print(f"ERROR: {path_label(error)}: {error.message}", file=sys.stderr)
        if len(errors) > 30:
            print(f"ERROR: {len(errors) - 30} additional schema errors omitted", file=sys.stderr)
        raise SystemExit(1)

    slide_ids = [slide["id"] for slide in deck["slides"]]
    block_ids = [block["id"] for slide in deck["slides"] for block in slide["blocks"]]
    interaction_ids = [item["id"] for slide in deck["slides"] for item in slide.get("interactions", [])]
    for label, values in (("slide", slide_ids), ("block", block_ids), ("interaction", interaction_ids)):
        if len(values) != len(set(values)):
            fail(f"duplicate {label} IDs")

    templates = catalog_ids("template-manifest.json", "id")
    themes = catalog_ids("theme-manifest.json", "id")
    layouts = catalog_ids("layout-manifest.json", "id")
    blocks = catalog_ids("block-manifest.json", "type")
    animations = catalog_ids("animation-manifest.json", "id")
    interactions = catalog_ids("interaction-manifest.json", "type")

    template_id = deck.get("meta", {}).get("templateId")
    if template_id and template_id not in templates:
        fail(f"unknown meta.templateId: {template_id}")
    theme_id = deck["theme"]["id"]
    if theme_id not in themes:
        fail(f"unknown theme.id: {theme_id}")

    known_sources = {source["id"] for source in deck.get("sources", [])}
    for slide in deck["slides"]:
        if slide["layout"] not in layouts:
            fail(f"slide {slide['id']}: unknown layout {slide['layout']}")
        for source_id in slide.get("sources", []):
            if source_id not in known_sources:
                fail(f"slide {slide['id']}: unknown source ID {source_id}")
        for block in slide["blocks"]:
            if block["type"] not in blocks:
                fail(f"block {block['id']}: unknown block type {block['type']}")
            animation = block.get("animation")
            if animation and animation["id"] not in animations:
                fail(f"block {block['id']}: unknown animation {animation['id']}")
            for source_id in block.get("sourceIds", []):
                if source_id not in known_sources:
                    fail(f"block {block['id']}: unknown source ID {source_id}")
        for interaction in slide.get("interactions", []):
            if interaction["type"] not in interactions:
                fail(f"interaction {interaction['id']}: unknown type {interaction['type']}")

    print(
        f"OK: {path} ({len(slide_ids)} slides, {len(block_ids)} blocks, "
        f"{len(interaction_ids)} interactions)"
    )


if __name__ == "__main__":
    main()
