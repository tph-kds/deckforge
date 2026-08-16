# Starter Components

These files are copyable architecture references for the default **editable-deck** profile. They are not a hosted product, but they now demonstrate the required structural boundaries instead of only presenter scaffolding.

Included references cover:

- DeckProject 2.1 and semantic slot bindings;
- layout-slot resolution and assignment validation;
- command/history state boundaries;
- local persistence and save status;
- editor app bar, slide rail, canvas, inspector, notes, and Present action;
- theme-aware scrollbar system (`ScrollSurface.tsx` + `scrollbars.css`) with stable gutters, WebKit/Firefox fallbacks, reduced-motion, forced-colors, coarse-pointer, and fullscreen presenter scroll isolation;
- contextual toolbar groups;
- accessible shortcut-help dialog;
- presenter reducer, overview, speaker view, and hotkeys;
- block registry, animations, and export contracts;
- deterministic content measurement (overflow, collision, budget, boundary, orphan) and its repair pass (move/trim/truncate with a fixed-point loop).

A production implementation must still adapt authentication, API persistence, collaboration, rich-text/media adapters, schema validation, authorization, asset upload, visual regression, and runtime security to the target product.

**Runtime dependencies**

Generated decks using the scaffold export layer must install:
- `@resvg/resvg-js ^2.6.2` (SVG chart rasterization)
- `jszip ^3.10.1` and `pptxgenjs ^3.12.0` (PPTX export + verification)
- `react ^18.3.1` and `react-dom ^18.3.1`

with `"overrides": { "nanoid": "3.3.17" }`, and devDeps `typescript ^5.5.3`, `vite ^7.3.0`, `vitest ^3.2.7`, `@vitejs/plugin-react ^5.2.0`.
