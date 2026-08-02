# Repository Research Matrix

This project was redesigned after reviewing Agent Skills repositories and mature web-presentation/editor projects. The goal was to adopt durable architectural patterns rather than copy surface syntax.

| Repository | Relevant pattern | Applied in DeckForge | Deliberately not copied |
|---|---|---|---|
| [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | Explicit environment routing, failure modes, output contracts, self-checks | Blocking rules, validation scripts, clear skill/runtime boundary, honest reporting of checks not run | Topic-specific research workflow and provider assumptions |
| [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) | Modular skill collection, parameterized visual direction, reproducible intermediate artifacts | Separate catalogs, stable IDs, template/theme dimensions, standalone audit/publish/runtime skills | Image-first slide generation as the primary output |
| [JimLiu/baoyu-design](https://github.com/JimLiu/baoyu-design) | Thin orchestrator, deep system prompt, built-in workflows, harness references, starter components | Main `deckforge` skill, `system-prompt.md`, on-demand workflow files, reference scaffolds | A single forced frontend stack or a monolithic prompt loaded for every task |
| [Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills) | Staged pipeline, checkpoints, integrity gates, state and handoff contracts | Story→design→implementation→verification flow, evidence/source rules, blocking quality gate | Academic-only terminology and workflow phases irrelevant to product decks |
| [slidevjs/slidev](https://github.com/slidevjs/slidev) | Web-native slides, presenter mode, code/diagram support, builds, SPA delivery | Presenter behavior, deep links, speaker notes, deterministic builds, technical-demo blocks | Markdown as the only authoring model |
| [hakimel/reveal.js](https://github.com/hakimel/reveal.js) | Mature browser presentation navigation, overview, notes, plugins, horizontal/vertical flow | Keyboard/touch controls, overview, speaker view, presenter-control catalog | DOM-first content model and unrestricted plugin execution |
| [FormidableLabs/spectacle](https://github.com/FormidableLabs/spectacle) | React composition and live-code presentation patterns | React starter references, code/demo block and interaction contracts | JSX as persisted deck data |
| [tldraw/tldraw](https://github.com/tldraw/tldraw) | Direct manipulation, canvas state, selection, commands, extensible shapes | Ephemeral selection model, command history, snapping/grouping guidance | Infinite-canvas behavior as the default presentation metaphor |
| [prevwong/craft.js](https://github.com/prevwong/craft.js) | Extensible React editor nodes and drag/drop composition | Semantic block registry and separation of renderer/editor overlays | Arbitrary component trees without a stable presentation schema |
| [ueberdosis/tiptap](https://github.com/ueberdosis/tiptap) | Schema-controlled rich text, commands, extensions, collaboration readiness | Rich-text boundary and recommendation for production editing | Treating the rich-text document as the entire slide model |

## Synthesis

The central architectural choice is a **thin public orchestrator plus deep on-demand modules**. DeckProject remains structured JSON so the same content can power editor, presenter, published viewer, embed, migrations, citations, analytics, and export adapters. Visual themes are separated from narrative templates, and editor state is separated from presentation state.

The project does not attempt to reimplement a production runtime inside the skill repository. Instead, it gives coding agents strict product, UI/UX, data, accessibility, security, performance, and verification contracts, plus reference components they can adapt to an existing or greenfield application.
