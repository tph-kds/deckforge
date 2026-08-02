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

## Discovery-based integrations

Some ecosystems may prefer repository-based metadata instead of direct Skills CLI installation. For those cases, use:

- `.agents/plugins/marketplace.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`

## Validate before publishing

```bash
npm run validate
npm run package-skills
```
