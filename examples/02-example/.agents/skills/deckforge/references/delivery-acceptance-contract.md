# Delivery Acceptance Contract

Use this contract before declaring a DeckForge implementation complete.

## Profile: editable-deck

### Required routes or explicit equivalent states

- editor workspace;
- clean presenter surface;
- optional published viewer.

Routes may be `/editor` and `/present`, stateful modes, or framework-native equivalents. They must be directly testable.

### Required editor zones

1. Top toolbar with undo, redo, insert, theme/layout, present, and shortcut-help access.
2. Slide rail with add, select, duplicate, delete, and reorder.
3. Central 16:9 canvas with selection affordances and fit/zoom controls.
4. Right inspector with tabs or sections for content, layout, style/theme, animation, and accessibility.
5. Speaker-notes area.
6. Save/autosave state with visible feedback.

### Required edit flows

- edit a slide title and see it rerender immediately;
- change a slide layout without losing content;
- change theme or accent tokens;
- insert a text block;
- insert or replace an image/media block;
- undo and redo an edit;
- save, reload, and restore the edit;
- open presenter mode on the current slide.

### Required help and shortcuts

A visible help action opens an accessible dialog listing editor and presenter shortcuts. At minimum include:

- undo/redo;
- duplicate/delete;
- arrow-key nudge;
- command palette;
- present;
- next/previous slide;
- fullscreen;
- overview;
- speaker notes;
- blackout;
- shortcut help.

### Required layout behavior

- blocks bind to semantic layout slots by default;
- titles and visuals cannot share overlapping slots;
- safe margins are enforced;
- content budgets produce editor warnings;
- freeform blocks are explicitly marked;
- responsive reading order comes from slot order, not absolute coordinates.

### Blocking failures

- editor declared in data but not implemented;
- controls do not mutate deck state;
- save does not survive reload;
- presenter contains editor chrome;
- text or diagrams overlap;
- content is clipped or hidden;
- placeholders remain without being clearly marked;
- shortcut help is absent;
- production build fails;
- no `motionProfileId` or a fully static presenter (no transition, no builds);
- presenter chrome floating over the slide safe area;
- editor with an unassigned grid row or a non-collapsible notes area;
- duplicate slide titles or verbatim repeated claims;
- metric blocks missing a value or label.

## Validation commands

Run before declaring completion:

```bash
python <deckforge-skill>/scripts/validate_deck_project.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_layout.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_content.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_assets.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_motion.py <deck.json>
python <deckforge-skill>/scripts/validate_output_contract.py <target-project> --profile <profile>
```

All must exit 0, plus the production build and the target project's own test suite.

## Profile: presentation-runtime

The presenter may omit editing, but must still provide navigation, fullscreen, overview, reduced motion, shortcut help, and responsive viewing. Use only when explicitly requested.

## Evidence of completion

Report exact routes, files, commands, checks, and remaining limitations. Screenshots or visual inspection notes are preferred when the environment supports them.
