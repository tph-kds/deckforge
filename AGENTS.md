# DeckForge Agent Entry Point

This repository contains Agent Skills and reference scaffolds for **web-native slide applications**.

## Read order

1. `rules/README.md`
2. `rules/repository-boundaries.md`
3. `rules/design-quality.md`
4. `rules/security-rules.md`
5. the relevant `skills/*/SKILL.md`

## Default skill routing

- Use `skills/deckforge/SKILL.md` for creating, redesigning, extending, or migrating a web presentation experience.
- Use `skills/deckforge-audit/SKILL.md` for review-only work.
- Use `skills/deckforge-runtime-planner/SKILL.md` for architecture planning without implementation.
- Use `skills/deckforge-publish/SKILL.md` for export, publishing, and delivery.

## Plugin discovery

This repository supports several discovery conventions:

- `.agents/plugins/marketplace.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

These files make the repository easier to integrate with Claude Code, Codex, Cursor, OpenCode, Windsurf, Aider, and similar coding agents.

## Validation

```bash
python scripts/check_rules.py
python scripts/lint_skills.py
python scripts/validate_catalogs.py
python scripts/validate_deck_project.py examples/ai-product-vision.deck.json
python -m unittest discover -s tests -p 'test_*.py'
```
