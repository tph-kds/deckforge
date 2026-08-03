# Task 16: deckforge-export Skill

**Files:**
- Create: `skills/deckforge-export/SKILL.md`
- Create: `skills/deckforge-export/system-prompt.md`
- Create: `skills/deckforge-export/workflows/add-pptx-export.md`
- Create: `skills/deckforge-export/workflows/export-preflight.md`

## Steps

- [ ] **Step 1: Create SKILL.md**

```markdown
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

- `starter-components/export/export-types.ts` — core contracts
- `starter-components/export/pptx/` — PptxGenJS adapter and block exporters
- `starter-components/export/export-preflight.ts` — preflight engine
- `starter-components/export/export-dialog.tsx` — Export Center UI

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
```

- [ ] **Step 2: Create system-prompt.md**

```markdown
# Design Standards for Export Work

## Principles

1. DeckProject is the canonical data source
2. Never expose PptxGenJS directly — use typed adapter
3. Hybrid mode balances editability and fidelity
4. Preflight runs before every export
5. Export failures never corrupt the DeckProject
6. Fidelity score is calculated from actual coverage

## File conventions

- Export types in `export-types.ts`
- Adapter in `pptx/pptx-exporter.ts`
- Block exporters in `pptx/block-exporters/`
- Preflight in `export-preflight.ts`
- UI in `export-dialog.tsx`

## Type contracts

All exports use typed interfaces from export-types.ts. No `any` types in public APIs.
```

- [ ] **Step 3: Create workflows/add-pptx-export.md**

```markdown
# Add PPTX Export Workflow

## Prerequisites

- DeckProject schema exists
- Block types defined in block manifest

## Steps

1. Add export-types.ts with contracts
2. Create pptx/pptx-exporter.ts adapter
3. Create pptx/pptx-context.ts for export state
4. Create pptx/pptx-theme.ts for theme mapping
5. Create pptx/pptx-fonts.ts for font detection
6. Create pptx/pptx-assets.ts for asset embedding
7. Create block exporters for each block type
8. Create block-exporters/index.ts registry
9. Create pptx-fallback-renderer.ts
10. Create export-preflight.ts engine
11. Create export-dialog.tsx UI
12. Wire up in editor toolbar
13. Run validation tests
```

- [ ] **Step 4: Create workflows/export-preflight.md**

```markdown
# Export Preflight Workflow

## Purpose

Inspect deck before export and report issues.

## Checks

- Font compatibility
- Unsupported block types
- CSS filter effects
- External assets
- Missing speaker notes
- Content outside safe area

## Scoring

- Start at 100
- Error: -20
- Warning: -5
- Info: -1
- Clamp to 0-100

## Output

- ExportPreflightResult with issues, score, blockCoverage
```

- [ ] **Step 5: Commit**

```bash
git add skills/deckforge-export/
git commit -m "feat: add deckforge-export skill with PPTX export workflows"
```
