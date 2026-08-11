# Engineering Report — Canonical Geometry & Export Fidelity

**Project:** DeckForge editable-deck demo (The Weight of the Web)
**Date:** 2026-08-11
**Scope:** Slide geometry is now canonical and consistent across the editor
viewport (fit/zoom/pan), the presenter stage, and PPTX export. Export derives
every inch/pt from the document's actual canvas instead of hard-coded
constants or per-pixel defaults, and malformed geometry is reported, never
silently zeroed.

---

## 1. Problem being solved

Three surfaces had to agree about what a slide looks like: the editor canvas,
the presenter, and the exported `.pptx`. Before this change:

- The editor zoomed with a hard-coded `0.62` Fit and a `scale()`-driven
  renderer, conflating view transforms with document geometry.
- PPTX export hard-coded `13.333" x 7.5"` slide size and a `96 PPI` constant,
  so a `1920x800` or portrait deck exported with wrong aspect, distortion, or
  wrong derived font sizes.
- Block exporters could silently emit geometry `{x:0,y:0,w:0,h:0}` when a
  frame was missing, hiding real layout defects.

This work implements the approved multi-phase plan (phases 4, 5, 7, 9-12, 16 of
the geometry/export spec). The remaining scope and limitations are itemized in
section 10.

## 2. Canonical geometry layer

`src/export/geometry.ts` is now the single source of truth for converting
document pixels into PPTX inches and for validating frames.

- `derivePptxSlideSize(docW, docH)` — picks a 16:9-style default then derives
  the PPTX width/height from the **actual** document aspect ratio
  (`pptxWidth/pptxHeight === docW/docH` always). No hard-coded 13.333x7.5.
- `documentUnitToPptxInches(px, docAxis, pptxAxis)` — pure per-axis ratio
  (`px / docAxis * pptxAxis`); no fixed PPI constant anywhere.
