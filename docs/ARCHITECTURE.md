# Architecture

## Skill architecture

The primary `deckforge` skill is intentionally short. It loads `system-prompt.md`, detects the task mode, and then reads only the built-in workflow and reference documents needed for the current request. This limits context while keeping the methodology detailed.

## Generated application architecture

A production target should separate:

1. **Deck domain** — serializable `DeckProject`, slides, blocks, themes, assets, sources, versioning.
2. **Editor domain** — selection, history, drag/resize, toolbar, rich-text editing, alignment, comments.
3. **Presentation domain** — navigation, builds, transitions, speaker view, overview, deep links.
4. **Rendering domain** — layout engine, block registry, responsive rules, asset loading.
5. **Delivery domain** — persistence, access policy, publish, embed, analytics, export adapters.

Recommended folder shape in a target React application:

```text
src/features/decks/
├── domain/          # schemas, types, commands, migrations
├── editor/          # canvas, toolbar, selection, history
├── presenter/       # stage, navigation, notes, overview
├── renderer/        # layouts, block registry, responsive rendering
├── templates/       # template and theme adapters
├── publishing/      # save, publish, embed contracts
└── testing/         # fixtures, visual and accessibility tests
```

## State rules

- Persist serializable deck data, not DOM nodes.
- Keep ephemeral UI state separate from deck content.
- Use command-based history for undo/redo.
- Give each slide and block a stable ID.
- Treat layout, theme, and content as separate dimensions.
- Validate at import, save, publish, and migration boundaries.
