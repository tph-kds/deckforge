---
name: deckforge-publish
description: Implement or specify save, version, publish, share, public page, iframe embed, analytics, and access-policy behavior for a DeckForge-compatible web presentation.
version: 2.0.0
---

# DeckForge Publish

Read `../deckforge/built-in-skills/publish-and-embed.md`, `../deckforge/built-in-skills/security.md`, `../deckforge/assets/deck-project.schema.json`, and `../../docs/RUNTIME_CONTRACT.md`.

Inspect the target application's authentication, authorization, persistence, asset delivery, routing, CSP, telemetry, and deployment model before designing the publishing flow. Preserve the existing stack when it is coherent.

Define or implement explicit states for draft, private, unlisted, and public decks; immutable or restorable versions; safe slug changes; share links; revocation; and embed policies. Validate ownership, workspace membership, visibility, version, origin allow-list, iframe sandbox, token expiry, asset URLs, analytics privacy, and cache behavior at runtime boundaries. Never trust security fields supplied only by the client-side deck document.

Return the API and data contracts, UI states, error paths, tests, and rollout considerations needed for production. Keep editor-only controls out of the published audience route. Do not expose credentials, unrestricted embed tokens, private notes, comments, or hidden source material in public responses.
