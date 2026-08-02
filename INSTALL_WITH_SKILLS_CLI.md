# Install with the Skills CLI

## Quick install

```bash
npx skills@latest add tph-kds/deckforge --list
npx skills@latest add tph-kds/deckforge --skill deckforge
```

## Install all DeckForge skills

```bash
npx skills@latest add tph-kds/deckforge --skill '*'
```

## Install for multiple common agents

```bash
npx skills@latest add tph-kds/deckforge --skill '*' \
  --agent claude-code \
  --agent codex \
  --agent cursor \
  --agent opencode \
  --agent windsurf
```

Some ecosystems use repository metadata instead of the same CLI flags. DeckForge also provides:

- `.agents/plugins/marketplace.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

## Verify a generated editable deck

```bash
python scripts/validate_deck_project.py <deck.json>
python scripts/audit_deck_layout.py <deck.json> --strict
python scripts/validate_output_contract.py <project-directory> --profile editable-deck
```

## Validate before publishing the skills repository

```bash
npm run validate
npm run package-skills
```
