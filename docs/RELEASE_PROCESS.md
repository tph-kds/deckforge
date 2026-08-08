# Release Process

Releasing a new version of DeckForge means tagging the `deckforge-agent-skills` repository after every gate passes. No tag is cut without evaluator results.

## Release checklist

Run every check in order. All must exit 0.

```bash
npm run validate
npm run schema:check
npm run skills:check
npm run package-skills
npm run test:unit
```

Then verify the reference application end to end:

```bash
cd examples/02-example
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Individually:

- **Schema checks** — `npm run validate` runs rule, lint, repository-asset, catalog, deck-project, layout, content, motion, capability-receipt, and output-contract validators against every reference fixture.
- **Layout audit** — every deck fixture must pass `python scripts/audits/audit_deck_layout.py <deck.json> --strict` (semantic slots, safe margins, no collisions).
- **Output-contract validation** — the reference app must satisfy `python scripts/audits/validate_output_contract.py examples/02-example --profile editable-deck`.
- **Production build** — `npm run build` in `examples/02-example` must succeed.
- **Behavioral/e2e checks** — `npm run test:e2e` (Playwright) must pass, including keyboard-complete, reduced-motion, and scrollbar behavior; the capability receipt must be regenerated and re-validated.
- **Bundle validation** — `npm run package-skills` rebuilds `skill-zips/` and validates every bundle's frontmatter, self-contained references, and `user-invocable` restrictions.
- **Evaluator results (mandatory)** — every core eval case must score 100 under the `current` condition:

```bash
python scripts/validate/check_release_gate.py --workdir examples/02-example
```

The gate exits 0 only when all cases score 100. CI enforces this in the `release-gate` job.

## Version-bump policy

- **Major (`x.0.0`)** — a breaking change to a contract or schema: renamed or removed fields in `schemas/`, changed skill output contracts, changed CLI flags, or removed a previously documented capability.
- **Minor (`x.y.0`)** — a new capability that stays backward compatible: a new skill, layout, profile, or audit that existing decks and consumers keep passing against unchanged contracts.
- **Patch (`x.y.z`)** — fixes and documentation: bug fixes, fixture corrections, doc updates, and internal tooling that changes no contract or schema.

## Changelog requirement

Every release commit must update `CHANGELOG.md` in the **same commit** as the change it describes. Add the new version heading at the top with the release date and one line per user-visible change. A release without a matching changelog entry is blocked.

## Tag rule

Evaluator results are **mandatory before tag**: the release must include the output of `check_release_gate.py` (all core cases at 100 under `current`) recorded in the release notes or PR, and CI's `release-gate` job must be green. If any case scores below 100, the release is blocked until the failing case is fixed or the gate is updated with an explicitly documented exception.
