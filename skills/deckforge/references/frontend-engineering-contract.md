# Frontend Engineering Contract

Single source for editor/presenter frontend engineering rules. Built-in skills
reference this contract instead of restating the rules.

## State and commands

- Separate document, transient interaction, persistence, and server state.
- Document changes go through typed commands with explicit inputs and results.
- A command result reports created and removed IDs so selection can be repaired.
- Pointer gestures preview in transient state; a gesture ends in exactly one committed command.
- Components subscribe to the smallest state slice; do not re-render the deck for pointer moves.

## Components

- Prefer focused composable components and public SDK APIs.
- Handle loading, empty, error, conflict, offline, disabled, locked, and recovery states.
- Use semantic tokens and native interactive elements before ARIA.
- Preserve keyboard, focus, touch, reduced-motion, and narrow-view behavior.

## Selection behavior

- After duplicate, delete, undo, and redo, selection must move to a deterministic, valid block.

## Verification

Run typecheck, tests, build, and browser evidence before completion.
