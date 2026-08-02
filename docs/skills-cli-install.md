# Skills CLI Installation

DeckForge supports direct Skills CLI installation and repository-based plugin discovery.

## Direct installation

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

Install all skills:

```bash
npx skills@latest add tph-kds/deckforge --skill '*'
```

Install for several common agents:

```bash
npx skills@latest add tph-kds/deckforge --skill '*' --agent claude-code --agent codex --agent cursor --agent opencode
```

## Local repository testing

```bash
npx skills@latest add /absolute/path/to/deckforge-web-slides-skills --skill deckforge
```

After generation, validate the selected delivery profile rather than trusting UI labels:

```bash
python scripts/audit_deck_layout.py <deck.json> --strict
python scripts/validate_output_contract.py <project-directory> --profile editable-deck
```
