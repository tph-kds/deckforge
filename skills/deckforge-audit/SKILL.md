---
name: deckforge-audit
description: Audit an existing web slide deck, presentation editor, or presenter mode for story, UI/UX, layout, accessibility, motion, performance, trust, and AI-slop. Use for review-only requests or when the user wants a prioritized remediation backlog.
version: 3.0.0
---

# DeckForge Audit

Read `../deckforge/system-prompt.md`, `../deckforge/built-in-skills/quality-gate.md`, and `../deckforge/assets/quality-rubric.json` before reviewing the target.

Inspect the repository structure, deck model, semantic layout bindings, renderer, editor commands, persistence, presenter state, styles, routes, and tests. Run `../deckforge/scripts/audit_deck_layout.py` against representative DeckProject files and `../deckforge/scripts/validate_output_contract.py` against the generated application using its declared delivery profile. Run the application when possible and review every representative slide at the canonical 16:9 viewport plus a narrow viewport. Exercise keyboard navigation, touch behavior, builds, overview, notes, fullscreen, reduced motion, focus order, and embed mode when those capabilities exist.

Report evidence by route, component, slide, viewport, and interaction. Separate findings into blocking defects, high-impact improvements, and optional polish. For each issue, explain the consequence and a concrete remediation. Detect unsupported claims, invented metrics, generic AI aesthetics, repeated layouts, weak narrative rhythm, overflow, inaccessible controls, and editor chrome leaking into the audience surface.

Do not edit the project unless explicitly asked. Do not claim visual, accessibility, performance, or keyboard checks were run when the relevant preview or tooling was unavailable.


Treat missing required editor behavior, decorative-only controls, unresolved layout slots, collisions, unsafe margins, missing shortcut guidance, and persistence failures as blocking defects.
