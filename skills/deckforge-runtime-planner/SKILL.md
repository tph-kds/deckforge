---
name: deckforge-runtime-planner
description: Plan the architecture, data model, APIs, storage, publishing, embedding, versioning, collaboration, and deployment of a production web-slide runtime without implementing it.
version: 2.0.0
---

# DeckForge Runtime Planner

Read `../../docs/ARCHITECTURE.md`, `../../docs/RUNTIME_CONTRACT.md`, `../deckforge/assets/deck-project.schema.json`, and the relevant editor, presenter, security, performance, and publishing workflows.

Inspect the target organization, repository, deployment platform, identity model, data boundaries, and expected scale. Produce a concrete architecture with component boundaries, request and event flows, state ownership, APIs, persistence models, asset storage, authorization checks, versioning, collaboration semantics, publishing and embed policy, observability, migrations, backup and recovery, tests, and rollout phases.

Keep the serializable deck domain separate from ephemeral editor state. Keep editor, presenter, rendering, delivery, and background-processing concerns independently testable. Make assumptions, trade-offs, failure modes, and rejected alternatives explicit. Include how schema evolution, concurrent edits, autosave, optimistic updates, offline recovery, CDN caching, rendering performance, and revocation are handled.

This skill plans rather than implements. It must not invent infrastructure that conflicts with an existing coherent platform, and it must not place secrets, authorization decisions, or untrusted HTML inside DeckProject content.
