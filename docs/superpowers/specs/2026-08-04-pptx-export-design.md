# PPTX Export + Export Center Design Spec

**Date:** 2026-08-04
**Scope:** First-class hybrid PPTX export, Export Center UI, deckforge-export skill
**Approach:** Bottom-up (adapter → preflight → UI → skill → example → starter components)

---

## 1. Executive Summary

Add a first-class hybrid PPTX export subsystem to DeckForge. The hybrid mode keeps text, images, shapes, tables, and charts editable in PowerPoint while rasterizing complex web-only visuals. This includes:

- PptxGenJS adapter with typed interface
- Block exporters for each block type
- Export preflight system with fidelity scoring
- Export Center UI dialog
- New `deckforge-export` skill
- Working example in `examples/02-example/`
- Reusable starter components

## 2. Architecture

### 2.1 New file structure

```
starter-components/export/
├── export-types.ts
├── export-preflight.ts
├── export-dialog.tsx
├── pptx/
│   ├── pptx-exporter.ts
│   ├── pptx-context.ts
│   ├── pptx-theme.ts
│   ├── pptx-fonts.ts
│   ├── pptx-assets.ts
│   ├── pptx-fallback-renderer.ts
│   └── block-exporters/
│       ├── text.ts
│       ├── image.ts
│       ├── shape.ts
│       ├── table.ts
│       ├── chart.ts
│       ├── diagram.ts
│       └── fallback.ts

skills/deckforge-export/
├── SKILL.md
├── system-prompt.md
└── workflows/
    ├── add-pptx-export.md
    └── export-preflight.md
```

### 2.2 Modified files

- `starter-components/types/deck-types.ts` — add export types
- `starter-components/block-registry.tsx` — add export capability metadata
- `examples/02-example/src/` — wire up PPTX export
- `schemas/deck-project.schema.json` — add `delivery.exports.pptx` config

### 2.3 Key interfaces

```ts
// export-types.ts
interface ExportPreflightResult {
  issues: ExportIssue[];
  score: number; // 0-100 fidelity score
  blockCoverage: number; // 0-1 native coverage ratio
}

interface ExportIssue {
  severity: "info" | "warning" | "error";
  code: string;
  slideId?: string;
  blockId?: string;
  message: string;
  suggestedFix?: string;
  automaticFixAvailable: boolean;
}

interface PptxExportConfig {
  mode: "hybrid";
  includeSpeakerNotes: boolean;
  includeHiddenSlides: boolean;
  compatibilityTargets: string[];
  fontPolicy: "warn-and-substitute" | "embed-when-licensed";
}

interface PptxExportContext {
  pptx: PptxGenJS;
  deck: DeckProject;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, string>;
}

interface PptxBlockExporter {
  type: string;
  export(block: DeckBlock, ctx: PptxExportContext): Promise<PptxSlideElement>;
  exportability: "native-editable" | "native-with-reduction" | "hybrid-rasterized" | "image-only";
}
```

## 3. PptxGenJS Adapter Layer

### 3.1 pptx-exporter.ts

Main adapter class:

```ts
class PptxExporter {
  async export(deck: DeckProject, config: PptxExportConfig): Promise<Blob> {
    // 1. Run preflight
    // 2. Create PptxGenJS instance
    // 3. Apply theme and masters
    // 4. For each slide: create slide, export blocks, add notes
    // 5. Generate and return Blob
  }
}
```

### 3.2 pptx-theme.ts

Maps DeckForge theme tokens to PPTX theme definitions:
- `theme.colors.primary` → PPTX color scheme
- `theme.typography.headingFont` → PPTX heading font
- `theme.typography.bodyFont` → PPTX body font
- `theme.spacing` → PPTX margins and positions
- `theme.background` → PPTX background fill

### 3.3 pptx-context.ts

Carries slide dimensions, theme, font registry, and asset cache through export.

### 3.4 Block exporters

| Block Type | Strategy | Notes |
|---|---|---|
| Text | Native editable | Font substitution checked |
| Image | Native image | Embedded as base64 |
| Shape | Native shape | Complex filters → image |
| Table | Native table | Paginated tables split |
| Chart | Native chart | Data preserved |
| Diagram | SVG/image fallback | Semantic structure in metadata |
| Code block | Native text | Loses syntax highlighting |
| Browser demo | Poster + link | Web interaction not in PPTX |
| Video | Poster image | Compatibility varies |

## 4. Export Preflight System

### 4.1 Checks

| Check | Severity | Description |
|---|---|---|
| `font-substitution` | warning | Font not available |
| `text-overflow-risk` | warning | Text may overflow |
| `unsupported-css-effect` | warning | CSS filter/mask/blur |
| `web-only-interaction` | info | Interactive → poster+link |
| `unsupported-animation` | info | Animation → final frame |
| `external-asset` | warning | Asset not embedded |
| `svg-features` | info | SVG may rasterize |
| `chart-conversion` | info | Chart data preserved |
| `low-resolution-image` | warning | Below export resolution |
| `missing-alt-text` | info | Accessibility concern |
| `missing-speaker-notes` | info | Notes not included |
| `content-outside-safe-area` | warning | May be clipped |
| `unsupported-block-type` | warning | Export as image |

