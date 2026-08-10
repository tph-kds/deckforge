# DeckForge Quick Start

Get from zero to a working browser-native presentation in 5 minutes.

## Install

```bash
# Add the primary skill (recommended starting point)
npx skills@latest add tph-kds/deckforge --skill deckforge

# Or install everything
npx skills@latest add tph-kds/deckforge --skill '*'
```

## Two ways to invoke a skill

Every skill can be invoked two ways:

| Style | Example | When to use |
|---|---|---|
| **Slash command** | `/deckforge create a 10-slide pitch deck` | You know exactly which skill you want |
| **Natural language** | `Create a 10-slide pitch deck about our SaaS platform` | Let the agent auto-detect the right skill |

Both produce the same result. Slash commands are explicit; natural language is convenient.

## Create your first deck

**Slash command:**

```
/deckforge Create a 10-slide product launch deck for a SaaS analytics platform.
Use a dark theme with blue accents. Include speaker notes on every slide.
```

**Natural language:**

```
Create a 10-slide product launch deck for a SaaS analytics platform.
Use a dark theme with blue accents. Include speaker notes on every slide.
```

The agent loads the `deckforge` skill, selects templates and layouts, and builds a complete `DeckProject` with an editor, presenter, and export capability.

## Common workflows

### Build a new presentation

```
/deckforge Create an editable web presentation about climate tech innovations.
Include charts, diagrams, and a call-to-action closing slide.
```

Or without the slash:

```
Create an editable web presentation about climate tech innovations.
Include charts, diagrams, and a call-to-action closing slide.
```

Agent activates: `deckforge`

### Redesign an existing deck

```
/deckforge Redesign this presentation — the layout feels cluttered
and the typography is inconsistent.
```

Agent loads your `deck.json`, audits it, and rebuilds with consistent themes and spacing.

### Add PPTX export

```
/deckforge-export Add PowerPoint download to this deck.
Make sure diagrams survive as visuals, not text summaries.
```

Or:

```
Add PowerPoint download to this deck. Make sure diagrams survive
as visuals, not text summaries.
```

Agent activates: `deckforge-export`

### Audit for quality

```
/deckforge-audit Review this presentation for accessibility,
performance, and design consistency.
```

Agent activates: `deckforge-audit`

### Publish to the web

```
/deckforge-publish Deploy this deck as a standalone web page
with a public URL and embed support.
```

Agent activates: `deckforge-publish`

### Plan architecture (without building)

```
/deckforge-runtime-planner Plan the state management and rendering
architecture for a collaborative deck editor.
```

Agent activates: `deckforge-runtime-planner`

## Quick reference

| Slash command | What it does |
|---|---|
| `/deckforge` | Create, redesign, extend, or migrate a presentation |
| `/deckforge-audit` | Review existing slides for quality issues |
| `/deckforge-export` | Add or fix PPTX export with fidelity checks |
| `/deckforge-runtime-planner` | Plan architecture without implementing |
| `/deckforge-publish` | Web delivery, embeds, and release |

## What you get

A complete project with:

- **`deck.json`** — the structured slide model (themes, layouts, blocks, motion, metadata)
- **`src/`** — React app with editor toolbar, slide rail, inspector, presenter view
- **PPTX export** — hybrid editable PowerPoint with fidelity scoring and preflight checks
- **Validation** — schema, layout, collision, and quality gates run before completion

## Run it

```bash
cd your-project
npm install
npm run dev
```

Open `http://localhost:5173` — you have a full slide editor with undo/redo, themes, presenter mode, and export.

## Validate your project

```bash
npm run validate          # full quality gate
npm run package-skills     # build skill ZIP bundles
```

## Learn more

- [`README.md`](./README.md) — full project overview
- [`skills/README.md`](./skills/README.md) — skill catalog
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — recommended architecture
- [`docs/QUALITY_MODEL.md`](./docs/QUALITY_MODEL.md) — quality criteria
- [`docs/TEMPLATE_AUTHORING.md`](./docs/TEMPLATE_AUTHORING.md) — add templates
