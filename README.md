# DeckForge Web Slides Agent Skills

> Build modern, browser-native presentation experiences with AI Coding Agents.

DeckForge is a **multi-agent skill repository** for designing and engineering presentation products that run directly on the web instead of stopping at static PDF export. It helps AI coding agents create **professional slide WebUI**, **editing toolbars**, **presenter mode**, **template systems**, **interactive components**, and **publishing flows** for real presentation webapps.

**Languages:** [English](./README.md) · [Tiếng Việt](./README.vi.md) · [简体中文](./README.zh-CN.md)

---

## Preview

![DeckForge hero](./docs/images/hero-overview.png)

---

## Why DeckForge?

Traditional slide generation workflows usually end at PowerPoint or PDF. DeckForge focuses on a stronger target:

- **Web-native slides** that run directly in the browser.
- **Editor + presenter** experiences in the same product.
- **Modern UI/UX** with a toolbar, block editing, themes, layouts, and responsive rendering.
- **AI-agent friendly structure** so Claude Code, Codex, Grok, Gemini, Cursor, Windsurf, Aider, OpenCode, Cline, and Roo can all work from a clear skill contract.
- **Production-minded quality gates** for accessibility, responsiveness, interaction quality, and performance.

---

## How it works

![How DeckForge works](./docs/images/how-it-works.png)

DeckForge guides the agent through six stages:

1. **Install** the skill repository.
2. **Plan** the audience, objective, and story arc.
3. **Compose** a deck structure from templates, layouts, and themes.
4. **Edit** slides inside a browser-style editing surface.
5. **Present** with a speaker-friendly runtime.
6. **Publish** for web, embed, or export targets.

---

## Architecture

![DeckForge architecture](./docs/images/architecture.png)

The repository now includes a `.agents/plugins/marketplace.json` entry to support broader multi-agent discovery patterns, in addition to `.claude-plugin` and `.codex-plugin`.

### Repository highlights

- Primary skill: `skills/deckforge`
- Optional skills:
  - `skills/deckforge-audit`
  - `skills/deckforge-runtime-planner`
  - `skills/deckforge-publish`
- Discovery and integration:
  - `.agents/plugins/marketplace.json`
  - `.claude-plugin/plugin.json`
  - `.codex-plugin/plugin.json`
- Reference artifacts:
  - `schemas/`
  - `rules/`
  - `docs/`
  - `examples/`

---

## Template showcase

![Template showcase](./docs/images/template-showcase.png)

DeckForge ships with a rich content system oriented around web presentation behavior, not just visual export.

### Included scope

- 48 reusable templates
- 60 visual themes
- 36 layout archetypes
- 33 block types
- 24 animation patterns
- 26 audience interaction patterns
- 20 presenter controls
- JSON schema and validation scripts
- reference runtime scaffolds for React/TypeScript implementations

---

## Install

### Quick install

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

### List available skills

```bash
npx skills@latest add tph-kds/deckforge --list
```

### Install all DeckForge skills for common agents

```bash
npx skills@latest add tph-kds/deckforge --skill '*' --agent claude-code --agent codex --agent cursor --agent opencode
```

### Supported agents

- Claude Code
- Codex
- Grok / xAI compatible coding setups
- Gemini CLI compatible setups
- Cursor
- Windsurf
- Aider
- OpenCode
- Cline / Roo

> Note: some agent ecosystems use the official Skills CLI directly, while others consume repository-based plugin discovery through `.agents/plugins/marketplace.json` or their own local integration flow.

---

## Recommended use cases

Use DeckForge when you want an AI coding agent to build:

- a web-based slide editor
- a presenter mode with keyboard shortcuts and speaker notes
- responsive slide decks for live demo or embedded sharing
- polished, modern presentation templates
- interactive charts, code blocks, and media-rich slides
- browser-native alternatives to PDF-only presentation delivery

---

## Validation

```bash
npm run validate
npm run package-skills
```

---

## Key documents

- [`AGENTS.md`](./AGENTS.md)
- [`INSTALL_WITH_SKILLS_CLI.md`](./INSTALL_WITH_SKILLS_CLI.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md)
- [`docs/RESEARCH_FOUNDATIONS.md`](./docs/RESEARCH_FOUNDATIONS.md)
- [`docs/FEATURE_BACKLOG.md`](./docs/FEATURE_BACKLOG.md)

---

## License

MIT