### 4.2 Fidelity scoring

- Start at 100
- Each `error` → -20
- Each `warning` → -5
- Each `info` → -1
- Clamp to 0-100

### 4.3 Flow

```
User clicks Export → Run preflight → Show results
  ↓
No errors: "Export ready" with warning count
Errors: "Export blocked" with fix suggestions
  ↓
User confirms → Export → Download
```

## 5. Export Center UI

### 5.1 Layout

```
┌─────────────────────────────────────────────────┐
│ Export Center                              [X]  │
├─────────────────────────────────────────────────┤
│ Format: [PPTX (Hybrid) ▼]                       │
│                                                   │
│ ┌─ Preflight Status ──────────────────────────┐ │
│ │ ✓ Export ready                               │ │
│ │ ⚠ 3 warnings                                │ │
│ │ ℹ 5 info items                              │ │
│ │ Fidelity score: 87/100                      │ │
│ │ Native block coverage: 78%                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                   │
│ Options:                                         │
│ ☑ Include speaker notes                         │
│ ☐ Include hidden slides                         │
│ ☐ Include source appendix                       │
│                                                   │
│ Slide range: [All ▼]                             │
│ Filename: my-deck-2026-08-04.pptx                │
│                                                   │
│ [View Details]              [Cancel] [Export]    │
└─────────────────────────────────────────────────┘
```

### 5.2 Key behaviors

- Opens on "Export" toolbar click
- Runs preflight automatically
- Shows fidelity score and issue list
- "View Details" expands issues with fixes
- "Export" triggers download
- Failures show error, never corrupt DeckProject

## 6. deckforge-export Skill

### 6.1 Purpose

Add or repair export capabilities without redesigning the entire product.

### 6.2 Supported tasks

- Add PPTX export (hybrid mode)
- Add export preflight
- Add PDF/PNG/portable package export
- Add block export registry
- Audit PPTX editability
- Add golden export fixtures
- Repair font and asset portability

### 6.3 Workflow

1. Inspect project for existing export code
2. Detect DeckProject schema version
3. Select export modes and capabilities
4. Add export types and contracts
5. Implement adapter and block exporters
6. Add preflight system
7. Add Export Center UI
8. Run export validation
9. Report coverage and limitations

## 7. Schema Configuration

Add to DeckProject:

```json
{
  "delivery": {
    "exports": {
      "pptx": {
        "enabled": true,
        "defaultMode": "hybrid",
        "allowedModes": ["hybrid"],
        "compatibilityTargets": ["powerpoint", "keynote", "libreoffice"],
        "includeSpeakerNotes": true,
        "includeHiddenSlides": false,
        "fontPolicy": "warn-and-substitute",
        "filenameTemplate": "{title}-{date}.pptx"
      }
    }
  }
}
```

## 8. Implementation Order (Bottom-Up)

1. `export-types.ts` — core contracts
2. `pptx-exporter.ts` — main adapter
3. `pptx-context.ts` — export context
4. `pptx-theme.ts` — theme mapping
5. `pptx-fonts.ts` — font detection
6. `pptx-assets.ts` — asset embedding
7. Block exporters (text, image, shape, table, chart, diagram, fallback)
8. `pptx-fallback-renderer.ts` — hybrid fallback
9. `export-preflight.ts` — preflight engine
10. `export-dialog.tsx` — Export Center UI
11. `deckforge-export` skill creation
12. Example app wiring
13. Starter component packaging

## 9. Testing Strategy

1. Export creates valid `.pptx` archive
2. Slide count matches DeckProject
3. Text blocks are editable in native/hybrid mode
4. Speaker notes present when enabled
5. Theme/master definitions generated
6. External assets embedded or reported
7. Preflight reports unsupported interactions
8. Export failure does not corrupt DeckProject
9. Fidelity score is accurate
10. Export Center UI renders correctly

## 10. Definition of Done

- [ ] User can open Export Center from editor
- [ ] Hybrid mode explained truthfully
- [ ] Preflight runs before export
- [ ] Downloaded file has correct MIME type and filename
- [ ] Text remains editable in hybrid mode
- [ ] Images, shapes, charts use native objects
- [ ] Complex blocks have explicit fallback behavior
- [ ] Theme and master layout generated
- [ ] Speaker notes included when enabled
- [ ] Missing fonts/assets produce actionable warnings
- [ ] Export failures do not corrupt DeckProject
- [ ] Automated tests validate package structure
- [ ] Handoff report lists compatibility and limitations
