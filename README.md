<div align="center">

# DeckForge Web Slides Agent Skills

**Build modern, browser-native presentation experiences with AI Coding Agents.**

[English](./README.md) · [Tiếng Việt](./README.vi.md) · 简体中文](./README.zh-CN.md)

</div>

![DeckForge overview](./docs/images/hero-overview.png)

## About

DeckForge is a **multi-agent skills repository** for planning, designing, implementing, auditing, and publishing professional presentation applications that run directly in the browser.

Instead of treating a presentation as a static PowerPoint or PDF export, DeckForge guides an AI coding agent toward a complete product experience: a structured slide model, reusable templates, a modern editing toolbar, presenter controls, responsive rendering, interactions, speaker notes, embeds, and web publishing.

### Key Features

- **PPTX Export** — hybrid editable PowerPoint export with preflight checks and fidelity scoring
- **Browser-native delivery** — present, share, and embed decks directly on the web
- **Editor and presenter surfaces** — design slides and deliver them from the same product
- **Professional UI/UX** — consistent hierarchy, spacing, typography, motion, and interaction patterns
- **Reusable systems** — themes, templates, layouts, blocks, animations, and presenter controls
- **Agent-friendly contracts** — explicit instructions, references, schemas, scripts, and quality gates
- **Production-minded output** — accessibility, responsiveness, performance, security, and validation are built into the workflow

### Live Demo

