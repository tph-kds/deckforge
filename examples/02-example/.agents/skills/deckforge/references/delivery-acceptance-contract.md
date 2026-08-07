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

### Required scrollbar behavior

- every permitted scroll container uses the semantic scroll-surface wrapper and a theme-mapped scrollbar style;
- scrollbars are theme-aware with WebKit, Firefox (`scrollbar-color`), forced-colors, high-contrast, and coarse-pointer fallbacks;
- `scrollbar-gutter` stays stable so scrollbar appearance never shifts content;
- scrolling stays native (no wheel interception); programmatic scroll is smooth only when motion is allowed;
- the slide canvas is never scrollable and the fullscreen presenter never shows or scrolls a scrollbar;
- entering and leaving fullscreen presentation locks and restores document scroll cleanly.

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
- metric blocks missing a value or label;
- default browser scrollbars on a scrollable surface (no theme-aware scrollbar styling);
- a scrollable slide canvas or a fullscreen presenter that scrolls or shows a scrollbar;
- `presentation.routes` present but a presenter surface that leaks document scroll.

## Validation commands

Run before declaring completion:

```bash
python <deckforge-skill>/scripts/validate_deck_project.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_layout.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_content.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_assets.py <deck.json>
python <deckforge-skill>/scripts/audit_deck_motion.py <deck.json>
python <deckforge-skill>/scripts/validate_capability_receipt.py <target-project>/capability-receipt.json
python <deckforge-skill>/scripts/validate_output_contract.py <target-project> --profile <profile> --advisory
python <deckforge-skill>/scripts/audit_scrollbars.py <target-project>
```

All must exit 0, plus the production build and the target project's own test suite.

## Capability receipt

The `capability-receipt.json` in the target project is the blocking source of truth. It must:

- reference capability IDs from `assets/capability-catalog.json` (or `schemas/capability-catalog.json`);
- cover every `requiredCapabilityIds` entry of the selected delivery profile;
- mark a capability `implemented` only with referenced, existing test files and evidence paths and only when the capability is actually exercised by a trusted runner;
- a profile-required capability must be `implemented`; `partial`, `unverified`, `blocked`, and `unsupported` fail strict profile validation;
- mark everything without behavioral proof as `unverified`, `unsupported`, or `blocked`.

`validate_capability_receipt.py` enforces these rules. Regex scanning is retained only as a non-blocking advisory tool.

## Profile: presentation-runtime

The presenter may omit editing, but must still provide navigation, fullscreen, overview, reduced motion, shortcut help, and responsive viewing. Use only when explicitly requested.

## Evidence of completion

Report exact routes, files, commands, checks, and remaining limitations. Screenshots or visual inspection notes are preferred when the environment supports them.