- `documentRectToPptxRect` — maps x/y/w/h per axis with the same ratio.
- `browserFontSizeToPptPt` / `fontSizeFromCqw` — derived font conversion so
  `cqw`-based sizes (the renderer's font model) scale with the actual slide.
- `validateFrame` / `validateRectWithinSlide` / `isUsableFrame` — accept a real
  `{0,0,w,h}` (legal), reject missing / zero-size / NaN / NaN-containing
  frames and frames outside the slide bounds, each with a specific
  `ExportIssueCode`.

**Evidence:** `tests/geometry.test.ts` (13 tests) and `tests/export-scene.test.ts`
"export never mutates deck JSON" cover derive-for-16:9 / wide / portrait,
ratio rect and unit mapping, px->pt conversion, clamp mirror, and the
frame-validation accept/reject matrix.

## 3. Export context carries the derived size

`src/export/pptx/pptx-context.ts` `createExportContext` now derives
`pptxWidth`/`pptxHeight` via `derivePptxSlideSize` from the deck canvas and
passes them into every exporter through `PptxExportContext`
(`src/export/export-types.ts`).

**Evidence:** `tests/pptx-export-geometry.test.ts` asserts every element lands
sane and in-bounds for the seed deck; the `pptx-export-archive` test verifies a
real archive with all relationship targets resolving.

## 4. Per-block exporters use resolved frames and derived typography

All 8 block exporters (`text, image, chart, shape, table, diagram, video,
fallback` in `src/export/pptx/block-exporters/`) were rewritten:

- **Frame-required:** each calls `exportFrameOf(block)` and returns
  `{status: "unsupported", issues:[invalid-geometry]}` when the frame is
  missing — never a `0,0` default.
- **Derived fonts:** `resolvePptxFont` (`pptx-fonts.ts`) maps web fonts to
  safe PPTX substitutes via `WEB_TO_SUBSTITUTES` (Inter/Manrope/Sora→Arial,
  Libre Baskerville→Georgia, JetBrains Mono→Consolas) and emits
  `font-substitution` warnings. `text.ts` uses `browserTypographyFor` which
  mirrors the BlockRenderer's `cqw`/clamp sizes and line-heights so font size,
  margins, alignment, and line spacing match the browser render.
- **Images:** an unresolvable image now becomes a labeled placeholder
  `"Image unavailable: <blockId · assetId · src>"` plus `image-load-failed`
  (with `src`, `blockId`) and `unresolved-image` issues — not a bare
  `[image unavailable: b36]` string with no identity.
- **Charts:** `isTemplate` charts are skipped (`template-chart-skipped`),
  non-array chart data yields `chart-no-data` (error), empty arrays a warning.
  `makeBlockForType('chart')` in the editor now sets `isTemplate: true`.

**Evidence:** `tests/export.test.ts` + `tests/pptx-export-fidelity.test.ts`
cover statuses, issues, and the fidelity report; the live export (section 7)
shows 35 native + 1 substituted with exactly 2 warnings (both the same remote
image).

## 5. PPTX writer maps per axis by ratio

`src/export/pptx/pptx-exporter.ts`:

- Removed `PIXELS_PER_INCH`/`pixelsToInches`.
- `writeElementToSlide` takes the context and maps each axis through
  `documentUnitToPptxInches` (per-axis, so wide/portrait canvases are correct).
- Slide size comes from `derivePptxSlideSize`; the old
  `result.element.x || adjustedFrame.x` override was removed so resolved
  frames are never silently replaced.
- Scene diagnostics from `validateExportScene` are pushed onto the report.

**Evidence:** `tests/pptx-export-fidelity.test.ts` (4 tests, includes fidelity
report on the seed deck) and `tests/pptx-export-archive.test.ts` (2 tests).

## 6. Export scene validation

New `src/export/export-scene.ts` — `validateExportScene` runs over the fully
resolved export scene and reports:

- `aspect-mismatch` (error) — derived PPTX size disagrees with canvas aspect.
- `invalid-geometry` (error) — missing/zero/NaN/out-of-bounds element frames.
- `duplicate-element-id` (warning) — two elements claiming the same block.
- `template-chart-leak` (warning) — a template chart reached a real slide.
- `unresolved-image` (warning) — an image element could not be materialized.

`sceneHasErrors` lets the UI gate on real breakage rather than warnings.

**Evidence:** `tests/export-scene.test.ts` (6 tests) exercises each code path
end-to-end through `PptxExporter`, plus the "export geometry is invariant
across editor zoom levels" test that proves zoom/pan never affect export
geometry (pure view, no mutation).

## 7. Live export evidence

`scripts/export-evidence.ts` (run via `npx tsx`) produced:

- `evidence/weight-of-the-web.pptx` — 181,997 bytes, `archiveVerified: true`.
- `evidence/export-report.json` — full machine-readable report.
- `evidence/export-summary.txt` — human summary.

Results for the 7-slide seed deck:
- Slides exported: 7 · Blocks: 36 · Status: **partial** (no errors).
- Block statuses: **35 native, 1 substituted**.
- Issues: **2 warnings, 0 errors** — both from the same remote Unsplash image
  (block `b36`, slide `s7`) that cannot load offline; the export correctly
  replaced it with the labeled placeholder. This is expected, not a regression.

## 8. Editor viewport redesign (fit/zoom/pan)

New `src/render/SlideViewport.tsx` plus pure math in
`src/render/viewport-math.ts` (phases 9-12):

- **Fit is computed, not hard-coded:** `computeFitScale` derives
  `min((availW-2*pad)/canvasW, (availH-2*pad)/canvasH)` from measured viewport
  size, clamped to `[0.05, 4]`.
- **View is a pure transform:** the slide renders once at scale 1 and the
  viewport applies `translate(-50%,-50%) translate(px,py) scale(zoom)` with
  `transformOrigin: center`. `zoom/pan/fit` never mutate the SlideDocument.
- **Pan is clamped** (`clampPan`) so the slide can never be panned entirely
  off-screen, and is locked to origin when `zoom <= fit` (centered).
- **No scrollbars:** the canvas container is `overflow: hidden`; the editor
  canvas no longer wraps the slide in a scrolling `ScrollSurface` (its
  `axis="vertical"` rule would have re-introduced scrollbars at higher
  specificity than the new `.editor-canvas`).
- **Zoom-at-fit anchors to center:** `zoomStep` + the `atFit` branch reset pan
  when zooming from Fit.

**Evidence:** `tests/viewport-math.test.ts` (8 tests) plus 12 presenter e2e
tests and the full editor e2e suite passing after the redesign.

## 9. Verification summary (all green)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Unit + regression | `npx vitest run` | **289 passed / 30 files** |
| Browser e2e | `npx playwright test -c e2e/playwright.config.ts` | **43 passed** (editor 16, presenter 11, goldens 3, fit 13) |
| Live PPTX | `npx tsx scripts/export-evidence.ts` | archive verified, 1 warning / 0 errors |
| Golden export | `export-goldens.spec.ts` | captured deterministic goldens |

## 10. Follow-up session (same day)

- **Chart label layout (P2-001):** new shared `src/deck/chart-spec.ts` is the
  single source of truth for chart semantics, consumed by both
  `src/render/Chart.tsx` (browser) and the PPTX chart exporter. Vertical bar
  charts now reserve a left axis-label column and `dataLabelPadding` above the
  plot, and render NUMBER-ONLY ticks (unit shown once, in the data label) —
  eliminating the previous tick/label collision on the 2024 bar.
  Tests: `tests/chart-spec.test.ts` (8).
- **Canonical geometry resolver (P2-004):** `src/deck/geometry-resolver.ts`
  exports `resolveSlideGeometry` / `resolveBlockGeometry` / `hydrateDeckGeometry`
  as the single frame-resolution pipeline; `exportFrameOf` prefers
  `resolvedFrame`, and the exporter consumes the resolver's scene. Frames are
  never mutated into the input deck, and missing geometry is reported, never
  silently zeroed. Regression tests: `tests/geometry-regression.test.ts` (9).
- **Geometry-aware preflight:** `runExportPreflight` now computes
  `geometryMissingCount`, grouped diagnostics (`groups`), and a coverage block
  with `expected == native + fallback`, `missing == 0`; `ready` fails closed
  when any visible block has no frame. The "Ready to export" + "Export failed"
  contradiction is gone because readiness is computed from resolved geometry.
- **Export dialog state machine:** `src/export/export-dialog.tsx` now drives an
  explicit `IDLE → PREFLIGHTING → READY → EXPORTING → SUCCESS/FAILED` state
  machine; the contradictory duplicated "Export failedfailed" message was
  removed and preflight issues are grouped by category.
- **Verifier semantics:** `verifyPptxArchive` marks `speaker-notes` as
  explicitly NOT-APPLICABLE when notes are disabled (never judged), and
  `text-survival` now checks a semantic native-text corpus (`nativeTextExpected`
  in `<a:t>` runs) separate from a visual-fallback corpus (`visualFallbackTexts`
  verified against slide XML attributes such as `descr`). The exporter passes
  both corpora plus `includeSpeakerNotes`. Tests: `tests/verifier-semantics.test.ts` (8).
- **Bundled placeholder raster (P2-004):** `src/export/pptx/pptx-placeholder.ts`
  ships a theme-integrated 480x360 PNG; `src/export/pptx/asset-registry.ts`
  resolves every manifest asset up-front; the image exporter ALWAYS emits a
  real image element — never the forbidden "[image unavailable: …]" text box —
  and reports a single honest `image-load-failed` warning when a remote source
  cannot be fetched. The exported `.pptx` contains no `image unavailable` text.
- **E2E:** export goldens, presenter fit (12 viewport sizes × motion), editor,
  and presenter suites all pass (43).

## 12. Follow-up session (PPTx reliability)

- **Unbound slot blocks auto-bind deterministically:** `deterministicSlotId`
  in `src/deck/geometry-resolver.ts` now resolves a layout slot for every
  visible slot-positioned block that lacks an explicit frame, placement, or
  binding (`slot` hint → first accepting slot with room → capacity-aware
  fallback). The seven previously-failing spec fixtures
  (`b31, b33, b34, b35, b36, b-msbs2esx-fca5cd, b-msbs2t0x-s74pzv`) resolve
  to usable canonical frames with zero missing blocks. `ensureDeckSlotBindings`
  persists the healed bindings deterministically and idempotently.
  Regression suite: `tests/pptx-export-reliability.test.ts` (18).
- **Process blocks export as native editable text shapes:** `addShape` in
  pptxgenjs silently drops a `text` option (no `<a:t>` runs are written), so
  the process exporter now emits each step as an editable `addText` element
  with `shape: "roundRect"` (a real text box + shape background), plus
  `rightArrow` connectors between steps. Every step's title/detail survives as
  editable `<a:t>` text verified by `text-survival`.
- **Speaker-notes structural check fixed:** pptxgenjs emits one `notesSlide`
  part per exported slide even when no notes exist. The exporter's
  `expectedNotes` is now the exported slide count (when notes are enabled), so
  exporting any deck that lacks speaker notes no longer trips a false
  `archive-verification-failed`. The `export.test.ts` mock was aligned to the
  same behavior.
- **Export dialog: BLOCKED is a distinct state:** preflight failure lands in a
  new `blocked` state (badge "BLOCKED", message "Export blocked — resolve the
  preflight issues"), while serialization failure lands in `failed` (badge
  "FAILED"). "Export blocked" can no longer appear next to a FAILED badge or a
  "Ready to export" message.
- **Evidence regenerated:** `evidence/weight-of-the-web.pptx` (189,925 bytes)
  exports the 7-slide seed deck with `archiveVerified: true`, 0 errors, 1
  warning (`image-load-failed` for the remote Unsplash photo, replaced by the
  bundled placeholder raster), 35 native + 1 rasterized blocks.

## 13. Verification summary (all green)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | pass |
| Unit + regression | `npx vitest run` | **309 passed / 31 files** |
| Browser e2e | `npx playwright test -c e2e/playwright.config.ts` | **43 passed** |
| Live PPTX | `scripts/export-evidence.ts` | archive verified, 1 warning / 0 errors |
| Golden export | `export-goldens.spec.ts` | captured deterministic goldens |

## 11. Known limitations and remaining scope

- **No LibreOffice here:** PPTX→PNG rendering / SSIM visual diff cannot run on
  this machine (LibreOffice not installed). E2E goldens + archive/relationship
  verification are the proxy; a SSIM pass is a follow-up.
- **Remote image offline (resolved):** the seed deck's Unsplash image still
  cannot load in this environment, but the export now embeds a bundled
  placeholder raster as a real image element (one `image-load-failed` warning,
  no missing block, no text placeholder). A network-capable environment embeds
  the real photo instead.
- **Presenter path:** `SlideStage` (presenter fit) is unchanged and remains
  independent of editor zoom — verified by the presenter fit e2e suite.
- Full spec phases outside this scope (e.g. remaining phases 1-3, 6, 13-15,
  17-18) are not claimed as delivered here.
