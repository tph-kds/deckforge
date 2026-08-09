# Extending DeckForge

DeckForge is a manifest-driven system: every theme, template, layout, block, animation, interaction, presenter control, export target, delivery profile, presentation archetype, and motion profile is a governed catalog entry. This document explains how to add or change entries, which validation runs over them, and how a DeckProject binds to them.

## Where catalogs live

All governed manifests live in `skills/deckforge/assets/`. The same files must appear unchanged in the embedded copies at `examples/02-example/.agents/skills/deckforge/assets/` (see [Keeping embedded copies in sync](#keeping-embedded-copies-in-sync)).

| Catalog | File | Key fields |
| --- | --- | --- |
| Theme | `theme-manifest.json` | `id`, `tokens`, `typography`, `mood`, `layoutBias`, `density`, `shapeLanguage`, `motionStyle`, `chartPalette`, `recommendedFor`, `antiPatterns` |
| Template | `template-manifest.json` | `id`, audience/goal, slide plan, evidence expectations, quality risks |
| Layout | `layout-manifest.json` | `id`, `density`, `recommendedBlocks`, `composition.slots[]`, `whitespaceTarget`, `responsiveOrder`, `collisionPolicy` |
| Block | `block-manifest.json` | `type`, `category`, `requiredFields`, `accessibility`, `security`, `editorCapabilities` |
| Motion profile | `motion-profile-manifest.json` | `id`, `slideTransition`, `objectBuilds`, `durationRangeMs`, `maxConcurrentMotions`, `easing`, `avoid`, `reducedMotion` |
| Presentation archetype | `presentation-archetype-manifest.json` | `id`, communication situation, typical structure |
| Delivery profile | `delivery-profile-manifest.json` | `id`, surfaces, acceptance contract |

## Adding a catalog entry

1. Add one object to the relevant manifest in `skills/deckforge/assets/`.
2. Use canonical IDs already present in other catalogs. Never invent a layout or block type: reference `layout-manifest.json` and `block-manifest.json` only.
3. Keep every referenced ID resolvable — the catalog validator rejects dangling references.
4. For a theme, document its `antiPatterns` as blockers and keep `tokens` token-based (no per-block duplicates).
5. For a layout, define real `composition.slots[]` with grid positions, allowed block types, content budgets, and a `whitespaceTarget` so the layout audit can score occupancy.
6. Run `python scripts/validate/validate_catalogs.py` and the full suite.

## Verification commands

```bash
npm run validate        # full repo gate (rules, catalogs, decks, output contract, embedded sync, unit tests)
python scripts/validate/validate_catalogs.py                  # catalog + semantic layout contract integrity
python scripts/validate/validate_deck_project.py <deck.json>  # schema 2.1 + profile contract
python scripts/audits/audit_deck_layout.py <deck.json> --strict
python scripts/audits/audit_deck_content.py <deck.json>     # titles, claims, density, metrics, citations
python skills/deckforge/scripts/audit_deck_motion.py <deck.json>
npm run test            # Python suite + the 02-example vitest suite
npm run test:visual     # deterministic strict-layout, asset, and contrast audits
npm run package-skills  # re-zip the skills for distribution
```

A deck binds a catalog by ID in its `presentation` and `theme`/`meta` fields. Example references to copy from:

- `examples/02-example/deck.json` (7 slides, `technical-precise` motion)
- `examples/acme-platform-migration.deck.json` (theme-variant: `editorial-cream` theme, `seminar-editorial` motion)
- `examples/stress-test-30.deck.json` (30 slides, exercises grid/layout/motion at scale)

## Keeping embedded copies in sync

`examples/02-example/.agents/skills/deckforge/` must mirror `skills/deckforge/` exactly. Agents working inside the example read that copy, so stale catalogs there cause drift between what the canonical skill guarantees and what the example demonstrates.

```bash
python scripts/sync/sync_embedded_skills.py   # copies canonical -> embedded, exits non-zero on residual drift
```

The sync is enforced in `npm run validate` and covered by `test_embedded_skill_copy_in_sync` in `tests/test_examples.py`. `examples/01-example` is intentionally pinned to an older release via its `skills-lock.json` and is not part of this sync.

## Adding a built-in skill workflow

Built-in skills live in `skills/deckforge/built-in-skills/*.md` and give agents focused sub-workflows (for example `template-and-theme.md`, `motion-and-transitions.md`, `quality-gate.md`).

1. Write the workflow as a Markdown reference that consumes the governed manifests by ID.
2. Reference it from `SKILL.md` and the relevant `system-prompt.md` section where a production agent would discover it.
3. Keep non-negotiables (default `editable-deck` profile, docked presenter chrome, reduced-motion respect, semantic slots) intact.
4. Run `npm run validate` and re-sync the embedded copy.

## Validation contract

- Catalogs are validated by `scripts/validate/validate_catalogs.py` (integrity of every manifest plus the semantic layout contract).
- Decks are validated by `scripts/validate/validate_deck_project.py` against `deck-project.schema.json` (schema 2.1).
- Layouts are scored by `scripts/audits/audit_deck_layout.py --strict` (no collisions, occupancy within `whitespaceTarget`, content budgets respected).
- Content is audited by `scripts/audits/audit_deck_content.py` (duplicate/generic titles, repeated claims, empty content, density budgets, incomplete metrics, captionless charts, and claims without a backing source reference). Every `metric` and `citation`/`citations` block must list at least one `sourceIds` entry that resolves to a deck-level `sources[]` id; a missing list or an unknown id is an error. A source whose `url` lacks an `http(s)://` scheme produces a warning (offline format check only; live reachability is a CI-only concern).
- Motion is audited by `skills/deckforge/scripts/audit_deck_motion.py` (transition + default builds required unless `none-accessible`, reduced motion respected).
- The output contract is checked by `skills/deckforge/scripts/validate_output_contract.py --profile editable-deck` (editor shell, persistence, shortcut help, capability truth).
