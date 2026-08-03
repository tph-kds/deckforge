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
