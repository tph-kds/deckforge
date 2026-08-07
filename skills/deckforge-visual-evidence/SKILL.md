---
name: deckforge-visual-evidence
description: Start a DeckForge application in an isolated browser session, exercise editor/presenter/viewer/export capabilities, capture screenshots, console errors, failed requests, accessibility results, and traces, generate machine-readable evidence, and stop every process the run created. Use for visual QA of generated applications; do not use for slide art direction.
version: 1.0.0
user-invocable: false
license: MIT
---

# deckforge-visual-evidence

Verification worker. Prove a generated DeckForge application works by executing it.

1. Determine changed surfaces and the required capabilities from the capability catalog.
2. Start the target application on an isolated port (do not reuse a shared server).
3. Run behavior-focused editor, presenter, viewer, and export-preview scenarios via Playwright.
4. Capture the required viewports and a reduced-motion run.
5. Record console errors, failed requests, and timing.
6. Retry each candidate defect once before reporting.
7. Annotate evidence with slide, block, and capability IDs.
8. Generate `browser-evidence-report.json` and per-capability evidence entries.
9. Stop all created processes and browser contexts.
10. Mark unavailable checks `unverified`, never `passed`.

Read `references/browser-evidence-contract.md` and the report schema at
`../../schemas/browser-evidence-report.schema.json`. Map Playwright tests to
capabilities with `assets/evidence-capability-map.json`.

Never claim a check ran when the browser, runner, or port was unavailable.
