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
8. Create fidelity/fidelity-types.ts and fidelity/fidelity-policy.ts (contracts + content-parity policy)
9. Create fidelity/content-parity.ts (meaningful-content recall evaluation)
10. Create fidelity/representation-planner.ts (per-block representation planning)
11. Create fidelity/fidelity-report.ts (report builder + status mapping)
12. Create fidelity/svg/svg-diagram.ts (deterministic diagram SVG generator)
13. Create fidelity/svg/svg-snapshot.ts (structured SVG snapshot fallback)
14. Create pptx/pptx-verifier.ts (OOXML structural verifier)
15. Wire planner + parity + verifier into pptx-exporter.ts
16. Add a per-block representation and fidelity report to the export result
17. Create block-exporters/index.ts registry
18. Create pptx-fallback-renderer.ts
19. Create export-preflight.ts engine
20. Create export-dialog.tsx UI
21. Wire up in editor toolbar
22. Run validation tests
