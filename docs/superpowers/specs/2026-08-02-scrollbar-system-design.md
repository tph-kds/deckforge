# DeckForge Scrollbar System v2 — Design Spec

**Date:** 2026-08-02
**Status:** Approved
**Implementation plan:** `.planning/scroll-bar/DeckForge_Scrollbar_System_v2_Implementation_Plan.md`

## Objective

Give every DeckForge-generated presentation product a professional, theme-aware,
smooth scrollbar system on all scrollable editor/publishing surfaces, while
guaranteeing that **no scrollbar ever appears inside the slide canvas or the
fullscreen audience presentation**.

## Product rules

1. Scrollbars may enhance editor and publishing surfaces; they never appear in the
   slide stage or fullscreen presenter.
2. Scrollbar appearance follows the selected theme, with per-surface overrides.
3. Scrolling stays native: no wheel-event interception, no fake smoothness.
   `scroll-behavior: smooth` is used only for programmatic navigation
   (scrollIntoView of active slide / validation error), and is disabled under
   reduced motion.
4. Scrollbar appearance never causes layout shifts (`scrollbar-gutter: stable`).
5. Reduced motion disables transitions/glow; forced-colors and high-contrast use a
   solid, visible thumb; coarse pointers fall back to `system-native`.
6. Scrollbar intensity follows surface importance: speaker-notes/long-form >
   grid/libraries > inspector/slide-list > modals > presenter/slide-stage: none.
7. The slide stage is always `overflow: hidden`. Overflowing content is fixed by
   shortening, changing layout, or splitting the slide — never by enabling scroll.

## Architecture

Semantic scroll surfaces -> governed scrollbar catalog -> theme mapping ->
runtime token resolution -> accessible native rendering -> presenter isolation ->
automated validation.

### Scroll-surface registry

`app-page`, `slide-list`, `inspector`, `grid`, `speaker-notes`, `modal`,
`asset-library`, `theme-library` are scrollable. `presenter` and `slide-stage`
are always `none` (non-scrollable).

### Catalog (`assets/scrollbar-manifest.json` + schema)

Eight profiles: `gradient-slim`, `aurora-glow`, `minimal-thin`, `neon-edge`,
`mono-ink`, `high-contrast`, `system-native`, `none`.

Each style declares `renderMode`, `dimensions` (width/height/min thumb/radius),
`track`, `thumb` (token refs, gradient angle, border, glow), `hover`, `active`,
`behavior` (`autoHide` default false), `supportedSurfaces`, `fallbackStyleId`.

### Theme mapping

Every theme in `assets/theme-manifest.json` gains an explicit `scrollbar` object:
`default` + optional per-surface overrides + `presenter: "none"` +
`slide-stage: "none"`. Mapping rules: valid style ids; no glow styles on light
themes; high-contrast fallback; surface overrides only when justified.
Per-project override is allowed via `DeckProject.theme.overrides.scrollbar`.

### Runtime

`ScrollSurface` semantic wrapper (shipped in `starter-components/` and the
02-example) sets `data-scroll-surface`, `data-scrollbar-style`, `data-scroll-axis`,
injects `--scrollbar-*` CSS variables, and resolves theme default -> surface
override -> fallback.

Rendering:
- Chromium/Safari: `::-webkit-scrollbar` track/thumb/hover/active.
- Firefox: `scrollbar-width: thin` + `scrollbar-color`.
- Both axes styled (`--scrollbar-width` / `--scrollbar-height`).
- `overscroll-behavior: contain`; `scrollbar-gutter: stable`; coarse pointer ->
  `system-native`; forced-colors overrides; reduced-motion overrides.
- Fullscreen presenter: body scroll lock via `html[data-presentation-mode]`,
  presenter shell `position: fixed; overflow: hidden`, presenter-tree scrollbars
  hidden, fullscreen lifecycle saves/restores body overflow + scroll position and
  cleans up on `fullscreenchange`, unmount, and route change.

## Deliverables

New files:
- `skills/deckforge/assets/scrollbar-manifest.json`
- `skills/deckforge/assets/scrollbar-manifest.schema.json`
- `skills/deckforge/references/scrollbar-and-scroll-surfaces.md`
- `scripts/audit_scrollbars.py` (+ embedded copy in `skills/deckforge/scripts/`)
- `examples/02-example/src/deck/scrollbars/*` (types, registry, resolve, runtime,
  hook, ScrollSurface, css)

Modified files:
- `skills/deckforge/assets/theme-manifest.json` (scrollbar mapping per theme)
- `skills/deckforge/assets/deck-project.schema.json` (scrollbar override/capability)
- `scripts/validate_catalogs.py` (catalog + theme mapping rules)
- `scripts/validate_output_contract.py` (scrollbar capability block)
- `skills/deckforge/SKILL.md`, `system-prompt.md`,
  `built-in-skills/{presenter-experience,design-system-binding,quality-gate}.md`,
  `references/delivery-acceptance-contract.md`
- `skills/deckforge/starter-components/base.css` (+ new scrollbar starter component)
- `examples/02-example/src/{styles.css,App.tsx,editor/EditorApp.tsx,presenter/PresenterApp.tsx,deck/types.ts,deck/themes.ts}`
- `examples/01-example/{styles.css,app.js}` (presenter no-scrollbar + themed scrollbars)

## Verification (repo-appropriate scope)

The full plan's Playwright cross-browser matrix is out of scope. Repo gates:
- Extended `scripts/validate_catalogs.py` (plan checks 1-15).
- `scripts/audit_scrollbars.py` runtime/source audit.
- Vitest unit tests in `examples/02-example/tests/` for resolution logic, CSS-var
  output, and fullscreen lock helpers.
- `validate_output_contract.py` scrollbar capability block.
- `npm run validate`, `npm run test`, `npm run test:visual` remain green, with
  embedded skill copies regenerated via `sync_embedded_skills.py`.

## Acceptance criteria

- Every theme resolves a valid scrollbar; presenter/slide-stage always `none`.
- Slide canvas and fullscreen presenter show no scrollbar and cannot scroll.
- Editor scrollbars are themed, smooth (native), and layout-stable.
- Reduced motion, forced colors, high contrast, and touch devices degrade safely.
- All repo gates pass from a clean checkout.
