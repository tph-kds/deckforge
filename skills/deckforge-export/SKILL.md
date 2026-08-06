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

- Add PPTX export (hybrid mode)
- Add export preflight system
- Add PDF/PNG/portable package export
- Add block export registry
- Audit PPTX editability
- Add golden export fixtures
- Repair font and asset portability

## Required files

- `../deckforge/starter-components/export/export-types.ts` — core contracts
- `../deckforge/starter-components/export/pptx/` — PptxGenJS adapter and block exporters
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
- Export failures do not corrupt DeckProject
- Fidelity score is accurate
