# Interaction Model

DeckForge distinguishes four interaction layers so authoring controls do not leak into the audience experience.

## 1. Editor interactions

Selection, text editing, drag/resize, alignment, grouping, locking, slide reorder, notes, comments, command history, design controls, and validation. These interactions mutate draft state and require an editor permission boundary.

## 2. Presenter interactions

Navigation, builds, overview, fullscreen, speaker synchronization, timer, blackout, pointer, annotations, captions, and media controls. These affect presentation state but normally do not modify the deck document.

## 3. Audience interactions

Tabs, toggles, tooltips, accessible modals, zoom, filters, quizzes, polls, Q&A, forms, demos, code execution, links, copies, downloads, and narrative branches. They must define keyboard behavior, fallback content, network requirements, analytics policy, and whether state is local or persisted.

## 4. Host/embed interactions

A versioned `postMessage` contract may communicate readiness, dimensions, slide changes, completion, errors, theme, and host navigation. Both host and iframe must validate origin and payload.

The canonical audience interaction catalog is `skills/deckforge/assets/interaction-manifest.json`. Presenter controls are defined in `presenter-control-manifest.json`; editor commands are defined in `toolbar-manifest.json`.

## State ownership

- Persist content and authored interaction definitions in DeckProject.
- Keep selection, hover, open menus, timer, current slide, current build, fullscreen, pointer, and temporary annotations ephemeral.
- Store audience responses only through an authorized runtime adapter.
- Use deterministic IDs so deep links, analytics, collaboration, and migrations remain stable.

## Fallback contract

Every networked, animated, pointer-driven, or sandboxed interaction must define a non-interactive fallback. A published deck must still communicate its core argument when scripts, network access, motion, or third-party embeds are unavailable.
