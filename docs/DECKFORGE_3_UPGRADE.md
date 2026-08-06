# DeckForge 3 Reliability Upgrade

DeckForge 3 changes the skill from a broad design guide into an enforceable delivery contract for editable, browser-native presentations.

## Why the upgrade was necessary

A generated deck can look plausible while still failing the user's real goal. Typical failures include:

- slide content positioned with arbitrary absolute coordinates
- titles, diagrams, and controls colliding at common viewport sizes
- a declared editor configuration with no functional editor UI
- toolbar buttons that do not mutate or persist deck state
- presenter controls mixed into the editing surface
- repeated or sparse layouts regardless of presentation type
- animations chosen as decoration instead of narrative progression
- keyboard shortcuts that exist in code but are undiscoverable to end users

DeckForge 3 treats these as contract failures rather than optional polish.

## Default delivery profile

When an end user asks to “create slides,” “make a presentation website,” or similar, the default profile is now `editable-deck` unless the user explicitly requests a view-only artifact.

An editable deck must include:

- a real slide rail
- a 16:9 editing canvas
- an editing toolbar
- a contextual inspector or tools side panel
- speaker notes
- undo and redo
- visible save status
- persistence and reload behavior
- theme, layout, text, and media editing
- a separate clean presenter mode
- a keyboard-shortcut help dialog

A static toolbar or a presenter-only page does not satisfy this profile.

## Semantic layout engine

Every catalog layout now defines a deterministic 12×8 composition grid with named slots. Each slot has:

- grid bounds
- allowed block types
- content budgets
- responsive order
- whitespace guidance
- collision policy

Blocks use `slot` and `positionMode: "slot"` by default. Freeform coordinates are reserved for deliberate canvas-authoring cases and must pass stricter boundary and collision checks.

## Presentation archetypes

DeckForge 3 adds 12 archetypes that influence narrative rhythm, density, templates, and visual treatment:

- startup pitch
- investor update
- executive briefing
- product strategy
- technical architecture
- developer conference
- academic seminar
- classroom lesson
- workshop and training
- data and research report
- portfolio and case study
- policy and impact presentation

An archetype is not only a theme. It determines slide roles, density, evidence patterns, interaction expectations, and recommended motion.

## Motion system

Eight motion profiles distinguish restrained executive delivery from educational builds, technical step-throughs, and product demonstrations. Motion must be:

- interruptible
- reduced-motion aware
- previewable in the editor
- limited to transform and opacity where possible
- meaningful to the story or interaction

## Deterministic verification

Two new validators are mandatory for generated examples and recommended for target projects:

```bash
python scripts/audits/audit_deck_layout.py <deck.json> --strict
python scripts/audits/validate_output_contract.py <project-directory> --profile editable-deck
```

The layout audit detects unsafe margins, missing required slots, unresolved slot references, content-budget violations, and collisions. The output-contract validator checks that claimed editor and presenter capabilities are actually represented by implementation behavior.

## Complete reference example

`examples/02-example/` demonstrates the minimum truthful editable-deck profile without external dependencies. It includes:

- editable slide thumbnails
- toolbar and inspector
- layout and theme changes
- text and image insertion
- notes
- local persistence
- undo and redo
- save status
- presenter mode
- fullscreen, blackout, overview, and shortcut guidance

Run it with Vite:

```bash
cd examples/02-example
npm install
npm run dev
```
