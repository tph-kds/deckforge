# Changelog

## 3.0.0 — 2026-08-02

- Made `editable-deck` the default delivery profile for ordinary end-user slide-creation requests.
- Added enforceable editor, presenter, persistence, shortcut-help, and capability-truth acceptance contracts.
- Converted all 36 layouts into semantic 12×8 compositions with named slots, content budgets, responsive order, and collision policies.
- Added 12 presentation archetypes, 8 motion profiles, 4 delivery profiles, an editor feature manifest, and a shortcut-help manifest.
- Added deterministic layout and generated-output contract validators.
- Expanded DeckProject to schema 2.1 with semantic slots, delivery experience, editor capabilities, fit policy, and shortcut configuration.
- Added complete editor/presenter reference components and the functional `examples/editable-deck-studio` example.
- Added failure-analysis, feature-matrix, and v3 upgrade documentation.
- Strengthened quality gates to block fake editor controls, layout collisions, persistence defects, missing shortcut guidance, and skipped builds.
- Added a 30-slide stress-test deck (`examples/stress-test-30.deck.json`) and a generator (`scripts/generate_stress_deck.py`) to exercise grid, overview, layout, and motion audits at scale; wired into `npm run validate` and the regression test suite.

## 2.2.0 — 2026-08-02

- Added `.agents/plugins/marketplace.json` for wider multi-agent discovery.
- Added four README infographic images and embedded them in repository documentation.
- Refreshed README with professional overview, installation guidance, and supported-agent messaging.
- Added localized `README.vi.md` and `README.zh-CN.md`.

## 2.0.0 — 2026-08-02

- Rebuilt the repository around one primary orchestrator and on-demand built-in workflows.
- Added 48 deck templates, 60 themes, 36 layouts, structured block types, and motion patterns.
- Added the DeckProject schema for editor, presenter, assets, citations, and publishing configuration.
- Added editor and presenter architecture, React/TypeScript starter components, UI/UX quality gates, accessibility requirements, migration and publishing workflows.
- Added deterministic catalog validation, tests, plugin manifests, CI, and expanded documentation.
