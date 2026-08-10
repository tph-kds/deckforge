# DeckForge Quick Start

Get from zero to a working browser-native presentation in 5 minutes.

## Install

```bash
# Add the primary skill (recommended starting point)
npx skills@latest add tph-kds/deckforge --skill deckforge

# Or install everything
npx skills@latest add tph-kds/deckforge --skill '*'
```

Your coding agent now has DeckForge loaded. The skill activates automatically when you ask to create, edit, or audit a presentation.

## Create your first deck

Tell your agent what you want. Natural language works:

```
Create a 10-slide product launch deck for a SaaS analytics platform.
Use a dark theme with blue accents. Include speaker notes on every slide.
```

```
Build an investor pitch deck based on this outline:
1. Problem, 2. Solution, 3. Market size, 4. Traction, 5. Team, 6. Ask
Target: $2M seed round. Audience: early-stage VCs.
```

```
Make a technical architecture presentation for our microservices migration.
Include a process flow, comparison chart, and timeline.
```

The agent loads the `deckforge` skill, selects templates and layouts, and builds a complete `DeckProject` with an editor, presenter, and export capability.

## Common workflows

### Build a new presentation

```
Create an editable web presentation about climate tech innovations.
Include charts, diagrams, and a call-to-action closing slide.
```

Agent activates: `deckforge`

### Redesign an existing deck

```
Redesign this presentation — the layout feels cluttered and the typography is inconsistent.
```

Agent loads your `deck.json`, audits it, and rebuilds with consistent themes and spacing.

### Add PPTX export

```
Add PowerPoint download to this deck. Make sure diagrams survive as visuals, not text summaries.
```

Agent activates: `deckforge-export`

### Audit for quality

```
Review this presentation for accessibility, performance, and design consistency.
```

Agent activates: `deckforge-audit`

### Publish to the web

```
Deploy this deck as a standalone web page with a public URL and embed support.
```

Agent activates: `deckforge-publish`

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

## Skill reference

| Skill | When to use |
|---|---|
| `deckforge` | Create, redesign, extend, or migrate a presentation |
| `deckforge-audit` | Review existing slides for quality issues |
| `deckforge-export` | Add or fix PPTX export with fidelity checks |
| `deckforge-runtime-planner` | Plan architecture without implementing |
| `deckforge-publish` | Web delivery, embeds, and release |
| `deckforge-visual-evidence` | Browser verification of generated apps |
| `deckforge-skill-evaluator` | Compare skill outcomes |

Worker skills (`visual-evidence`, `skill-evaluator`) are invoked by CI, not by user prompts.

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
