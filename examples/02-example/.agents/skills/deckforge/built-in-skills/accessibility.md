# Accessibility

Accessibility is a release requirement for both the editor and the presentation surface, not a final visual polish pass.

## Inspect

- Determine the target accessibility level and the application's existing component primitives.
- Review semantic reading order independently from absolute canvas coordinates.
- Inventory every keyboard-interactive control, media block, data visual, diagram, embed, and animated sequence.
- Test editor, presenter, speaker view, overview, dialogs, menus, and published embeds separately.

## Implement

- Use semantic controls and landmarks before adding ARIA. Every icon-only action needs an accessible name and persistent tooltip.
- Maintain visible focus, logical tab order, focus restoration after dialogs, and keyboard alternatives for pointer-only operations such as drag, resize, reorder, and canvas panning.
- Provide alt text for informative images, a concise text summary for every chart and diagram, captions or transcripts for prerecorded media, and labels for interactive embeds.
- Never encode status, series, or emphasis by color alone. Keep contrast valid across themes, selected states, focus rings, charts, and projected presentation conditions.
- Respect `prefers-reduced-motion`. Replace movement with immediate appearance or a short crossfade while preserving build order and meaning.
- Keep touch targets large enough for presenter controls and avoid gestures that have no visible alternative.
- Announce autosave, errors, slide changes, and collaboration events through non-disruptive status regions where useful.

## Verify

Test the entire critical path with keyboard only: open deck, select a slide, edit content, undo, present, navigate builds, open overview, exit, and publish. Check at 200% zoom and a narrow viewport. Use automated accessibility tooling as a baseline, then manually inspect reading order, focus movement, screen-reader names, chart summaries, and reduced-motion behavior.

Blocking failures include inaccessible core navigation, keyboard traps, lost focus, unlabeled controls, missing alternatives for essential visuals, unreadable contrast, and content that becomes unusable under reduced motion or zoom.

## Two-layer model

DeckForge core rules always apply: semantic HTML, native controls, keyboard
operation, visible focus, reduced motion, contrast, reading order, alternatives,
non-color encoding, private-note isolation, and export accessibility reporting.
Topic-specific providers load only when relevant: forms, dialogs, keyboard,
color modes, SVG, charts, maps, video, tables, and drag-and-drop.

## Chart accessibility

Apply `references/chart-accessibility-contract.md`: every chart provides a text
takeaway, a tabular or textual data alternative, a secondary encoding beyond
color, keyboard behavior when interactive, and export-specific loss reporting.

## Release classifications

- Blocking for publish/export.
- Profile-blocking for the professional profile; allowed in draft.
- Advisory repair.
- Accepted format-specific loss with explicit disclosure.

Never mark a system accessible based only on automated scanning.
