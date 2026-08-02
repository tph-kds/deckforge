# DeckForge — Motion-Ready, Chrome-Safe, App-Shell Editor

Date: 2026-08-02
Status: Approved

## Problem

End-user generated decks and the reference implementations exhibit three classes of defects, plus a backlog of broken validation wiring.

1. **Idle slides.** Motion is opt-in per block. `motion-profile-manifest.json` exists but is never bound to a deck. `examples/02-example` declares `"transition": "push"` yet its presenter runs no slide transitions or build steps. `examples/01-example` animates only blocks that carry an explicit `animation` field, leaving most slides static.
2. **Presenter chrome overlaps slide content.** `examples/02-example` places the timer at `position:absolute; top:14px; right:20px` floating over the slide. Fullscreen controls float over content. `01-example` has the same class of HUD/controls over the stage.
3. **Editor dead space.** `examples/02-example` reserves a CSS grid `notes` row (`'notes notes inspector'`, 160px) but the notes element is nested inside `<main className="editor-canvas">`, so `grid-area:notes` never binds — leaving an empty white band at the bottom of the editor.
4. **Broken validation wiring.** `tests/test_examples.py` and `package.json` reference `examples/editable-deck-studio`, which does not exist (the directory is `examples/02-example`). `npm run validate` currently fails.

## Approach

One coherent pass across all layers: skill rules, manifests, schema, delivery contract, deterministic validators, starter components, and both runnable examples. The examples are living proofs that the rules produce correct output, so they must be fixed alongside the guidance.

## Section 1 — Default motion (no idle slides)

- `skills/deckforge/assets/deck-project.schema.json`: require `presentation.motionProfileId`; keep slide `transition` and block `animation` optional but defaulted.
- `skills/deckforge/built-in-skills/motion-and-transitions.md`, `skills/deckforge/system-prompt.md`, `skills/deckforge/SKILL.md`: agents must select a motion profile from `motion-profile-manifest.json` by presentation archetype and apply default builds — entrance fade/stagger on key blocks, a slide transition, and a `reducedMotion` fallback — even when the user did not request motion. "Idle unless requested" becomes a blocking failure.
- `examples/02-example`: add a real transition + build-step engine. Wire a build sequence into `PresenterApp`/`SlideRenderer`. Navigation consumes build steps before advancing.
- `examples/01-example`: add a default-animation fallback so blocks without an explicit `animation` field still enter smoothly using the deck's motion profile.
- Starter components: expand `AnimationRuntime.tsx` with a build-step model; add motion keyframes to `starter-components/base.css`; wire motion into `DeckStage.tsx` and `PresenterView.tsx`.

## Section 2 — Docked presenter chrome (no overlap)

- Rule: presenter chrome (timer, position, controls, progress) lives in a reserved docked band outside the letterboxed slide — never over the canvas. Auto-hide on idle in fullscreen; reveal on pointer-move.
- `examples/02-example`: move the timer into the docked bottom chrome bar; add fullscreen auto-hide and letterboxing; remove the floating top-right timer.
- `examples/01-example`: keep the HUD docked; apply the same auto-hide/fullscreen-safe letterbox rules; ensure the timer chip and controls never sit over the slide area.
- Docs: `presenter-experience.md`, `layout-and-rendering.md`, `delivery-acceptance-contract.md` gain explicit "no chrome over slide safe area" rules.

## Section 3 — Editor app-shell (no dead space)

- `examples/02-example`: restructure `EditorApp` so the notes strip is a direct grid child occupying the `notes` row, collapsible; the canvas row becomes `minmax(0,1fr)` with `overflow:auto`. No reserved-but-empty band.
- Starter components: keep `starter-components/base.css` grid as the canonical app-shell pattern; align `DeckEditorShell.tsx`.
- Docs: `editor-experience.md` and the delivery contract require a stable shell where every grid row is assigned and notes collapse cleanly.

## Section 4 — Deterministic enforcement

- New `skills/deckforge/scripts/audit_deck_motion.py`: verify every deck has a valid `motionProfileId`, a slide transition, block builds present, and reduced-motion config.
- Extend `skills/deckforge/scripts/validate_output_contract.py` with `default-motion` and `chrome-safe` checks (e.g., forbid presenter timer positioned with `top:`/absolute over the slide; require `prefers-reduced-motion`).
- Fix `tests/test_examples.py` and `package.json` paths (`examples/editable-deck-studio` → `examples/02-example`).
- Add tests for the new motion and chrome-safe checks.

## Section 5 — Focused theme/content guidance

Issue-driven tightening only; no catalog rewrite.

- `template-and-theme.md`: theme ≠ template; a theme never replaces narrative structure.
- `data-and-diagrams.md`: charts/diagrams stay inside their assigned slots; no fake metrics or decorative charts.
- `asset-and-media-workflow.md`: image crop/fit/focal point guidance.
- `composition-and-layout-engine.md`: content budgets and overflow repair.
- `quality-gate.md`: add motion + presenter-chrome review steps.

## Validation target

- `npm run validate` (which runs schema/catalog/deck validation, layout audit, output-contract checks, node syntax check, and the unittest suite) must pass.
- `python skills/deckforge/scripts/audit_deck_layout.py examples/02-example/deck.json --strict` must pass.
- `python skills/deckforge/scripts/validate_output_contract.py examples/02-example --profile editable-deck` must pass.
- Both example apps must build: `examples/01-example` (static, node --check app.js) and `examples/02-example` (`npm run build` in that directory).
- Manual visual checks: presenter at canonical 16:9, laptop, and narrow viewport; editor at those widths; fullscreen presenter with auto-hide chrome; reduced motion.

## Out of scope

- Full catalog rewrite of themes/templates/block types.
- New hosting/publishing infrastructure.
