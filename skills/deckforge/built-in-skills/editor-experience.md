# Editor Experience

The editor is a required product surface for the default `editable-deck` profile. It must edit the serialized deck, not merely display toolbar icons.

## Required workspace anatomy

Use a stable application shell:

1. **Top app bar** — document title, undo/redo, insert, theme/layout, save status, preview/present, share/export, help.
2. **Slide rail** — add, select, duplicate, delete, reorder, section grouping, hidden-slide state, thumbnail preview.
3. **Canvas workspace** — 16:9 stage, zoom/fit, selection, guides, snap feedback, safe margins, overflow warnings.
4. **Right inspector** — context-sensitive panels for content, layout, style/theme, animation, media, accessibility, and source metadata.
5. **Notes/footer area** — speaker notes, comments when requested, validation/status messages.

The canvas remains visually dominant. Panels may collapse but cannot disappear without a way to reopen them.

## Minimum viable editing contract

The user must be able to:

- edit title and body text;
- add text, image/media, shape, chart, table, code, and diagram blocks when enabled;
- change layout and preserve/rebind content;
- change theme, palette, fonts, background, and semantic styles;
- replace images and change crop/fit/focal point;
- move or resize freeform blocks;
- align, distribute, group, lock, layer, duplicate, and delete;
- create, duplicate, delete, and reorder slides;
- edit speaker notes;
- set transitions and build animations;
- undo/redo;
- save and restore;
- present from the current slide;
- open shortcut guidance.

If scope requires a smaller MVP, document which controls are intentionally disabled. Do not advertise unsupported controls.

## State architecture

Separate:

- persisted DeckProject document;
- editor selection and hover state;
- active tool and panel state;
- viewport/zoom state;
- pointer gesture state;
- save/retry/conflict state.

Use command objects, transactions, or equivalent reversible mutations. A drag gesture creates one history entry at commit. Use stable IDs.

## Layout editing

Changing a slide layout should rebind blocks by semantic role/slot rather than deleting content. Show warnings for unassigned or over-budget content. Offer a recovery area for blocks that cannot be mapped automatically.

## Text editing

Use schema-controlled rich text where formatting beyond plain text is required. Normalize paste, keep history atomic, and preserve accessibility semantics. Do not use unrestricted raw HTML.

## Persistence

At minimum for a standalone demo:

- autosave DeckProject JSON to local storage;
- show `Saving…`, `Saved`, and `Save failed` states;
- restore on reload;
- allow reset/export of the document.

For an existing product, use its persistence/API conventions. Handle retries, version conflicts, broken assets, and offline states visibly.

## Shortcut discoverability

Use `shortcut-help-and-discoverability.md`. Shortcut hints belong in tooltips and menus, and a visible Help action must open the full list.

## Verification

Test the full edit path:

1. modify title;
2. change layout;
3. change theme/accent;
4. insert text and image;
5. undo and redo;
6. save and reload;
7. launch presenter on the current slide;
8. return without losing work.

Failure in any selected-profile requirement blocks completion.
