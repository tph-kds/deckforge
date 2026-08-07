# Quality Gate

Quality validation is blocking. Use `assets/quality-rubric.json`, `references/delivery-acceptance-contract.md`, and the selected delivery profile.

## Deterministic checks

Run:

```bash
python scripts/audits/audit_deck_layout.py <deck.json>
python scripts/audits/audit_deck_content.py <deck.json>
python scripts/validate/validate_capability_receipt.py <target-project>/capability-receipt.json
python scripts/audits/validate_output_contract.py <target-project> --profile <profile> --advisory
```

Also run schema/catalog validation, type checking, tests, production build, accessibility automation, and representative visual regression when supported.

## Capability truth comes from the receipt

Regex scanning of the project is advisory only. The blocking source of truth is the capability receipt:

1. Read `schemas/capability-catalog.json` for the stable capability IDs and their evidence requirements.
2. Read `schemas/capability-receipt.schema.json` for the receipt structure.
3. The selected delivery profile (`assets/delivery-profile-manifest.json`) lists `requiredCapabilityIds`.
4. Author `capability-receipt.json` in the target project and run `validate_capability_receipt.py`.
5. A capability may be marked `implemented` only when every referenced test and evidence file exists, the catalog-mandated entry points, commands, and persistence behavior are listed, and the capability is exercised by a trusted runner. Otherwise use `unverified`, `unsupported`, or `blocked`.
6. Do not claim a capability the project does not have; a fake toolbar label cannot satisfy `edit.text`, and `history.undo` passes only when a change can be made, undone, and redone.

## Document-to-product consistency

Check that every declared capability exists:

- `editor.enabled` requires a real editor surface;
- toolbar controls must mutate DeckProject state;
- `autosave` requires persistence and status feedback;
- `shortcutHelp` requires an in-product accessible help UI;
- `speakerView`, `overview`, `fullscreen`, and interactions must be runnable;
- allowed block types require renderers and insert actions or must be removed from the declaration;
- `motionProfileId` requires a runtime slide transition and default builds (or block-level animations); a deck that is fully static is blocking;
- presenter chrome (timer, position, controls, progress) must be docked outside the slide area — floating chrome over slide content is blocking;
- theme-aware custom scrollbars are required on scrollable editor/publishing surfaces — a default browser scrollbar on a scrollable surface is blocking;
- the slide canvas and the fullscreen presenter must never be scrollable and must expose no scrollbar.

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

Blocking content defects (also caught by `audit_deck_content.py`):

- duplicate slide titles;
- generic context-free titles such as "Overview" or "Thank you";
- the same claim stated verbatim on multiple slides;
- empty text, heading, quote, or callout content;
- metric blocks missing a value or label;
- charts with no caption and little supporting text.

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