Try the reference implementation: [View Demo](https://tph-kds.github.io/deckforge/demo/)

## Why DeckForge?

Most slide-generation tools stop after producing visual pages. DeckForge focuses on the application around those pages.

- **Browser-native delivery** — present, share, and embed decks directly on the web.
- **Editor and presenter surfaces** — design slides and deliver them from the same product.
- **Professional UI/UX** — consistent hierarchy, spacing, typography, motion, and interaction patterns.
- **Reusable systems** — themes, templates, layouts, blocks, animations, and presenter controls.
- **Agent-friendly contracts** — explicit instructions, references, schemas, scripts, and quality gates.
- **Production-minded output** — accessibility, responsiveness, performance, security, and validation are built into the workflow.

## What is a Skill?

A Skill is a self-contained folder that an AI coding agent can load on demand. The required `SKILL.md` file describes **when the skill should activate** and **how the agent should perform the work**.

```text
<skill-name>/
├── SKILL.md          # required: YAML frontmatter + agent instructions
├── README.md         # optional: human-facing documentation
├── references/       # optional: extended guidance loaded on demand
├── scripts/          # optional: deterministic executable helpers
└── assets/           # optional: schemas, templates, icons, and other resources
```

The `description` field in the `SKILL.md` frontmatter is the activation contract between the skill and the agent. It should clearly state the situations in which the skill is useful, without making the agent load the entire repository for unrelated tasks.

DeckForge follows this model by keeping its primary workflow concise while placing deeper design, runtime, validation, and implementation material in supporting files.

## How DeckForge works

![How DeckForge works](./docs/images/how-it-works.png)

1. **Install** — add the repository to the target coding-agent environment.
2. **Plan** — identify the audience, presentation goal, narrative, and delivery context.
3. **Compose** — select templates, layouts, themes, blocks, and content structure.
4. **Edit** — build a focused browser editor with predictable controls and state behavior.
5. **Present** — provide keyboard, touch, overview, notes, and speaker-friendly presentation modes.
6. **Publish** — release the deck as a web experience, embed, shareable route, or supported export.

## Included capabilities

| Area | Included scope |
|---|---:|
| Presentation templates | 48 |
| Visual themes | 60 |
| Layout archetypes | 36 |
| Structured block types | 33 |
| Animation patterns | 24 |
| Audience interaction patterns | 26 |
| Presenter controls | 20 |
| Export contracts | 6 |
| Delivery profiles | 4 |
| Presentation archetypes | 12 |
| Motion profiles | 8 |

Additional capabilities include:

- a `DeckProject` JSON Schema
- editor-toolbar and shortcut contracts
- presenter and speaker-view state models
- responsive layout guidance
- accessibility and reduced-motion requirements
- chart, diagram, code, media, and citation patterns
- React and TypeScript starter components
- deterministic validation and packaging scripts

## DeckForge 3 reliability update

DeckForge 3 directly addresses common failures in AI-generated presentation applications:

- **Semantic composition instead of arbitrary coordinates** — every layout defines named slots, content budgets, responsive order, safe margins, and collision rules.
- **A truthful editable-deck default** — ordinary slide-creation requests must produce a functional editor, not a presenter page with decorative toolbar icons.
- **Real tools side panel** — selected slides and blocks can be edited through layout, theme, color, typography, media, fit, alt-text, and style controls.
- **Persistent authoring** — edits update the serialized `DeckProject`, show save status, survive reload, and participate in undo/redo history.
- **Archetype-aware output** — pitching, executive, technical, academic, educational, workshop, portfolio, and data presentations receive different narrative and visual systems.
- **Purposeful motion** — motion profiles include reduced-motion fallbacks, editor preview, interruptibility, and performance rules.
- **Discoverable shortcuts** — editor and presenter experiences expose a visible help control and a `?` shortcut dialog.
- **Deterministic quality gates** — schema, layout, collision, capability-truth, build, and behavioral checks are required before completion.

Run the complete reference implementation:

```bash
cd examples/editable-deck-studio
python -m http.server 4173
```

Then open `http://localhost:4173`. The example includes a slide rail, toolbar, inspector, notes, themes, layouts, text and image insertion, persistence, undo/redo, save status, presenter mode, fullscreen, blackout, overview, and shortcut guidance.

See [`docs/DECKFORGE_3_UPGRADE.md`](./docs/DECKFORGE_3_UPGRADE.md) and [`docs/END_USER_FEATURE_MATRIX.md`](./docs/END_USER_FEATURE_MATRIX.md).

## Template showcase

![DeckForge template showcase](./docs/images/template-showcase.png)

The catalog supports common presentation structures such as hero slides, agendas, timelines, comparisons, charts, case studies, team pages, architecture diagrams, product walkthroughs, and closing slides. Templates are intended as adaptable systems rather than rigid screenshots.

## Skill catalog

| Skill | Use it for |
|---|---|
| `deckforge` | Creating, redesigning, extending, or migrating a browser-native presentation experience. |
| `deckforge-audit` | Reviewing an existing slide product for design, accessibility, performance, interaction, and architecture issues. |
| `deckforge-runtime-planner` | Planning editor, presenter, state, rendering, and publishing architecture without immediately implementing it. |
| `deckforge-publish` | Preparing web delivery, embeds, exports, release checks, and publishing behavior. |

## Installation

### Install the primary skill

```bash
npx skills@latest add tph-kds/deckforge --skill deckforge
```

### List available skills

```bash
npx skills@latest add tph-kds/deckforge --list
```

### Install every DeckForge skill

```bash
npx skills@latest add tph-kds/deckforge --skill '*'
```

### Install for several common agents

```bash
npx skills@latest add tph-kds/deckforge --skill '*' \
  --agent claude-code \
  --agent codex \
  --agent cursor \
  --agent opencode \
  --agent windsurf
```

Some agent ecosystems use the Skills CLI directly. Others load repository instructions through their own configuration or plugin-discovery mechanism.

DeckForge therefore provides:

```text
.agents/plugins/marketplace.json
.claude-plugin/plugin.json
.codex-plugin/plugin.json
```

## Supported providers and coding agents

DeckForge is designed as a provider-portable skill repository. The links below point to the official product or documentation pages for the coding environments that can consume, adapt, or execute DeckForge instructions.

| Provider or coding agent | Official resource | DeckForge integration approach |
|---|---|---|
| Anthropic — Claude Code | [Claude Code](https://www.anthropic.com/claude-code) · [Documentation](https://docs.anthropic.com/en/docs/claude-code/overview) | Skills CLI or `.claude-plugin/plugin.json` |
| OpenAI — Codex | [Codex](https://openai.com/codex/) · [Getting started](https://openai.com/codex/get-started/) | Skills CLI or `.codex-plugin/plugin.json` |
| xAI — Grok / Grok Build | [xAI API documentation](https://docs.x.ai/overview) · [Grok Build](https://docs.x.ai/build/overview) | Repository-based loading through a compatible coding harness or agent workflow |
| Google — Gemini CLI | [Gemini CLI documentation](https://developers.google.com/gemini-code-assist/docs/gemini-cli) | Skills CLI where supported, or repository-level instructions and extensions |
| Cursor | [Cursor](https://cursor.com/) · [Cursor CLI](https://cursor.com/cli) | Skills CLI, project rules, or repository-level skill loading |
| Windsurf / Devin Desktop | [Windsurf](https://windsurf.com/) · [Plugins documentation](https://docs.windsurf.com/plugins/getting-started) | Skills CLI or project instructions |
| Aider | [Aider](https://aider.chat/) · [Documentation](https://aider.chat/docs/) | Repository instructions and explicit skill references |
| OpenCode | [OpenCode](https://opencode.ai/) · [Documentation](https://opencode.ai/docs/) | Skills CLI or repository-level skill loading |
| Cline | [Cline](https://cline.bot/) · [Documentation](https://docs.cline.bot/cline-overview) | Repository instructions or compatible skill import |
| Roo Code | [Roo Code documentation](https://docs.roocode.com/) | Repository instructions, custom instructions, or compatible skill import |

Compatibility means that DeckForge's instructions, references, scripts, and assets are structured to remain useful across different coding-agent environments. It does **not** imply identical installation behavior, feature parity, official endorsement, or commercial affiliation with any provider listed above.

## Repository architecture

![DeckForge architecture](./docs/images/architecture.png)

```text
deckforge-web-slides-skills/
├── .agents/plugins/marketplace.json
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── skills/
│   ├── deckforge/
│   │   ├── SKILL.md
│   │   ├── system-prompt.md
│   │   ├── built-in-skills/
│   │   ├── references/
│   │   ├── scripts/
│   │   ├── assets/
│   │   └── starter-components/
│   ├── deckforge-audit/
│   ├── deckforge-runtime-planner/
│   └── deckforge-publish/
├── docs/
├── examples/
├── rules/
├── schemas/
├── scripts/
└── tests/
```

## Quick orientation for contributors

```bash
git clone https://github.com/tph-kds/deckforge.git
cd deckforge

npm install
npm run validate
npm run package-skills
```

Useful commands:

```bash
# Validate repository rules, skill metadata, catalogs, schemas, examples, and tests
npm run validate

# Build distributable ZIP files for individual skills
npm run package-skills

# Inspect skills available from the published repository
npx skills@latest add tph-kds/deckforge --list
```

## Contributing

Bug reports, documentation improvements, new templates, new interaction patterns, validation tooling, and additional agent integrations are welcome.

Before opening a pull request:

1. Keep each skill self-contained and loadable on demand.
2. Write a precise frontmatter `description`; it determines skill activation.
3. Put detailed material in `references/` instead of making `SKILL.md` unnecessarily large.
4. Prefer deterministic scripts for repeatable validation or transformation work.
5. Do not add generated assets without clear provenance and usage rights.
6. Update relevant catalogs, schemas, examples, and documentation together.
7. Run the complete validation suite.

```bash
npm run validate
npm run package-skills
```

For repository-specific guidance, also read:

- [`AGENTS.md`](./AGENTS.md)
- [`rules/README.md`](./rules/README.md)
- [`docs/TEMPLATE_AUTHORING.md`](./docs/TEMPLATE_AUTHORING.md)
- [`docs/EXTENDING.md`](./docs/EXTENDING.md)
- [`docs/QUALITY_MODEL.md`](./docs/QUALITY_MODEL.md)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Design principles

DeckForge contributions should preserve these principles:

- **Clarity before decoration**
- **Narrative before animation**
- **Systems before one-off styling**
- **Progressive disclosure before crowded toolbars**
- **Purposeful motion before continuous motion**
- **Accessible defaults before visual novelty**
- **Inspectable state before hidden behavior**
- **Real product behavior before static mockups**

## Project documents

| Document | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Entry point and routing guidance for coding agents. |
| [`INSTALL_WITH_SKILLS_CLI.md`](./INSTALL_WITH_SKILLS_CLI.md) | Installation and discovery instructions. |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Recommended product and runtime architecture. |
| [`docs/PRODUCT_DIRECTION.md`](./docs/PRODUCT_DIRECTION.md) | Product scope, boundaries, and long-term direction. |
| [`docs/RESEARCH_FOUNDATIONS.md`](./docs/RESEARCH_FOUNDATIONS.md) | Research and repository patterns that informed the design. |
| [`docs/FEATURE_BACKLOG.md`](./docs/FEATURE_BACKLOG.md) | Prioritized product and skill improvements. |
| [`docs/QUALITY_MODEL.md`](./docs/QUALITY_MODEL.md) | Quality criteria for generated presentation products. |
| [`docs/TEMPLATE_AUTHORING.md`](./docs/TEMPLATE_AUTHORING.md) | Guidance for adding and maintaining templates. |
| [`docs/EXTENDING.md`](./docs/EXTENDING.md) | How to extend catalogs, embedded copies, and built-in skill workflows. |
| [`docs/DECKFORGE_3_UPGRADE.md`](./docs/DECKFORGE_3_UPGRADE.md) | DeckForge 3 acceptance contracts, semantic layouts, editor truth, and validation. |
| [`docs/END_USER_FEATURE_MATRIX.md`](./docs/END_USER_FEATURE_MATRIX.md) | Required end-user editor and presenter capabilities. |
| [`docs/GENERATED_OUTPUT_FAILURE_ANALYSIS.md`](./docs/GENERATED_OUTPUT_FAILURE_ANALYSIS.md) | Failure patterns and the safeguards that prevent them. |

## Acknowledgments

DeckForge is an independent open-source project. We gratefully acknowledge the platforms, standards, and open-source communities whose work helps make portable AI-assisted software development and browser-native presentations possible.

### AI coding platforms and providers

- [Anthropic Claude Code](https://www.anthropic.com/claude-code) for advancing agentic coding workflows and the practical use of on-demand skills.
- [OpenAI Codex](https://openai.com/codex/) for agentic software-engineering workflows across CLI, IDE, and cloud environments.
- [xAI Grok and Grok Build](https://docs.x.ai/build/overview) for extensible coding-agent and API workflows.
- [Google Gemini CLI](https://developers.google.com/gemini-code-assist/docs/gemini-cli) for an open-source terminal agent and extension ecosystem.
- [Cursor](https://cursor.com/), [Windsurf](https://windsurf.com/), [Aider](https://aider.chat/), [OpenCode](https://opencode.ai/), [Cline](https://cline.bot/), and [Roo Code](https://docs.roocode.com/) for expanding the range of environments in which repository-guided coding agents can operate.

### Agent Skills standards and tooling

- [Agent Skills specification](https://agentskills.io/specification) for the portable `SKILL.md` format and activation contract.
- [Anthropic Agent Skills reference repository](https://github.com/anthropics/skills) for official examples and authoring patterns.
- [Vercel Labs Skills CLI](https://github.com/vercel-labs/skills) for open skill discovery, installation, and multi-agent distribution workflows.

### Web presentation and editor foundations

DeckForge's product direction is informed by established open-source projects in browser-native presentation, content editing, and canvas interaction:

- [reveal.js](https://revealjs.com/) — HTML presentation runtime, navigation, overview, speaker notes, and plugin patterns.
- [Slidev](https://sli.dev/) — developer-focused web slides, theme systems, interactive components, and presenter tooling.
- [Marp](https://marp.app/) — Markdown-first presentation authoring and multi-format publishing.
- [Spectacle](https://github.com/FormidableLabs/spectacle) — component-based presentations for React.
- [Tiptap](https://tiptap.dev/) — extensible headless rich-text editing patterns.
- [tldraw](https://tldraw.dev/) — canvas interaction, selection, command, and extensibility patterns for React applications.

These acknowledgments identify relevant ecosystems and technical foundations; they do not indicate sponsorship, partnership, endorsement, or ownership. All product names, logos, and trademarks remain the property of their respective owners.

## Project links

| Resource | Link |
|---|---|
| GitHub repository | [tph-kds/deckforge](https://github.com/tph-kds/deckforge) |
| Bug reports and feature requests | [GitHub Issues](https://github.com/tph-kds/deckforge/issues) |
| Skill discovery | `npx skills@latest add tph-kds/deckforge --list` |

## License

[MIT License](./LICENSE) © [tph-kds](https://github.com/tph-kds) All rights reserved.
