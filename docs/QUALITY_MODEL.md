# Quality Model

A deck is not complete when it merely renders. DeckForge 3 requires story, content fit, composition, editor truth, presenter behavior, accessibility, performance, trust, and verification to satisfy `skills/deckforge/assets/quality-rubric.json`.

## Blocking conditions

- clipped, overflowed, or collided content
- unsafe margins or unresolved semantic layout slots
- unreadable text at presentation distance
- repeated layout rhythm that ignores slide purpose
- a claimed editor without functional mutation and persistence
- toolbar or inspector controls that are decorative only
- presenter mode exposing editing controls or private notes
- broken keyboard navigation or missing shortcut guidance
- missing focus states, labels, or meaningful alternative text
- motion that ignores reduced-motion preferences or blocks navigation
- untrusted raw HTML, unsafe asset handling, or leaked credentials
- placeholder data, invented evidence, or fabricated citations
- failed production build or skipped required validation

## Required gates

```bash
python scripts/validate/validate_deck_project.py <deck.json>
python scripts/audits/audit_deck_layout.py <deck.json> --strict
python scripts/audits/validate_output_contract.py <project-directory> --profile editable-deck
```

The quality gate must also exercise edit, save, reload, undo, presenter navigation, fullscreen, and shortcut-help behavior when the chosen profile requires them.

## Anti-slop review

The review explicitly searches for repeated card grids, excessive gradients, decorative glass panels, random icons, generic titles, unexplained neon AI styling, fake dashboards, sparse accidental whitespace, and visuals that do not carry information.

## Scoring

The weighted rubric has a passing threshold of 88. Blocking failures override the numeric score. A strong visual impression cannot compensate for false capabilities, layout collision, inaccessible interaction, or data loss.
