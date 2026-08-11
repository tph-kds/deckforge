# Engineering Report — Presenter mode clipping (slides 3/4, right-side content)

**Deck:** `examples/02-example` — "The Weight of the Web" (7 slides, 1600×900 canvas)
**Fixed:** 2026-08-11
**Module touched:** `src/render/SlideStage.tsx` + `src/styles.css` (presenter contain-fit viewport)

## 1. Root cause

The presenter's contain-fit scale was applied as an **inline `transform: scale(scale)` on the `.deck-slide` element** itself (via `SlideRenderer`/`SlideStage`), inside a `.deck-slide-frame` sized `canvas × scale`. The global reduced-motion CSS (both the `@media (prefers-reduced-motion: reduce)` rule **and** the deck-level `.app.is-reduced-motion` variant) sets:

```css
.presenter-stage-slide, .deck-block-wrap, .deck-slide-frame .deck-slide {
  ...
  transform: none !important;
}
```

Because `!important` beats inline styles, **any browser with OS-level "reduce motion" enabled strips the fit transform**. The slide then renders at logical 1600×900 inside a frame of `canvas × scale`, and the stage's `overflow: hidden` clips the right and bottom edges. This is why slide 1 (centered hero) looked "mostly fine" while slides 3/4 (right-edge annotation text, citations) clipped visibly.

The same flaw would also let slide-transition keyframes (`deck-slide-up/left/zoom`, which animate `.deck-slide` transform with `fill-mode: both`) clobber the scale for non-fade motion profiles.

## 2. Reproduction (controlled)

With `page.emulateMedia({ reducedMotion: 'reduce' })`, measured before the fix (`.deck-slide` computed `transform: none`):

| viewport | frame (right edge) | slide right (unscaled) | clipped |
|---|---|---|---|
| 1440×900 | 1420.00 | 1620.00 | **200px** |
| 1280×720 | 1197.33 | 1682.67 | **485px** |

With `no-preference` the inline scale survives (no reduced-motion CSS), which is why default Playwright runs never caught it.

## 3. The fix

The contain-fit scale now lives on **`.slide-stage-origin`** (the element that carries the viewport transform, mirroring the editor's `SlideViewport`), applied as a centered transform; the slide itself is always rendered at logical scale 1.

`src/render/SlideStage.tsx`:
```tsx
<div className="slide-stage-origin"
     style={{
       width: deck.canvas.width,   // logical, not canvas × scale
       height: deck.canvas.height,
       transform: `translate(-50%, -50%) scale(${guard})`,
       transformOrigin: 'center center',
     }}>
  {children(1)}                    // was children(guard)
</div>
```

`src/styles.css`:
```css
.slide-stage-origin {
  position: absolute;
  left: 50%;
  top: 50%;
  will-change: transform;
}
```

Why this is robust: **no CSS rule (reduced-motion or transition keyframes) targets `.slide-stage-origin`**, so the fit transform can never be clobbered. The `.deck-slide` element is always identity/scale-1; animation rules that touch it only move it visually within the already-scaled stage.

## 4. Scale math (unchanged, verified)

```ts
scale = min(availW / canvasW, availH / canvasH)   // contain-fit, guard at minScale
```

`computeScale` (now exported from `SlideStage.tsx`) is pure and covered by `tests/slide-stage-fit.test.ts`:

| avail (viewport) | expected scale | bound |
|---|---|---|
| 1920×1080 | 1.2 | both equal |
| 1440×900 | 0.9 | width |
| 1366×768 | 0.853333 | height |
| 1280×720 | 0.8 | both equal |
| 1024×768 | 0.64 | width |
| 2560×1080 | 1.2 | height (ultrawide) |

## 5. How dimensions are obtained

- Canvas: `deck.canvas.width/height` from `deck.json` (1600×900, 16:9, `safeMargin: 64`).
- Available space: `SlideStage` measures its own container via `ResizeObserver` (`clientWidth/clientHeight`), so fullscreen/browser-resize recomputes scale automatically. No hard-coded viewport sizes.

## 6. Centering

`.slide-stage` is flex-centered; `.slide-stage-origin` is absolutely positioned at 50%/50% with `translate(-50%,-50%)` + `scale(s)` and `transform-origin: center`, so the scaled canvas is always centered with no manual offsets.

## 7. Fullscreen / resize

Fullscreen toggling changes the stage size; the `ResizeObserver` fires, recomputing `guard`, and the centered origin keeps the full canvas visible. Covered by the new e2e "fullscreen keeps every slide fully visible" test (with reduced-motion emulated).

## 8. Editor-zoom independence

The presenter never reads editor zoom/pan state; it only computes contain-fit from its own container size. Editor zoom (via `SlideViewport`) is irrelevant to the presenter surface. (Regression spec asserts presenter geometry independent of any editor interaction.)

## 9. Per-slide / per-viewport verification

New `e2e/tests/presenter-fit.spec.ts` — 15 tests asserting, for **all 7 slides**, across **7 viewports** (1920×1080, 1600×900, 1440×900, 1366×768, 1280×720, 1024×768, 2560×1080), under **both** `no-preference` and `reduce`:

- `.deck-slide-frame` rect is fully inside the stage (left/top ≥ stage, right/bottom ≤ stage)
- frame right/bottom ≤ viewport (no page-level clipping)
- slide rect == frame rect (fit applied once, no residual offset)
- `.slide-stage-origin` carries a non-identity transform; `.deck-slide` is identity/none

Example after-fix geometry (1440×900, reduced-motion, slide 3): frame L=20 R=1420 T=29.75 B=817.25 — full slide visible; the annotation block right edge (1405.28) sits inside the frame.

## 10. Before / after evidence

- `evidence/presenter-before/` — 16 screenshots taken **before** the fix (4 slides × 2 viewports × 2 motion settings). `reduce-*` captures show the right-edge clipping on slides 3/4.
- `evidence/presenter-after/` — 16 screenshots **after** the fix, same matrix. All slides fully visible, no cropping.

## 11. Tests added

- `tests/slide-stage-fit.test.ts` (4 unit tests): contain-fit math, degenerate inputs, aspect preservation.
- `e2e/tests/presenter-fit.spec.ts` (15 e2e tests): 14 grid tests (reduced-motion × viewports × all slides) + 1 fullscreen test.

## 12. Full verification

- `tsc --noEmit`: exit 0
- `vitest run`: **265 passed** (28 files)
- `playwright test`: **43 passed** (editor 16, export-goldens 1, presenter 11, presenter-fit 15)

## 13. Files changed (this fix)

- `src/render/SlideStage.tsx` — fit scale moved to `.slide-stage-origin` (centered transform); slide rendered at scale 1; `computeScale` exported.
- `src/styles.css` — `.slide-stage-origin` now `position: absolute; left: 50%; top: 50%; will-change: transform`.
- `tests/slide-stage-fit.test.ts` — new.
- `e2e/tests/presenter-fit.spec.ts` — new.

No slide content, no `SlideRenderer`, no block/layout/theme/export code changed.

## 14. Conclusion

The clipping was a viewport-layer bug: the fit transform was attached to an element that reduced-motion CSS legitimately `!important`-overrides. Moving the contain-fit scale to the `.slide-stage-origin` viewport wrapper makes presenter rendering immune to reduced-motion and transition/animation CSS by construction, and the regression suite now guards all 7 slides × 7 viewports × 2 motion settings plus fullscreen.
