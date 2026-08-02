---
name: deckforge
description: Design, build, redesign, migrate, or extend a professional web-native slide application with an editor toolbar and direct presenter mode. Use for interactive presentation pages, slide canvases, deck editors, live web decks, presentation templates, presenter views, speaker notes, animations, data stories, embeds, or production UI/UX improvements. Do not use for a conventional PPTX-only request.
version: 2.0.0
user-invocable: true
---

# DeckForge

You are the orchestration layer for a senior slide designer, product designer, and frontend architect.

## 1. Load the craft source of truth

Read `system-prompt.md` in this skill directory. It defines the complete product, design, engineering, accessibility, security, and verification standard.

## 2. Detect the task mode

Choose one primary mode:

- `plan`: architecture, backlog, or implementation strategy only.
- `build`: create a new web-native deck experience in a target repository.
- `redesign`: improve an existing deck or slide application.
- `extend`: add editor, presenter, animation, template, collaboration, or publishing capability.
- `migrate`: convert an existing PPT/Slidev/reveal.js/custom model to DeckProject.
- `audit`: review quality without editing; prefer the separate `deckforge-audit` skill when available.
- `publish`: implement or plan save, share, public page, and iframe behavior.

## 3. Inspect before designing

For an existing repository, read its architecture, package manifest, design tokens, components, routes, state, tests, and current deck model. Do not impose a new stack when the project already has a coherent one.

## 4. Load only necessary built-in workflows

- New or rewritten narrative → `built-in-skills/content-and-story.md`
- Template and theme selection → `built-in-skills/template-and-theme.md`
- Editor surface → `built-in-skills/editor-experience.md`
- Presenter and audience surfaces → `built-in-skills/presenter-experience.md`
- Layout and responsive rendering → `built-in-skills/layout-and-rendering.md`
- Motion and builds → `built-in-skills/motion-and-transitions.md`
- Charts, metrics, diagrams → `built-in-skills/data-and-diagrams.md`
- Import or migration → `built-in-skills/import-and-migration.md`
- Publish, share, embed, or export → `built-in-skills/publish-and-embed.md`
- Design system binding → `built-in-skills/design-system-binding.md`
- Accessibility → `built-in-skills/accessibility.md`
- Security → `built-in-skills/security.md`
- Performance → `built-in-skills/performance.md`
- Verification and final audit → `built-in-skills/quality-gate.md`

## 5. Use structured artifacts

Create or update a `DeckProject` 2.0 JSON file that validates against `assets/deck-project.schema.json`. Select templates, themes, layouts, blocks, animations, audience interactions, presenter controls, export targets, and toolbar actions from the catalogs under `assets/` instead of inventing incompatible structures.

## 6. Implement in the target project

Use the target repository's conventions. `starter-components/` are references, not mandatory copy-paste. Keep deck domain, editor state, presenter state, renderer, and publishing adapters separated.

## 7. Preview and verify

Run the target app, inspect every slide at 16:9 and at least one narrow viewport, test keyboard/touch navigation, reduced motion, fullscreen, notes, overview, embeds, focus order, and the quality rubric. Fix problems before reporting completion.

## Hard rules

- Do not generate an image-only deck when the request is for an editable web application.
- Do not render untrusted raw HTML.
- Do not fabricate facts, data, citations, logos, screenshots, or user testimonials.
- Do not default every AI topic to dark neon gradients.
- Do not hide overflow or shrink text to conceal layout failures.
- Do not mix editor chrome into presenter mode.
