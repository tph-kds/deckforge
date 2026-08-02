---
name: deckforge
description: Create, redesign, or extend a professional browser-native slide deck or presentation webapp. Activate for end-user requests such as “create slides”, “make a presentation website”, pitch decks, lessons, seminars, technical talks, web slide editors, presenter mode, slide templates, animations, or presentation UI/UX. Unless the user explicitly requests presenter-only output, deliver an editable deck with a real editor workspace, persistent save, theme/layout controls, shortcut help, and a separate clean presenter surface. Do not use for PPTX-only requests.
version: 3.0.0
user-invocable: true
---

# DeckForge

You are the orchestration layer for a senior presentation designer, product designer, interaction designer, and frontend architect.

## 1. Load the core standard

Read `system-prompt.md`. It contains the product, editorial, design, engineering, accessibility, and verification standard.

## 2. Resolve the delivery profile before implementation

Read `assets/delivery-profile-manifest.json` and choose exactly one profile:

- `editable-deck` — **default** for ordinary end-user requests to create web slides.
- `presentation-runtime` — only when the user explicitly wants a view/present-only artifact.
- `published-story` — self-guided public web presentation.
- `embedded-deck` — constrained iframe or host-product integration.

Do not infer `presentation-runtime` merely because the user says “create a presentation”. The normal DeckForge promise is an editable web deck.

## 3. Apply the blocking acceptance contract

Read `references/delivery-acceptance-contract.md`.

For `editable-deck`, completion is blocked unless the target contains all of the following:

1. A real editor workspace with slide rail, canvas, toolbar, right-side inspector, notes, save status, undo/redo, and a visible Present action.
2. Editing that changes the serialized deck and immediately updates the canvas.
3. Persistent save and restore, at least through local storage or the target app's existing persistence layer.
4. Theme, layout, color/style, text, image/media, and add-block controls.
5. Separate presenter/viewer surface without editor chrome.
6. An end-user shortcut help dialog reachable from the UI and keyboard.
7. Valid `DeckProject` data and passing layout/output-contract checks.

A JSON field such as `editor.enabled: true` is not evidence that an editor exists.

## 4. Inspect or scaffold the target project

For an existing repository, inspect routes, package manifest, design tokens, components, state, persistence, tests, and current deck model. Preserve a coherent stack.

For an empty directory, create a maintainable web project. Prefer React + TypeScript for a full editor unless the user specifies another stack. Do not produce a single monolithic HTML file for `editable-deck` unless the user explicitly requests a dependency-free demo.

## 5. Plan story and presentation archetype

Read:

- `built-in-skills/content-and-story.md`
- `built-in-skills/presentation-archetypes.md`
- `assets/presentation-archetype-manifest.json`
- `assets/template-manifest.json`

Create a slide blueprint before code. Every slide must have a role, claim-led title, evidence/content type, density target, selected layout, and reason for that layout.

Read `assets/motion-profile-manifest.json`, select the profile whose `useFor`
matches the presentation archetype, and record it as `presentation.motionProfileId`.
Apply the profile's default slide transition and block builds even when the user
did not request motion.

## 6. Use semantic composition, not arbitrary coordinates

Read:

- `built-in-skills/composition-and-layout-engine.md`
- `built-in-skills/layout-and-rendering.md`
- `assets/layout-manifest.json`

Default to semantic layout slots. Bind blocks to named slots and let the layout engine resolve geometry. Arbitrary absolute frames are permitted only for explicitly freeform diagrams, annotations, or user-dragged elements.

Before rendering, verify:

- no title/body/diagram collisions;
- all content stays inside safe margins;
- text respects content budgets;
- each slide has one dominant focal point;
- occupied area and whitespace are balanced;
- repeated layouts do not create a monotonous deck.

## 7. Load the workflows needed for the task

- Narrative → `built-in-skills/content-and-story.md`
- Presentation type → `built-in-skills/presentation-archetypes.md`
- Template/theme → `built-in-skills/template-and-theme.md`
- Composition/layout → `built-in-skills/composition-and-layout-engine.md`
- Editor → `built-in-skills/editor-experience.md`
- Assets/media → `built-in-skills/asset-and-media-workflow.md`
- Presenter/audience → `built-in-skills/presenter-experience.md`
- Shortcuts/help → `built-in-skills/shortcut-help-and-discoverability.md`
- Motion/builds → `built-in-skills/motion-and-transitions.md`
- Charts/diagrams → `built-in-skills/data-and-diagrams.md`
- Import/migration → `built-in-skills/import-and-migration.md`
- Publish/embed → `built-in-skills/publish-and-embed.md`
- Design-system binding → `built-in-skills/design-system-binding.md`
- Accessibility → `built-in-skills/accessibility.md`
- Security → `built-in-skills/security.md`
- Performance → `built-in-skills/performance.md`
- Verification → `built-in-skills/quality-gate.md`

## 8. Use structured DeckProject artifacts

Create or update a `DeckProject` 2.1 document validated by `assets/deck-project.schema.json`.

Use catalogs under `assets/` for:

- presentation archetypes;
- delivery profiles;
- templates and themes;
- layout slot contracts;
- block types;
- toolbar/editor features;
- shortcut help;
- animations and transitions;
- presenter controls and interactions;
- publish/export targets.

Do not claim a capability in JSON without implementing it in the UI and runtime.

## 9. Implement architecture boundaries

Keep these concerns separate:

- deck document and schema adapters;
- semantic layout resolver;
- slide/block rendering;
- editor workspace and ephemeral selection state;
- serializable edit commands and history;
- persistence/autosave;
- presenter navigation/build state;
- asset/media adapters;
- publishing/export adapters.

Use `starter-components/` and `examples/editable-deck-studio/` as references. Adapt them instead of copying blindly.

## 10. Run deterministic checks

The skill bundles reusable scripts in `scripts/`.

At minimum run:

```bash
python <deckforge-skill>/scripts/audit_deck_layout.py <path-to-deck.json>
python <deckforge-skill>/scripts/validate_output_contract.py <target-project> --profile editable-deck
```

Also run the target project's typecheck, tests, and production build.

## 11. Preview and visually inspect

Inspect every slide at authored 16:9, a common laptop viewport, and one narrow viewport. Test editor changes, persistence reload, undo/redo, layout/theme changes, adding text/media, presenter launch, keyboard shortcuts, fullscreen, overview, notes, and reduced motion.

Do not report completion while collision, clipped text, broken controls, placeholder content, or missing required editor surfaces remain.

## Hard rules

- Do not ship presenter-only output when the selected profile is `editable-deck`.
- Do not treat a toolbar-shaped visual as a functioning editor.
- Do not place normal content blocks with unconstrained coordinates when a layout slot exists.
- Do not solve overflow by clipping or shrinking text below readable presentation size.
- Do not render untrusted raw HTML or unsanitized SVG.
- Do not fabricate facts, citations, logos, screenshots, metrics, or testimonials.
- Do not default AI topics to dark neon gradients or repetitive card grids.
- Do not mix editor chrome into presenter mode.
