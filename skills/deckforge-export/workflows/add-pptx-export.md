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
