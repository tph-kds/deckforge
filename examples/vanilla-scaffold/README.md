# DeckForge — Vanilla Scaffold (framework-agnostic reference)

This example is the second DeckForge reference implementation: a compact
**plain-DOM + Web Components** editor + presenter written in vanilla
**TypeScript with no framework** (no React, no Vue, no Svelte). It passes the
same gates as the React reference app (`examples/02-example`) and the
dependency-free finished product (`examples/finished-product`), which is the
point: the `editable-deck` output contract is **framework-agnostic**.

## What it proves

- **Framework-agnostic transferability** — the same `editable-deck` gates
  (schema, strict layout, content, motion, output contract, scrollbars) are
  satisfied by an implementation that uses only the browser platform.
- **Web Components** — each editor surface is a custom element
  (`editor-shell`, `slide-rail`, `editor-toolbar`, `inspector-panel`,
  `notes-panel`, `save-status`, `shortcut-help`, `presenter-stage`), and
  authoring state lives in a shared `DeckStore` both surfaces consume.
- **Schema** — `deck.json` passes `scripts/validate/validate_deck_project.py`
  (`schemaVersion 2.1`, catalog-valid `theme`, `layout`, `motionProfileId`,
  every block bound to a real layout slot, every metric backed by a source).
- **Strict layout** — `audit_deck_layout.py --strict` with 0 errors/warnings.
- **Content** — `audit_deck_content.py` with 0 errors (unique titles, every
  metric/citation claim backed by a `sourceIds` reference to a real source).
- **Motion** — `audit_deck_motion.py` (transition declared, builds enabled,
  `reducedMotion: respect-system`).
- **Output contract** — `validate_output_contract.py --profile editable-deck`
  advisory scan: editor shell, slide rail, toolbar, inspector, speaker notes,
  state mutation, undo/redo, persistence, save status, theme control, layout
  control, media control, add-text, present-current, default motion, shortcut
  help, presenter markers, and the themed scrollbar system.
- **Scrollbars** — themed custom scrollbars with cross-browser fallbacks,
  stable gutters, reduced-motion + forced-colors + coarse-pointer overrides,
  slide stage and fullscreen presenter never scrollable, speaker notes scroll
  independently.

## Routes / states

Hash routing picks the surface:

| Route        | Surface          | What it renders                                    |
| ------------ | ---------------- | -------------------------------------------------- |
| `#/editor`   | editor shell     | slide rail, toolbar, stage, inspector, notes, save status |
| `#/present`  | presenter stage  | presenter chrome docked outside the slide stage, notes, overview |

Start on the editor. Click **Present** to enter the presenter surface (or
press `?` for the full shortcut list). `Ctrl+S` saves; edits autosave to
`localStorage` and are undoable via `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`.
`F` toggles fullscreen and **Overview** opens the slide grid while presenting.

## How the scaffold is structured

```
examples/vanilla-scaffold/
├── deck.json          # DeckProject 2.1, passes every audit
├── index.html         # single mount point + stylesheet
├── src/app.ts         # bootstrap: reads deck.json, hash-routes editor/presenter, keyboard
├── src/editor.ts      # DeckStore (undo/redo, persistence) + editor custom elements
├── src/presenter.ts   # PresenterStage custom element (nav, fullscreen, overview)
├── src/styles.css     # theme tokens + scrollbar system
└── package.json       # vite build / vitest test scripts
```

`src/editor.ts` owns the shared `DeckStore`: every mutation flows through
`updateDeck` (which pushes an undo snapshot and schedules an autosave), and
the presenter imports the same store so the two surfaces never drift.

## Why Web Components and no shadow DOM

The scaffold registers custom elements that render into **light DOM**, so the
single global `styles.css` governs them exactly like the finished-product
reference. Shadow roots are intentionally avoided here to keep the styling
system, themed scrollbars, and `forced-colors` overrides applied through one
stylesheet; teams that want component-scoped styles can attach a shadow root
per element and import the same tokens.

## How to extend it

- Add a block type: define it in the `renderBlock` switch in `editor.ts` and
  list it in `deck.json` → `editor.allowedBlockTypes`.
- Add a toolbar control: create a custom element (or button) in
  `editor.ts`, wire it to a new `DeckStore` command, and render it inside
  `editor-shell`.
- Swap the persistence backend: replace `localStorage` in `DeckStore.persist`
  with an API call; the undo/redo and save-status plumbing is unchanged.

## Publish step

```bash
npm install
npm run build        # outputs a static bundle in dist/
```

Then host `dist/` on any static server (e.g. `npx serve dist`) and embed the
`#/present` route with an `iframe sandbox="allow-scripts allow-forms"`. The
deck document itself lives at `deck.json` and can be published as a static
artifact next to the app.

## Gates

```bash
python scripts/validate/validate_deck_project.py examples/vanilla-scaffold/deck.json
python skills/deckforge/scripts/audit_deck_layout.py examples/vanilla-scaffold/deck.json --strict
python skills/deckforge/scripts/audit_deck_content.py examples/vanilla-scaffold/deck.json
python skills/deckforge/scripts/audit_deck_motion.py examples/vanilla-scaffold/deck.json
python skills/deckforge/scripts/validate_output_contract.py examples/vanilla-scaffold --profile editable-deck --advisory
python skills/deckforge/scripts/audit_scrollbars.py examples/vanilla-scaffold
```
