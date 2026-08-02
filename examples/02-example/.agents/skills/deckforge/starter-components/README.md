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
