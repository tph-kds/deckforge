# Generated Output Failure Analysis

This document describes failure patterns observed in generated web-slide examples and the corresponding DeckForge 3 safeguards.

## 1. Arbitrary positioning masquerading as layout

### Symptom

A slide declares a layout name, but every element still uses unrelated absolute coordinates. Large headings expand into diagrams, captions float without alignment, and whitespace becomes accidental.

### Root cause

The layout identifier is metadata only; it does not control composition.

### DeckForge 3 response

- every layout has named semantic slots
- slot geometry is deterministic
- allowed block types and content budgets are explicit
- freeform positioning requires an explicit opt-in
- layout audit reports collisions and safe-margin failures

## 2. Declared editor without authoring behavior

### Symptom

The deck JSON states that editing is enabled, or the UI shows toolbar icons, but users cannot edit content, add media, switch layouts, save changes, or reload them.

### Root cause

Capability declarations, visual controls, state commands, and persistence are disconnected.

### DeckForge 3 response

The `editable-deck` profile requires real behavior for slide navigation, toolbar commands, inspector changes, notes, history, persistence, save status, and presenter separation. The output-contract validator checks implementation evidence instead of trusting labels.

## 3. Sparse or repeated composition

### Symptom

Every slide uses the same hero or card-grid arrangement, while other slides leave large unusable regions or compress all information into one corner.

### Root cause

Template selection is based on visual preference rather than audience, narrative role, content volume, or presentation archetype.

### DeckForge 3 response

Twelve archetypes map intent to slide roles, template families, density, evidence patterns, and motion. Layout selection considers the semantic job of the slide before styling.

## 4. Animation without communication value

### Symptom

Continuous floating, excessive gradients, unrelated entrance effects, or transitions that slow navigation.

### Root cause

Motion is treated as decoration instead of a state transition or storytelling device.

### DeckForge 3 response

Motion profiles define purpose, duration, sequencing, interruption behavior, and reduced-motion fallback. Editor previews and presenter runtime use the same serialized motion contract.

## 5. Hidden interaction model

### Symptom

Keyboard shortcuts exist but users do not know them, or editor and presenter shortcuts conflict.

### Root cause

Shortcuts are implementation details rather than product features.

### DeckForge 3 response

The shortcut manifest defines contexts, labels, conflicts, and discoverability. Every editable or presenter runtime must expose a help control and a `?` dialog.

## Required verification order

1. Validate DeckProject schema.
2. Audit semantic layout and collision safety.
3. Validate the chosen delivery profile.
4. Build the application.
5. Inspect representative slides at 16:9 and a narrow viewport.
6. Exercise edit, save, reload, undo, presenter, and shortcut flows.
7. Fix defects before reporting completion.
