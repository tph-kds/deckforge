# Architecture

## Skill architecture

The primary `deckforge` skill acts as a thin orchestrator. It determines the delivery profile and presentation archetype, reads only the workflows required for the task, then enforces the acceptance contract and deterministic validation scripts.

## Generated application architecture

A dependable target separates six domains:

1. **Deck domain** — serializable `DeckProject`, slides, blocks, layout bindings, themes, assets, notes, citations, and migrations.
2. **Composition domain** — semantic layout slots, content budgets, responsive order, collision policy, and fit behavior.
3. **Editor domain** — selection, commands, history, slide rail, toolbar, inspector, notes, media workflow, save status, and persistence.
4. **Presentation domain** — navigation, builds, transitions, fullscreen, blackout, overview, progress, shortcut help, speaker state, and deep links.
5. **Rendering domain** — layout resolution, block registry, theme tokens, responsive rendering, assets, and reduced-motion behavior.
6. **Delivery domain** — save, versions, access policy, publishing, embed, analytics, and export adapters.

Recommended folder shape in a target React application:

```text
src/features/decks/
├── domain/          # schemas, types, commands, migrations
├── composition/     # semantic slots, fit, collision and responsive rules
├── editor/          # canvas, rail, toolbar, inspector, history and persistence
├── presenter/       # stage, navigation, notes, overview and shortcut help
├── renderer/        # layouts, block registry, themes and asset rendering
├── templates/       # archetypes, templates and theme adapters
├── publishing/      # save, publish, embed and export contracts
└── testing/         # fixtures, contract, layout, visual and accessibility tests
```

## State rules

- Persist serializable deck data, never DOM nodes.
- Keep ephemeral UI state separate from document state.
- Use command-based history for undo and redo.
- Give every slide, block, asset, and command a stable ID.
- Treat story, layout, theme, content, and motion as separate dimensions.
- Use semantic layout slots by default; freeform placement is explicit.
- Validate at import, edit, save, publish, migration, and delivery boundaries.
- A declared feature must have a state transition, renderer behavior, UI affordance, persistence behavior when relevant, and verification evidence.

## Default product surfaces

An `editable-deck` implementation has two distinct top-level surfaces:

- **Editor:** app bar, slide rail, canvas, contextual toolbar, inspector/tools side panel, notes, save state, and access to presentation.
- **Presenter:** clean stage, navigation, progress, overview, fullscreen, blackout, builds, and shortcut guidance.

Editor controls and private notes must never leak into the audience route.
