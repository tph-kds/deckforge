# Skills CLI Install Notes

DeckForge supports two common integration styles:

1. **Direct Skills CLI installation**
2. **Repository-based plugin discovery** via `.agents/plugins/marketplace.json`

## Direct installation

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

Install all DeckForge skills:

```bash
npx skills@latest add tph-kds/deckforge --skill '*'
```

## Recommended multi-agent setup

```bash
npx skills@latest add tph-kds/deckforge --skill '*' --agent claude-code --agent codex --agent cursor --agent opencode
```
