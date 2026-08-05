# DeckForge Agent Entry Point

This repository contains Agent Skills and reference scaffolds for reliable **editable, browser-native slide applications**.

## Read order

1. `rules/README.md`
2. `rules/repository-boundaries.md`
3. `rules/design-quality.md`
4. `rules/security-rules.md`
5. the relevant `skills/*/SKILL.md`
6. `skills/deckforge/references/delivery-acceptance-contract.md` for implementation work

## Default routing

- Use `skills/deckforge/SKILL.md` for creating, redesigning, extending, or migrating a presentation product.
- Use `skills/deckforge-audit/SKILL.md` for review-only work.
- Use `skills/deckforge-runtime-planner/SKILL.md` for architecture planning without implementation.
- Use `skills/deckforge-publish/SKILL.md` for publishing, embedding, and delivery.

For ordinary end-user requests to create slides, select the `editable-deck` profile unless the user explicitly asks for a presenter-only artifact.

## Non-negotiable implementation rules

- Use semantic layout slots rather than arbitrary coordinates by default.
- Do not claim an editor exists unless controls mutate DeckProject state and changes persist.
- Keep the editor and presenter as separate surfaces.
- Provide visible shortcut guidance.
- Run schema, layout, output-contract, build, and behavioral checks before completion.

## Plugin discovery

- `.agents/plugins/marketplace.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

## Validation

```bash
npm run validate
npm run package-skills
```

Target-project checks:

```bash
python scripts/audits/audit_deck_layout.py <deck.json> --strict
python scripts/audits/validate_output_contract.py <project-directory> --profile editable-deck
```
