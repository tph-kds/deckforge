# DeckForge — Finished Product (canonical reference)

This example is the DeckForge **"finished product"** reference: a compact,
dependency-free **TypeScript/vanilla** editor + presenter (no React) that
satisfies every gate the `editable-deck` profile checks. Use it as the
canonical shape for a generated, publishable deck application.

## What it proves

- **Schema** — `deck.json` passes `scripts/validate/validate_deck_project.py`
  (`schemaVersion 2.1`, catalog-valid `theme`, `layout`, `motionProfileId`,
  every block bound to a real layout slot, every metric backed by a source).
- **Strict layout** — `audit_deck_layout.py --strict` with 0 errors/warnings.
- **Content** — `audit_deck_content.py` with 0 errors (unique titles, no
  generic titles, every metric claim has a backing `sourceIds` reference).
- **Motion** — `audit_deck_motion.py` (transition declared, builds enabled,
  `reducedMotion: respect-system`).
- **Output contract** — `validate_output_contract.py --profile editable-deck`
  advisory scan: editor shell, slide rail, toolbar, inspector, speaker notes,
  state mutation, undo/redo, persistence, save status, theme control, layout
  control, media control, add-text, present-current, default motion, shortcut
  help, presenter markers, and the themed scrollbar system.
- **Scrollbars** — `audit_scrollbars.py`: themed custom scrollbars with
  cross-browser fallbacks, stable gutters, reduced-motion + forced-colors +
  coarse-pointer overrides, slide stage and fullscreen presenter never
  scrollable, speaker notes scroll independently.

## Routes / states

The app is a single-file editor + presenter with two surfaces toggled by
`data-mode` and hash routing:

| Route        | Surface         | What it renders                                  |
| ------------ | --------------- | ------------------------------------------------ |
| `#/editor`   | `data-mode="editor"`  | `editor-shell`: slide rail, toolbar, stage, inspector, notes, save status |
| `#/present`  | `data-mode="present"` | `presenter-shell`: presenter chrome docked outside the slide stage, notes |

Start on the editor. Click **Present** (or press `?` for the shortcut list) to
enter the presenter surface. `Ctrl+S` saves; edits autosave to `localStorage`
and are undoable via `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`.

## Embed contract

Publishing honors the `publish.embed` block from `deck.json`:

- Origin allow-list: `publish.embed.allowedOrigins` (empty = embeddable
  anywhere; populate to restrict).
- Sandbox: `publish.embed.sandbox` (`allow-scripts`, `allow-forms`,
  `allow-popups`) is applied to any host iframe.
- Responsive scaling: the presenter stage is aspect-ratio bound
  (`aspect-ratio: 16 / 9`) and scales to its container; it never relies on
  the host page's scroll.

## Publish step

```bash
npm install
npm run build        # outputs a static bundle in dist/
```

Then host `dist/` on any static server (e.g. `npx serve dist`) and embed the
`#/present` route with an `iframe sandbox="allow-scripts allow-forms"`. The
deck document itself lives at `deck.json` and can be published as a static
artifact next to the app.

## Layout of the example

```
examples/finished-product/
├── deck.json          # DeckProject 2.1, passes every audit
├── index.html         # single mount point + stylesheet
├── src/app.ts         # the whole editor + presenter (dependency-free)
├── src/styles.css     # theme tokens + scrollbar system
└── package.json       # vite build / vitest test scripts
```
