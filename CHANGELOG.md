# Changelog

## 3.2.0 — 2026-08-07

- Added generated-output failure-pattern regression fixtures and tests for layout masquerade, sparse composition, decorative motion, and hidden interaction model.
- Added evidence-trust audits: metric and citation claims must reference a deck `sources` entry, with URL-format validation for source references.
- Added a WCAG 2.2 AA accessibility audit (contrast + reduced-motion gating) with a human-review checklist in the delivery-acceptance contract.
- Added a performance-budget configuration, a Lighthouse-report gate, and an informational CI job.
- Formalized the release process: a release checklist, version-bump policy, changelog requirement, and a mandatory evaluator release gate.
- Added an Agent Skills CLI discovery integration check and a cross-agent runtime compatibility matrix with structural validation for all three plugin manifests.
- Added two new reference implementations: the finished-product example and a framework-agnostic vanilla TypeScript/Web Components scaffold, both passing all audits and the editable-deck output contract.
- Added export-fidelity golden comparison for PNG/JSON exports (Playwright slide screenshots) with PPTX round-trip documented as out of scope for CI.

## 3.1.0 — 2026-08-07

- Added executed capability evidence: a `deckforge-visual-evidence` worker skill, a capability-evidence and browser-evidence-report schema, a Playwright-driven evidence generator, and a runner-config wiring the reference app's e2e tests to capability claims.
- Added deterministic skill evaluation: a `deckforge-skill-evaluator` worker skill, skill-eval and trigger-eval result schemas, a shell-based evaluation runner, evaluation profiles, and keyword-based trigger routing tests.
- Added six shared contracts (`frontend-engineering`, `chart-accessibility`, `performance-budget`, `browser-evidence`, `skill-evaluation`, `provider-routing`) and upgraded the accessibility, data-and-diagrams, performance, and editor-experience built-in skills to reference them.
- Added a canonical `config/skill-registry.json` plus a manifest generator for `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, and `config/skill-routing-manifest.json`, with CI drift validation.
- Added bundle validation (frontmatter, self-contained references, `user-invocable` restrictions) and a `skill-zips/index.json` package index.
- Added a 100-slide stress fixture (`examples/stress-test-100.deck.json`) and a `--count`/`--out` CLI for its generator, wired into `npm run validate`.

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
- Added `scripts/sync_embedded_skills.py` to keep the `02-example` embedded skill copy in sync with `skills/deckforge`; the copy had drifted stale and is now regenerated, with a sync check wired into `npm run validate` and covered by a regression test.
- Added a theme-variant example deck (`examples/acme-platform-migration.deck.json`) demonstrating the `portfolio-case-study` archetype, `editorial-cream` theme, and `seminar-editorial` motion profile as an alternative reference to the default `02-example`; wired into `npm run validate` and the regression test suite.
- Added repo-level `npm run test` (Python suite + the `02-example` vitest suite, 76 tests) and `npm run test:visual` (strict layout, asset, and contrast audits) to complete the M7 exit-condition commands.
- Added `docs/EXTENDING.md` documenting how to extend catalog manifests, embedded copies, and built-in skill workflows, with the verification commands that gate each change.
- Added a deterministic content audit (`skills/deckforge/scripts/audit_deck_content.py`, wrapped at `scripts/audit_deck_content.py`) covering plan §5.5/§20.1 checks: duplicate slide titles, generic context-free titles, verbatim repeated claims, empty text content, incomplete metrics, chart captions, and density budgets. Wired into `npm run validate`, `npm run test:visual`, and the regression suite with a violations fixture; documented in `quality-gate.md`.
- Fixed the `ai-product-vision` reference deck, which bound a diagram to the text-only `kicker` slot while its required `title`/`diagram` slots were empty and mis-assigned two blocks to the single-item `title` slot; it now passes strict layout, content, motion, and schema audits and is covered by the validate gate.
- Applied the same slot-binding fix to `skills/deckforge/assets/sample-deck-project.json` (the deck agents copy from) and added a sample-deck integrity check to `scripts/validate_catalogs.py`.

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
