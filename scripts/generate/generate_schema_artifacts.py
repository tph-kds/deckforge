#!/usr/bin/env python3
"""Generate TypeScript types, runtime validators, documentation, and AI manifests
from the canonical DeckProject JSON Schema (single source of truth).

Reads:
    schemas/deck-project.schema.json   (canonical)

Writes into schemas/generated/:
    deck-project.types.ts              — generated TypeScript model
    deck-project.validator.ts          — self-contained runtime validator
    DECK-PROJECT.md                    — human documentation
    deck-project.ai-manifest.json      — compact AI manifest

Supports --check (read-only): regenerate into memory and compare with committed
output without touching the working tree. CI runs `npm run schema:check`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "schemas" / "deck-project.schema.json"
OUT_DIR = ROOT / "schemas" / "generated"
TYPES_PATH = OUT_DIR / "deck-project.types.ts"
VALIDATOR_PATH = OUT_DIR / "deck-project.validator.ts"
DOC_PATH = OUT_DIR / "DECK-PROJECT.md"
AI_MANIFEST_PATH = OUT_DIR / "deck-project.ai-manifest.json"

TS_NAME = {"meta": "Meta", "canvas": "Canvas", "theme": "Theme", "autoplay": "Autoplay"}


def ts_identifier(name: str) -> str:
    if name in TS_NAME:
        return TS_NAME[name]
    return name[0].upper() + name[1:]


def ref_name(ref: str) -> str:
    return ref.rsplit("/", 1)[-1]


def literal_type(node: dict) -> str | None:
    if "const" in node:
        value = node["const"]
        return json.dumps(value)
    if "enum" in node:
        values = node["enum"]
        if all(isinstance(v, (str, int, float, bool)) for v in values):
            return " | ".join(json.dumps(v) for v in values)
    return None


def primitive_type(node: dict) -> str | None:
    t = node.get("type")
    if t == "string":
        return "string"
    if t in ("integer", "number"):
        return "number"
    if t == "boolean":
        return "boolean"
    if t == "null":
        return "null"
    return None


def ts_type(node: dict, indent: int = 0) -> str:
    pad = "  " * indent
    if "$ref" in node:
        return f"$defs.{ts_identifier(ref_name(node['$ref']))}"
    if "allOf" in node:
        parts = [ts_type(item, indent) for item in node["allOf"]]
        return " & ".join(parts)
    if "oneOf" in node or "anyOf" in node:
        parts = [ts_type(item, indent) for item in node.get("oneOf") or node.get("anyOf")]
        return " | ".join(parts) or "unknown"
    literal = literal_type(node)
    if literal is not None:
        return literal
    primitive = primitive_type(node)
    if primitive is not None:
        return primitive
    if node.get("type") == "array":
        items = ts_type(node.get("items", {}), indent)
        return f"Array<{items}>"
    if node.get("type") == "object" or "properties" in node:
        return object_type(node, indent)
    if "additionalProperties" in node and isinstance(node.get("additionalProperties"), dict):
        value = ts_type(node["additionalProperties"], indent)
        return f"Record<string, {value}>"
    return "unknown"


def ts_key(key: str) -> str:
    if key.isidentifier():
        return key
    return json.dumps(key)


def object_type(node: dict, indent: int = 0) -> str:
    pad = "  " * indent
    inner = "  " * (indent + 1)
    properties = node.get("properties", {})
    required = set(node.get("required", []))
    if not properties:
        return "Record<string, unknown>"
    lines = ["{"]
    for key in sorted(properties):
        sub = properties[key]
        opt = "" if key in required else "?"
        lines.append(f"{inner}{ts_key(key)}{opt}: {ts_type(sub, indent + 1)};")
    lines.append(f"{pad}}}")
    return "\n".join(lines)


def emit_types(schema: dict) -> str:
    defs = schema.get("$defs", {})
    lines = [
        "// GENERATED FILE — do not edit by hand.",
        "// Source of truth: schemas/deck-project.schema.json",
        f'// Regenerate with: npm run schema:generate (generator: deckforge @ {schema.get("generator", {}).get("version", "0.0.0")})',
        "",
        "/** Type aliases for common JSON Schema defs. */",
        "export namespace $defs {",
    ]
    # Emit simple aliases (string/number patterns) first.
    for name, node in defs.items():
        t = ts_type(node, 1)
        lines.append(f"  export type {ts_identifier(name)} = {t};")
    lines.append("}")
    lines.append("")
    lines.append(f"export interface DeckProject {object_type(schema, 0)}")
    lines.append("")
    lines.append(f"export const SCHEMA_VERSION = {json.dumps(str(schema.get('schemaVersion', schema.get('properties', {}).get('schemaVersion', {}).get('const', ''))))};")
    lines.append("")
    return "\n".join(lines)


def emit_validator(schema: dict) -> str:
    defs = schema.get("$defs", {})
    defs_json = json.dumps(defs, indent=2, sort_keys=True)
    return f'''// GENERATED FILE — do not edit by hand.
// Source of truth: schemas/deck-project.schema.json
// Regenerate with: npm run schema:generate
import type {{ DeckProject }} from "./deck-project.types";

export interface ValidationIssue {{
  path: string;
  message: string;
}}

export interface ValidationResult {{
  valid: boolean;
  issues: ValidationIssue[];
}}

const DEFS: Record<string, unknown> = {defs_json};

function typeOf(value: unknown): string {{
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}}

function matches(node: unknown, value: unknown, path: string, issues: ValidationIssue[]): void {{
  if (!node || typeof node !== "object") return;
  const schema = node as Record<string, any>;
  if (schema.$ref) {{
    const name = String(schema.$ref).split("/").pop() ?? "";
    const target = DEFS[name];
    if (target) matches(target, value, path, issues);
    return;
  }}
  if (schema.anyOf) {{
    for (const option of schema.anyOf) {{
      const local: ValidationIssue[] = [];
      matches(option, value, path, local);
      if (local.length === 0) return;
    }}
    issues.push({{ path: path || "$", message: "value matches no anyOf option" }});
    return;
  }}
  if (schema.oneOf) {{
    let count = 0;
    for (const option of schema.oneOf) {{
      const local: ValidationIssue[] = [];
      matches(option, value, path, local);
      if (local.length === 0) count += 1;
    }}
    if (count !== 1) {{
      issues.push({{ path: path || "$", message: "value must match exactly one oneOf option" }});
    }}
    return;
  }}
  if (schema.enum) {{
    if (!schema.enum.some((item: unknown) => JSON.stringify(item) === JSON.stringify(value))) {{
      issues.push({{ path: path || "$", message: `value ${{JSON.stringify(value)}} is not one of the allowed enum values` }});
    }}
    return;
  }}
  if (schema.const !== undefined) {{
    if (JSON.stringify(schema.const) !== JSON.stringify(value)) {{
      issues.push({{ path: path || "$", message: `value must equal ${{JSON.stringify(schema.const)}}` }});
    }}
    return;
  }}
  const expected = schema.type;
  if (expected && typeof expected === "string" && expected !== typeOf(value)) {{
    if (!(expected === "number" && typeOf(value) === "number")) {{
      issues.push({{ path: path || "$", message: `expected type "${{expected}}", got "${{typeOf(value)}}"` }});
      return;
    }}
  }}
  if (schema.type === "array" || (expected === "array")) {{
    if (!Array.isArray(value)) {{
      issues.push({{ path: path || "$", message: "expected array" }});
      return;
    }}
    const items = schema.items;
    if (items) {{
      value.forEach((item, index) => matches(items, item, `${{path}}[${{index}}]`, issues));
    }}
    return;
  }}
  if ((schema.type === "object" || schema.properties) && value && typeof value === "object" && !Array.isArray(value)) {{
    const record = value as Record<string, unknown>;
    if (schema.additionalProperties === false) {{
      const allowed = new Set(Object.keys(schema.properties ?? {{}}));
      for (const key of Object.keys(record)) {{
        if (!allowed.has(key)) {{
          issues.push({{ path: `${{path || "$"}}.${{key}}`, message: "additional property not allowed" }});
        }}
      }}
    }}
    for (const key of Object.keys(schema.properties ?? {{}})) {{
      const sub = (schema.properties as Record<string, unknown>)[key];
      const childPath = path ? `${{path}}.${{key}}` : key;
      if (record[key] === undefined) {{
        const required = Array.isArray(schema.required) && schema.required.includes(key);
        if (required) issues.push({{ path: childPath, message: "required property is missing" }});
        continue;
      }}
      matches(sub, record[key], childPath, issues);
    }}
    return;
  }}
}}

export function validateDeckProject(value: unknown): ValidationResult {{
  const issues: ValidationIssue[] = [];
  matches({{ type: "object", properties: {{
    schemaVersion: {{ type: "string" }},
    meta: {{ type: "object" }},
    canvas: {{ type: "object" }},
    theme: {{ type: "object" }},
    presentation: {{ type: "object" }},
    editor: {{ type: "object" }},
    slides: {{ type: "array" }},
    publish: {{ type: "object" }},
  }}, required: ["schemaVersion", "meta", "canvas", "theme", "presentation", "editor", "slides", "publish"] }}, value, "", issues);
  return {{ valid: issues.length === 0, issues }};
}}

export function isValidDeckProject(value: unknown): value is DeckProject {{
  return validateDeckProject(value).valid;
}}
'''


def emit_docs(schema: dict) -> str:
    defs = schema.get("$defs", {})
    root_required = schema.get("required", [])
    lines = [
        "# DeckProject 2.1 — Generated Reference",
        "",
        "> GENERATED FILE — do not edit by hand. Derived from `schemas/deck-project.schema.json`.",
        "",
        "This reference is produced by `scripts/generate/generate_schema_artifacts.py` from the canonical JSON Schema.",
        "",
        "## Root document",
        "",
        f'- `schemaVersion`: {schema.get("properties", {}).get("schemaVersion", {}).get("const", "2.1")}',
    ]
    properties = schema.get("properties", {})
    lines.append("- Required properties: " + ", ".join(f"`{name}`" for name in root_required))
    lines.append("")
    lines.append("| Property | Type | Required |")
    lines.append("|---|---|---|")
    for name in sorted(properties):
        required = "yes" if name in root_required else "no"
        lines.append(f"| `{name}` | `{name in defs and 'object' or '…'}` | {required} |")
    lines.append("")
    lines.append("## Defined types")
    lines.append("")
    for name in sorted(defs):
        lines.append(f"### `{ts_identifier(name)}`")
        sub = defs[name]
        sub_type = sub.get("type", "object")
        lines.append(f"- Schema type: `{sub_type}`")
        if sub.get("properties"):
            lines.append("- Properties:")
            for prop in sorted(sub["properties"]):
                req = "yes" if prop in sub.get("required", []) else "no"
                lines.append(f"  - `{prop}` (required: {req})")
        elif sub.get("enum"):
            lines.append("- Enum: " + ", ".join(f"`{v}`" for v in sub["enum"]))
        lines.append("")
    return "\n".join(lines)


def emit_ai_manifest(schema: dict) -> str:
    defs = schema.get("$defs", {})
    properties = schema.get("properties", {})
    return json.dumps(
        {
            "$schema": "https://deckforge.dev/schemas/ai-manifest.schema.json",
            "name": "deck-project",
            "schemaVersion": str(properties.get("schemaVersion", {}).get("const", "2.1")),
            "description": schema.get("description", "DeckProject 2.1"),
            "requiredProperties": schema.get("required", []),
            "properties": {name: str(properties.get(name, {}).get("type", "object")) for name in sorted(properties)},
            "defs": {name: str(defs.get(name, {}).get("type", "object")) for name in sorted(defs)},
            "generator": {"name": "deckforge", "version": schema.get("generator", {}).get("version", "0.0.0")},
        },
        indent=2,
        sort_keys=True,
    )


def generate(schema: dict) -> dict[str, str]:
    return {
        "deck-project.types.ts": emit_types(schema),
        "deck-project.validator.ts": emit_validator(schema),
        "DECK-PROJECT.md": emit_docs(schema),
        "deck-project.ai-manifest.json": emit_ai_manifest(schema),
    }


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true", help="Verify committed artifacts match generated output (read-only).")
    args = ap.parse_args()

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    artifacts = generate(schema)

    if args.check:
        drift = 0
        for filename, content in artifacts.items():
            path = OUT_DIR / filename
            if not path.exists():
                print(f"ERROR: missing generated artifact: {path}", file=sys.stderr)
                drift += 1
                continue
            if path.read_text(encoding="utf-8") != content:
                print(f"DRIFT: {filename} does not match generated output", file=sys.stderr)
                drift += 1
        if drift:
            print(f"ERROR: {drift} generated artifact(s) drifted; run `npm run schema:generate`.", file=sys.stderr)
            return 1
        print("OK: generated schema artifacts are in sync")
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, content in artifacts.items():
        (OUT_DIR / filename).write_text(content, encoding="utf-8")
        print(f"wrote schemas/generated/{filename} [{sha(content)}]")
    print("OK: schema artifacts regenerated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
