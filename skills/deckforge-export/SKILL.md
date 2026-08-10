---
name: deckforge-export
description: Add or repair export capabilities for a DeckForge-compatible or custom web slide application without redesigning the entire product. Activate for requests to add PowerPoint download, fix export issues, add multiple export formats, audit export readiness, or add PPTX export with preflight checks.
version: 1.0.0
user-invocable: true
---

# Skill: deckforge-export

Add or repair export capabilities for a DeckForge-compatible or custom web slide application without redesigning the entire product.

## When to use

- User wants to add PowerPoint download to an existing deck
- User wants to fix export issues
- User wants to add multiple export formats
- Agent is auditing export readiness
- User needs PPTX export with preflight checks

## Supported tasks

- Add PPTX export (hybrid mode; fidelity-first by default)
- Add the fidelity layer: per-block representation, content-parity gate, fidelity report
- Add deterministic SVG diagram export and structured SVG snapshot fallback
- Add real OOXML structural verification (slides, text survival, media rels, notes, links)
- Add export preflight system
- Add PDF/PNG/portable package export
- Add block export registry
- Audit PPTX editability
- Add golden export fixtures
- Repair font and asset portability

## Required files

- `../deckforge/starter-components/export/export-types.ts` — core contracts
- `../deckforge/starter-components/export/pptx/` — PptxGenJS adapter, block exporters, and structural verifier
- `../deckforge/starter-components/export/fidelity/` — content-parity, representation planner, fidelity report, SVG generators
- `../deckforge/starter-components/export/export-preflight.ts` — preflight engine
- `../deckforge/starter-components/export/export-dialog.tsx` — Export Center UI

## Workflow

1. Inspect project for existing export code
2. Detect DeckProject schema version
3. Select export modes and capabilities
4. Add export types and contracts
5. Implement adapter and block exporters
6. Add preflight system
7. Add Export Center UI
8. Run export validation
9. Report coverage and limitations

## Quality gates

- Export creates valid .pptx archive
- Text remains editable in hybrid mode
- Preflight runs before export
- Every visible block has a representation (native, SVG diagram, or snapshot); none are silently omitted
- Diagrams are exported as complete visuals, never as node/edge count summaries
- Content-parity gate passes (100% meaningful content recall) before the file can be downloaded
- OOXML structural verification passes before the export is reported successful
- Fidelity score is accurate
