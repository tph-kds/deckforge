# Quality Gate

Quality validation is blocking. Use `assets/quality-rubric.json`, `references/delivery-acceptance-contract.md`, and the selected delivery profile.

## Deterministic checks

Run:

```bash
python scripts/audit_deck_layout.py <deck.json>
python scripts/validate_output_contract.py <target-project> --profile <profile>
```

Also run schema/catalog validation, type checking, tests, production build, accessibility automation, and representative visual regression when supported.

## Document-to-product consistency

Check that every declared capability exists:

- `editor.enabled` requires a real editor surface;
- toolbar controls must mutate DeckProject state;
- `autosave` requires persistence and status feedback;
- `shortcutHelp` requires an in-product accessible help UI;
- `speakerView`, `overview`, `fullscreen`, and interactions must be runnable;
- allowed block types require renderers and insert actions or must be removed from the declaration.

Metadata alone never satisfies a feature.

## Story and design review

Read slide titles as a narrative. Inspect each slide for:

- one clear job and focal point;
- hierarchy and reading path;
- safe margins and alignment;
- density and whitespace balance;
- content-fit warnings;
- meaningful imagery/data;
- sources and citations;
- varied but coherent layout rhythm;
- absence of placeholders and AI-slop patterns.

## Collision review

Block completion for:

- title overlapping a diagram, chart, or control;
- blocks outside canvas/safe margins;
- high-overlap content frames;
- hidden/clipped content;
- diagram nodes or labels outside their slot;
- presenter controls covering slide content without reserved safe area.

## Behavioral review

Exercise:

- editor selection, direct text edit, insertion, duplicate/delete, reorder;
- theme/layout/style/media changes;
- undo/redo;
- save, reload, recovery, and errors;
- notes and presentation launch;
- presenter builds, keyboard/touch, overview, fullscreen, blackout, deep links, speaker view, reduced motion;
- shortcut-help discoverability.

## Viewports and accessibility

Review canonical 16:9, a common laptop viewport, embed width, and narrow/mobile reading mode. Test keyboard-only flow, focus restoration, labels, contrast, alt text, chart summaries, zoom, and reduced motion.

## Handoff

Fix all blocking defects and high-impact in-scope issues. Report exact commands, routes, viewports, files, and remaining limitations. Never claim a browser or interaction was tested when it was not.
