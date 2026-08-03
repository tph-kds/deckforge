# PPTX Export + Export Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class hybrid PPTX export with Export Center UI and deckforge-export skill to DeckForge.

**Architecture:** Bottom-up approach: PptxGenJS adapter layer, block exporters, preflight engine, Export Center UI, skill, example wiring, starter components. Each layer is testable independently.

**Tech Stack:** TypeScript, React, PptxGenJS, Vite, Vitest

## Global Constraints

- DeckProject is the canonical data source — never DOM, screenshots, or JSX
- Hybrid mode only for this implementation
- PptxGenJS loaded lazily only when export is requested
- Export failures never corrupt the DeckProject
- All exports go through typed adapter interface
- Preflight runs before every export
- Fidelity score is calculated from actual block coverage

---

## File Map

### New files to create:

| File | Responsibility |
|------|---------------|
| `starter-components/export/export-types.ts` | Core export contracts and type definitions |
| `starter-components/export/pptx/pptx-exporter.ts` | Main PptxGenJS adapter class |
| `starter-components/export/pptx/pptx-context.ts` | Export context |
| `starter-components/export/pptx/pptx-theme.ts` | DeckForge theme to PPTX theme mapper |
| `starter-components/export/pptx/pptx-fonts.ts` | Font detection and substitution warnings |
| `starter-components/export/pptx/pptx-assets.ts` | Asset embedding |
| `starter-components/export/pptx/pptx-fallback-renderer.ts` | Hybrid fallback for complex blocks |
| `starter-components/export/pptx/block-exporters/text.ts` | Text block exporter |
| `starter-components/export/pptx/block-exporters/image.ts` | Image block exporter |
| `starter-components/export/pptx/block-exporters/shape.ts` | Shape block exporter |
| `starter-components/export/pptx/block-exporters/table.ts` | Table block exporter |
| `starter-components/export/pptx/block-exporters/chart.ts` | Chart block exporter |
| `starter-components/export/pptx/block-exporters/diagram.ts` | Diagram block exporter |
| `starter-components/export/pptx/block-exporters/fallback.ts` | Fallback block exporter |
| `starter-components/export/pptx/block-exporters/index.ts` | Block export registry |
| `starter-components/export/export-preflight.ts` | Preflight inspection engine |
| `starter-components/export/export-dialog.tsx` | Export Center UI component |
| `starter-components/export/index.ts` | Public API barrel export |
| `skills/deckforge-export/SKILL.md` | Skill definition |
| `skills/deckforge-export/system-prompt.md` | Design standards |
| `skills/deckforge-export/workflows/add-pptx-export.md` | Add PPTX export workflow |
| `skills/deckforge-export/workflows/export-preflight.md` | Export preflight workflow |

### Files to modify:

| File | Changes |
|------|---------|
| `starter-components/types/deck-types.ts` | Add export types |
| `starter-components/block-registry.tsx` | Add export capability metadata |
| `examples/02-example/package.json` | Add pptxgenjs dependency |
| `examples/02-example/src/App.tsx` | Wire up Export Center |
| `schemas/deck-project.schema.json` | Add delivery.exports.pptx config |

---

## Tasks

See individual task files in this directory for detailed implementation steps:
- `task-01-export-types.md` — Export type contracts
- `task-02-adapter-core.md` — PptxGenJS adapter core
- `task-03-theme-mapping.md` — Theme mapping
- `task-04-font-detection.md` — Font detection
- `task-05-asset-embedding.md` — Asset embedding
- `task-06-text-exporter.md` — Text block exporter
- `task-07-image-exporter.md` — Image block exporter
- `task-08-shape-exporter.md` — Shape block exporter
- `task-09-table-exporter.md` — Table block exporter
- `task-10-chart-exporter.md` — Chart block exporter
- `task-11-diagram-fallback.md` — Diagram and fallback exporters
- `task-12-block-registry.md` — Block export registry
- `task-13-fallback-renderer.md` — PPTX fallback renderer
- `task-14-preflight-engine.md` — Export preflight engine
- `task-15-export-dialog.md` — Export Center UI
- `task-16-deckforge-export-skill.md` — New skill creation
- `task-17-example-wiring.md` — Example app integration
- `task-18-schema-update.md` — Schema configuration
- `task-19-barrel-export.md` — Public API exports
- `task-20-validation.md` — Final validation and testing
