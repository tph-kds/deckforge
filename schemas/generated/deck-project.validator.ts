// GENERATED FILE — do not edit by hand.
// Source of truth: schemas/deck-project.schema.json
// Regenerate with: npm run schema:generate
import type { DeckProject } from "./deck-project.types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const DEFS: Record<string, unknown> = {
  "animation": {
    "additionalProperties": false,
    "properties": {
      "delayMs": {
        "maximum": 30000,
        "minimum": 0,
        "type": "integer"
      },
      "durationMs": {
        "maximum": 30000,
        "minimum": 0,
        "type": "integer"
      },
      "easing": {
        "type": "string"
      },
      "id": {
        "type": "string"
      },
      "order": {
        "minimum": 0,
        "type": "integer"
      },
      "reducedMotionFallback": {
        "type": "string"
      },
      "trigger": {
        "enum": [
          "on-enter",
          "on-click",
          "with-previous",
          "after-previous",
          "on-hover",
          "on-visible"
        ]
      }
    },
    "required": [
      "id"
    ],
    "type": "object"
  },
  "asset": {
    "additionalProperties": false,
    "properties": {
      "alt": {
        "type": "string"
      },
      "credit": {
        "type": "string"
      },
      "durationMs": {
        "minimum": 0,
        "type": "integer"
      },
      "focalPoint": {
        "type": "object"
      },
      "height": {
        "minimum": 1,
        "type": "integer"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "integrity": {
        "type": "string"
      },
      "kind": {
        "enum": [
          "image",
          "video",
          "audio",
          "font",
          "data",
          "document",
          "model",
          "embed-poster"
        ]
      },
      "license": {
        "type": "string"
      },
      "mimeType": {
        "type": "string"
      },
      "posterSrc": {
        "type": "string"
      },
      "src": {
        "minLength": 1,
        "type": "string"
      },
      "transcriptSrc": {
        "type": "string"
      },
      "width": {
        "minimum": 1,
        "type": "integer"
      }
    },
    "required": [
      "id",
      "kind",
      "src"
    ],
    "type": "object"
  },
  "autoplay": {
    "additionalProperties": false,
    "properties": {
      "enabled": {
        "type": "boolean"
      },
      "intervalMs": {
        "minimum": 1000,
        "type": "integer"
      },
      "loop": {
        "type": "boolean"
      },
      "pauseOnInteraction": {
        "type": "boolean"
      }
    },
    "required": [
      "enabled"
    ],
    "type": "object"
  },
  "block": {
    "additionalProperties": false,
    "properties": {
      "allowOverlap": {
        "type": "boolean"
      },
      "alt": {
        "type": "string"
      },
      "animation": {
        "$ref": "#/$defs/animation"
      },
      "ariaLabel": {
        "type": "string"
      },
      "content": {},
      "data": {},
      "decorative": {
        "type": "boolean"
      },
      "fitPolicy": {
        "enum": [
          "wrap",
          "contain",
          "cover",
          "scroll",
          "change-layout",
          "split-slide"
        ]
      },
      "frame": {
        "$ref": "#/$defs/frame"
      },
      "groupId": {
        "$ref": "#/$defs/id"
      },
      "hidden": {
        "type": "boolean"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "locked": {
        "type": "boolean"
      },
      "positionMode": {
        "enum": [
          "slot",
          "flow",
          "freeform",
          "background"
        ]
      },
      "resolvedFrame": {
        "$ref": "#/$defs/frame"
      },
      "role": {
        "type": "string"
      },
      "slot": {
        "minLength": 1,
        "type": "string"
      },
      "sourceIds": {
        "items": {
          "$ref": "#/$defs/id"
        },
        "type": "array",
        "uniqueItems": true
      },
      "style": {
        "type": "object"
      },
      "type": {
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "id",
      "type"
    ],
    "type": "object"
  },
  "canvas": {
    "additionalProperties": false,
    "properties": {
      "aspectRatio": {
        "enum": [
          "16:9",
          "4:3",
          "custom"
        ]
      },
      "background": {
        "type": "string"
      },
      "grid": {
        "minimum": 1,
        "type": "integer"
      },
      "height": {
        "maximum": 10000,
        "minimum": 180,
        "type": "integer"
      },
      "layoutMode": {
        "enum": [
          "semantic-slots",
          "hybrid",
          "freeform"
        ]
      },
      "responsiveMode": {
        "enum": [
          "letterbox",
          "reflow",
          "hybrid"
        ]
      },
      "safeMargin": {
        "minimum": 0,
        "type": "integer"
      },
      "width": {
        "maximum": 10000,
        "minimum": 320,
        "type": "integer"
      }
    },
    "required": [
      "aspectRatio",
      "width",
      "height"
    ],
    "type": "object"
  },
  "editor": {
    "additionalProperties": false,
    "properties": {
      "allowedBlockTypes": {
        "items": {
          "type": "string"
        },
        "type": "array",
        "uniqueItems": true
      },
      "assetLibrary": {
        "type": "boolean"
      },
      "autosave": {
        "type": "boolean"
      },
      "collaboration": {
        "type": "boolean"
      },
      "commandPalette": {
        "type": "boolean"
      },
      "comments": {
        "type": "boolean"
      },
      "enabled": {
        "type": "boolean"
      },
      "guides": {
        "type": "boolean"
      },
      "history": {
        "type": "boolean"
      },
      "layoutPicker": {
        "type": "boolean"
      },
      "notes": {
        "type": "boolean"
      },
      "persistence": {
        "enum": [
          "none",
          "local-storage",
          "api",
          "host-managed"
        ]
      },
      "requiredZones": {
        "items": {
          "type": "string"
        },
        "type": "array",
        "uniqueItems": true
      },
      "routes": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "saveStatus": {
        "type": "boolean"
      },
      "shortcutHelp": {
        "type": "boolean"
      },
      "sidePanel": {
        "type": "boolean"
      },
      "snapToGrid": {
        "type": "boolean"
      },
      "themePicker": {
        "type": "boolean"
      },
      "toolbar": {
        "type": "boolean"
      }
    },
    "required": [
      "enabled",
      "toolbar",
      "history"
    ],
    "type": "object"
  },
  "embed": {
    "additionalProperties": false,
    "properties": {
      "allow": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "allowedOrigins": {
        "items": {
          "type": "string"
        },
        "type": "array",
        "uniqueItems": true
      },
      "enabled": {
        "type": "boolean"
      },
      "messageProtocolVersion": {
        "type": "string"
      },
      "referrerPolicy": {
        "type": "string"
      },
      "responsive": {
        "type": "boolean"
      },
      "sandbox": {
        "items": {
          "type": "string"
        },
        "type": "array",
        "uniqueItems": true
      },
      "title": {
        "type": "string"
      }
    },
    "required": [
      "enabled"
    ],
    "type": "object"
  },
  "experience": {
    "additionalProperties": false,
    "properties": {
      "capabilities": {
        "items": {
          "type": "string"
        },
        "type": "array",
        "uniqueItems": true
      },
      "profile": {
        "enum": [
          "editable-deck",
          "presentation-runtime",
          "published-story",
          "embedded-deck"
        ]
      },
      "routes": {
        "additionalProperties": {
          "type": "string"
        },
        "type": "object"
      },
      "surfaces": {
        "items": {
          "enum": [
            "editor",
            "presenter",
            "viewer",
            "embed-viewer"
          ]
        },
        "minItems": 1,
        "type": "array",
        "uniqueItems": true
      }
    },
    "required": [
      "profile",
      "surfaces"
    ],
    "type": "object"
  },
  "frame": {
    "additionalProperties": false,
    "properties": {
      "h": {
        "exclusiveMinimum": 0,
        "type": "number"
      },
      "rotation": {
        "maximum": 360,
        "minimum": -360,
        "type": "number"
      },
      "w": {
        "exclusiveMinimum": 0,
        "type": "number"
      },
      "x": {
        "type": "number"
      },
      "y": {
        "type": "number"
      },
      "z": {
        "type": "integer"
      }
    },
    "required": [
      "x",
      "y",
      "w",
      "h"
    ],
    "type": "object"
  },
  "id": {
    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
    "type": "string"
  },
  "interaction": {
    "additionalProperties": false,
    "properties": {
      "action": {
        "minLength": 1,
        "type": "string"
      },
      "ariaLabel": {
        "type": "string"
      },
      "audienceVisible": {
        "type": "boolean"
      },
      "fallback": {
        "type": "string"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "payload": {},
      "requiresNetwork": {
        "type": "boolean"
      },
      "targetId": {
        "type": "string"
      },
      "trigger": {
        "enum": [
          "click",
          "double-click",
          "hover",
          "focus",
          "keyboard",
          "submit",
          "slide-enter",
          "build-step",
          "timer"
        ]
      },
      "type": {
        "enum": [
          "navigation",
          "reveal",
          "toggle",
          "tabs",
          "accordion",
          "tooltip",
          "modal",
          "zoom",
          "pan",
          "filter",
          "sort",
          "poll",
          "quiz",
          "form",
          "q-and-a",
          "code-run",
          "demo",
          "media-control",
          "annotation",
          "branch",
          "external-link",
          "download",
          "copy",
          "custom-event"
        ]
      }
    },
    "required": [
      "id",
      "type",
      "trigger",
      "action"
    ],
    "type": "object"
  },
  "layoutBinding": {
    "additionalProperties": false,
    "properties": {
      "blockIds": {
        "items": {
          "$ref": "#/$defs/id"
        },
        "minItems": 1,
        "type": "array",
        "uniqueItems": true
      },
      "flow": {
        "enum": [
          "stack",
          "row",
          "grid",
          "overlay"
        ]
      },
      "gap": {
        "minimum": 0,
        "type": "number"
      },
      "slot": {
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "slot",
      "blockIds"
    ],
    "type": "object"
  },
  "meta": {
    "additionalProperties": false,
    "properties": {
      "audience": {
        "type": "string"
      },
      "authors": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "createdAt": {
        "format": "date-time",
        "type": "string"
      },
      "description": {
        "maxLength": 2000,
        "type": "string"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "language": {
        "minLength": 2,
        "type": "string"
      },
      "objective": {
        "type": "string"
      },
      "seedVersion": {
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$",
        "type": "string"
      },
      "slug": {
        "$ref": "#/$defs/slug"
      },
      "tags": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "templateId": {
        "type": "string"
      },
      "title": {
        "$ref": "#/$defs/nonEmptyString"
      },
      "updatedAt": {
        "format": "date-time",
        "type": "string"
      }
    },
    "required": [
      "id",
      "slug",
      "title",
      "language"
    ],
    "type": "object"
  },
  "nonEmptyString": {
    "minLength": 1,
    "type": "string"
  },
  "presentation": {
    "additionalProperties": false,
    "properties": {
      "autoplay": {
        "$ref": "#/$defs/autoplay"
      },
      "controls": {
        "type": "boolean"
      },
      "deepLinks": {
        "type": "boolean"
      },
      "defaultBuilds": {
        "description": "Runtime applies default entrance/build motion from the motion profile even when individual blocks declare no animation.",
        "type": "boolean"
      },
      "keyboard": {
        "type": "boolean"
      },
      "mode": {
        "enum": [
          "horizontal",
          "vertical",
          "freeform",
          "3d-coverflow"
        ]
      },
      "motionProfileId": {
        "enum": [
          "executive-subtle",
          "technical-precise",
          "education-guided",
          "pitch-dynamic",
          "seminar-editorial",
          "portfolio-showcase",
          "self-guided-calm",
          "none-accessible"
        ]
      },
      "overview": {
        "type": "boolean"
      },
      "progress": {
        "type": "boolean"
      },
      "reducedMotion": {
        "enum": [
          "respect-system",
          "always",
          "never"
        ]
      },
      "speakerView": {
        "type": "boolean"
      },
      "touch": {
        "type": "boolean"
      },
      "transition": {
        "type": "string"
      }
    },
    "required": [
      "mode",
      "transition",
      "keyboard",
      "motionProfileId",
      "reducedMotion"
    ],
    "type": "object"
  },
  "publish": {
    "additionalProperties": false,
    "properties": {
      "allowDownload": {
        "type": "boolean"
      },
      "analytics": {
        "type": "boolean"
      },
      "customDomain": {
        "type": "string"
      },
      "embed": {
        "$ref": "#/$defs/embed"
      },
      "indexing": {
        "enum": [
          "allow",
          "disallow"
        ]
      },
      "slug": {
        "$ref": "#/$defs/slug"
      },
      "versionPolicy": {
        "enum": [
          "latest",
          "pinned"
        ]
      },
      "visibility": {
        "enum": [
          "private",
          "workspace",
          "unlisted",
          "public"
        ]
      }
    },
    "required": [
      "visibility",
      "embed"
    ],
    "type": "object"
  },
  "scrollbarOverride": {
    "additionalProperties": false,
    "properties": {
      "app-page": {
        "type": "string"
      },
      "asset-library": {
        "type": "string"
      },
      "default": {
        "type": "string"
      },
      "grid": {
        "type": "string"
      },
      "inspector": {
        "type": "string"
      },
      "modal": {
        "type": "string"
      },
      "presenter": {
        "const": "none"
      },
      "slide-list": {
        "type": "string"
      },
      "slide-stage": {
        "const": "none"
      },
      "speaker-notes": {
        "type": "string"
      },
      "theme-library": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "shortcuts": {
    "additionalProperties": false,
    "properties": {
      "editorPreset": {
        "type": "string"
      },
      "helpEnabled": {
        "type": "boolean"
      },
      "helpKey": {
        "type": "string"
      },
      "overrides": {
        "type": "object"
      },
      "presenterPreset": {
        "type": "string"
      }
    },
    "type": "object"
  },
  "slide": {
    "additionalProperties": false,
    "properties": {
      "background": {
        "type": "object"
      },
      "blocks": {
        "items": {
          "$ref": "#/$defs/block"
        },
        "type": "array"
      },
      "density": {
        "enum": [
          "low",
          "medium",
          "high"
        ]
      },
      "durationMs": {
        "minimum": 0,
        "type": "integer"
      },
      "focalBlockId": {
        "$ref": "#/$defs/id"
      },
      "hidden": {
        "type": "boolean"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "interactions": {
        "items": {
          "$ref": "#/$defs/interaction"
        },
        "type": "array"
      },
      "layout": {
        "minLength": 1,
        "type": "string"
      },
      "layoutBindings": {
        "items": {
          "$ref": "#/$defs/layoutBinding"
        },
        "type": "array"
      },
      "layoutVariant": {
        "type": "string"
      },
      "section": {
        "type": "string"
      },
      "sources": {
        "items": {
          "$ref": "#/$defs/id"
        },
        "type": "array",
        "uniqueItems": true
      },
      "speakerNotes": {
        "type": "string"
      },
      "tags": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "title": {
        "type": "string"
      },
      "transition": {
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "layout",
      "blocks"
    ],
    "type": "object"
  },
  "slug": {
    "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    "type": "string"
  },
  "source": {
    "additionalProperties": false,
    "properties": {
      "accessedAt": {
        "format": "date-time",
        "type": "string"
      },
      "authors": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "id": {
        "$ref": "#/$defs/id"
      },
      "license": {
        "type": "string"
      },
      "note": {
        "type": "string"
      },
      "publishedAt": {
        "type": "string"
      },
      "publisher": {
        "type": "string"
      },
      "title": {
        "$ref": "#/$defs/nonEmptyString"
      },
      "url": {
        "format": "uri",
        "type": "string"
      }
    },
    "required": [
      "id",
      "title",
      "url"
    ],
    "type": "object"
  },
  "theme": {
    "additionalProperties": false,
    "properties": {
      "designSystemRef": {
        "type": "string"
      },
      "id": {
        "minLength": 1,
        "type": "string"
      },
      "mode": {
        "enum": [
          "light",
          "dark",
          "system",
          "fixed"
        ]
      },
      "overrides": {
        "properties": {
          "scrollbar": {
            "$ref": "#/$defs/scrollbarOverride"
          }
        },
        "type": "object"
      }
    },
    "required": [
      "id"
    ],
    "type": "object"
  }
};

const ROOT: unknown = {
  "$id": "https://deckforge.dev/schemas/deck-project.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "description": "Structured document model for editable, presentable, publishable browser-native decks with semantic layout slots.",
  "properties": {
    "assets": {
      "default": [],
      "items": {
        "$ref": "#/$defs/asset"
      },
      "type": "array"
    },
    "canvas": {
      "$ref": "#/$defs/canvas"
    },
    "editor": {
      "$ref": "#/$defs/editor"
    },
    "experience": {
      "$ref": "#/$defs/experience"
    },
    "meta": {
      "$ref": "#/$defs/meta"
    },
    "presentation": {
      "$ref": "#/$defs/presentation"
    },
    "publish": {
      "$ref": "#/$defs/publish"
    },
    "schemaVersion": {
      "const": "2.1"
    },
    "shortcuts": {
      "$ref": "#/$defs/shortcuts"
    },
    "slides": {
      "items": {
        "$ref": "#/$defs/slide"
      },
      "minItems": 1,
      "type": "array"
    },
    "sources": {
      "default": [],
      "items": {
        "$ref": "#/$defs/source"
      },
      "type": "array"
    },
    "theme": {
      "$ref": "#/$defs/theme"
    }
  },
  "required": [
    "schemaVersion",
    "meta",
    "canvas",
    "theme",
    "presentation",
    "editor",
    "slides",
    "publish",
    "experience"
  ],
  "title": "DeckProject 2.1",
  "type": "object"
};

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matches(node: unknown, value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!node || typeof node !== "object") return;
  const schema = node as Record<string, any>;
  if (schema.$ref) {
    const name = String(schema.$ref).split("/").pop() ?? "";
    const target = DEFS[name];
    if (target) matches(target, value, path, issues);
    return;
  }
  if (schema.anyOf) {
    for (const option of schema.anyOf) {
      const local: ValidationIssue[] = [];
      matches(option, value, path, local);
      if (local.length === 0) return;
    }
    issues.push({ path: path || "$", message: "value matches no anyOf option" });
    return;
  }
  if (schema.oneOf) {
    let count = 0;
    for (const option of schema.oneOf) {
      const local: ValidationIssue[] = [];
      matches(option, value, path, local);
      if (local.length === 0) count += 1;
    }
    if (count !== 1) {
      issues.push({ path: path || "$", message: "value must match exactly one oneOf option" });
    }
    return;
  }
  if (schema.enum) {
    if (!schema.enum.some((item: unknown) => JSON.stringify(item) === JSON.stringify(value))) {
      issues.push({ path: path || "$", message: `value ${JSON.stringify(value)} is not one of the allowed enum values` });
    }
    return;
  }
  if (schema.const !== undefined) {
    if (JSON.stringify(schema.const) !== JSON.stringify(value)) {
      issues.push({ path: path || "$", message: `value must equal ${JSON.stringify(schema.const)}` });
    }
    return;
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({ path: path || "$", message: `expected minLength ${schema.minLength}, got ${value.length}` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({ path: path || "$", message: `expected maxLength ${schema.maxLength}, got ${value.length}` });
    }
    if (schema.pattern !== undefined) {
      try {
        if (!new RegExp(schema.pattern).test(value)) {
          issues.push({ path: path || "$", message: `value does not match pattern ${schema.pattern}` });
        }
      } catch {
        issues.push({ path: path || "$", message: `invalid pattern ${schema.pattern}` });
      }
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      issues.push({ path: path || "$", message: `expected minimum ${schema.minimum}, got ${value}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      issues.push({ path: path || "$", message: `expected maximum ${schema.maximum}, got ${value}` });
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      issues.push({ path: path || "$", message: `expected value > ${schema.exclusiveMinimum}, got ${value}` });
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      issues.push({ path: path || "$", message: `expected value < ${schema.exclusiveMaximum}, got ${value}` });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({ path: path || "$", message: `expected minItems ${schema.minItems}, got ${value.length}` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      issues.push({ path: path || "$", message: `expected maxItems ${schema.maxItems}, got ${value.length}` });
    }
    if (schema.uniqueItems === true) {
      const seen = new Set<string>();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          issues.push({ path: path || "$", message: "expected unique items" });
          break;
        }
        seen.add(key);
      }
    }
  }
  const expected = schema.type;
  if (expected && typeof expected === "string") {
    const actual = typeOf(value);
    let typeOk = expected === actual;
    if (expected === "number" && actual === "number") typeOk = true;
    if (expected === "integer" && actual === "number") typeOk = Number.isInteger(value);
    if (!typeOk) {
      issues.push({ path: path || "$", message: `expected type "${expected}", got "${actual}"` });
      return;
    }
  }
  if (schema.type === "array" || (expected === "array")) {
    if (!Array.isArray(value)) {
      issues.push({ path: path || "$", message: "expected array" });
      return;
    }
    const items = schema.items;
    if (items) {
      value.forEach((item, index) => matches(items, item, `${path}[${index}]`, issues));
    }
    return;
  }
  if ((schema.type === "object" || schema.properties) && value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(record)) {
        if (!allowed.has(key)) {
          issues.push({ path: `${path || "$"}.${key}`, message: "additional property not allowed" });
        }
      }
    }
    for (const key of Object.keys(schema.properties ?? {})) {
      const sub = (schema.properties as Record<string, unknown>)[key];
      const childPath = path ? `${path}.${key}` : key;
      if (record[key] === undefined) {
        const required = Array.isArray(schema.required) && schema.required.includes(key);
        if (required) issues.push({ path: childPath, message: "required property is missing" });
        continue;
      }
      matches(sub, record[key], childPath, issues);
    }
    return;
  }
}

export function validateDeckProject(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  matches(ROOT, value, "", issues);
  return { valid: issues.length === 0, issues };
}

export function isValidDeckProject(value: unknown): value is DeckProject {
  return validateDeckProject(value).valid;
}
