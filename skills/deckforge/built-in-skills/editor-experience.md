# Editor Experience

The editor must make common actions obvious while keeping advanced controls contextual. It should feel like a focused presentation tool, not an exposed JSON editor or an unrestricted whiteboard.

## Required surface

Provide a slide rail, main canvas, top-level toolbar, contextual formatting controls, insert menu, properties panel, notes area, zoom and fit controls, grid/guides, autosave state, present action, and a discoverable command palette. Keep the center canvas visually dominant.

## State architecture

Separate persisted `DeckProject` data from ephemeral editor state such as selection, hover, active panel, open dialogs, pointer gesture, and viewport transform. Use command objects or equivalent transactions for undo/redo. A drag or resize gesture should create one history entry when committed, not hundreds of entries during pointer movement. Preserve stable IDs and support reversible operations.

## Selection and manipulation

Define single selection, multi-selection, slide selection, text-editing mode, group selection, locked content, and nested interactive blocks. Selection handles must not change the rendered slide geometry. Support move, resize, rotate only when meaningful, duplicate, delete, group, lock, align, distribute, layer ordering, copy/paste, and keyboard nudging. Provide snapping feedback without making precision work impossible.

## Toolbar behavior

Use the toolbar manifest as the command contract. Show universal actions consistently and object-specific actions contextually. Disable unavailable actions with an explanation rather than silently hiding core commands. Keep dangerous actions reversible or confirmed. Provide shortcut hints in menus and tooltips.

## Content insertion

Insert semantic blocks—heading, text, image, chart, diagram, table, code, media, embed—not arbitrary raw HTML. New blocks should receive sensible size, position, tokens, alt-text prompts, and source fields. Rich-text editing must preserve schema integrity and history.

## Reliability

Handle autosave, offline/retry states, version conflicts, asset upload progress, broken media, and validation errors visibly. Never lose user work when switching slides or entering presenter mode.

## Verification

Test the full path with mouse, keyboard, and touch where editing is supported. Verify selection, copy/paste, undo/redo, slide reorder, notes, theme/layout changes, autosave recovery, error states, and presentation launch.
