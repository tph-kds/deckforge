# DeckForge Design and Engineering Standard

You are building a presentation product, not decorating rectangles. The result must combine editorial judgment, slide design, interaction design, frontend engineering, accessibility, and delivery safety.

## Product model

A DeckForge experience has four distinct contexts:

1. **Authoring** — outline, slide rail, canvas, direct manipulation, toolbar, insert menu, style controls, notes, comments, undo/redo, autosave.
2. **Presenting** — fullscreen stage, builds, navigation, overview, timer, speaker notes, next slide, remote-friendly controls.
3. **Audience viewing** — responsive published page, deep links, media, charts, optional interaction, citations, follow-up action.
4. **Embedding** — constrained iframe with origin policy, sandbox, sizing, and communication contract.

Do not merge these contexts into one cluttered UI.

## Story before layout

Determine audience, objective, decision, evidence, constraints, time, and tone. Write the narrative thesis in one sentence. Build a slide map where every slide has a job. Remove slides that repeat the same job.

Prefer claim-led titles such as "Onboarding time fell after retrieval caching" over category labels such as "Results". Use one main idea per slide. Complex technical slides may contain multiple objects, but the reading path must remain obvious.

## Visual system

Choose a template for narrative structure and a theme for visual expression. Establish:

- 8px or project-native spacing grid
- explicit safe margins
- stable type scale and line lengths
- one dominant focal point per slide
- limited accent colors with semantic meaning
- consistent chart encodings and diagram grammar
- purposeful imagery with provenance
- responsive ordering for narrow viewports

## Anti-AI-slop rules

Never use these as defaults:

- generic gradient hero plus three cards
- translucent glass panels on every slide
- decorative glowing blobs, stars, grids, or particles unrelated to content
- a random icon for every bullet
- identical composition across all slides
- excessive rounded rectangles
- dark neon styling merely because the topic is AI
- generic titles: Overview, Benefits, Our Solution, Key Features, Conclusion
- centered body copy or tiny labels
- fake dashboards, fake numbers, or invented product screenshots

A visual effect must reinforce hierarchy, domain, sequence, comparison, or emotion. If it does none of those, remove it.

## Content fit

Never solve overflow by clipping, hiding, or shrinking below readable presentation size. Instead:

- split the slide
- shorten or rewrite
- convert prose into a diagram or table
- move detail into speaker notes or an appendix
- change layout

## Editor architecture

Treat deck content as serializable data. Keep selection, hover, panel state, zoom, and drag state ephemeral. Use stable IDs and command-based history. Core commands should be testable without the DOM.

Canvas interactions must include visible selection, keyboard nudging, resize handles, snap guides, alignment, grouping, locking, duplicate, delete, undo/redo, and contextual properties. Use a command palette for discoverability.

Rich text should be schema-controlled. Do not rely on ad-hoc `contenteditable` for production history, paste normalization, and collaborative editing.

## Presenter architecture

Navigation must handle build steps before moving slides. Arriving backward should show the completed state unless the product deliberately supports reverse builds. Presenter mode hides editing controls and remains usable by keyboard, touch, and assistive technology.

Support reduced motion by replacing spatial transitions with immediate or fade-based state changes. Fullscreen must not steal browser search shortcuts. Deep links should resolve deterministically.

## Motion

Use motion to reveal sequence, causality, hierarchy, comparison, or state change. Limit simultaneous motion. Keep durations consistent. Avoid bouncing and elastic easing in executive, research, financial, compliance, and healthcare contexts unless there is a clear reason.

## Data and diagrams

Every chart needs a question, takeaway, units, source, and accessible summary. Annotate the important point directly. Avoid 3D charts, unlabeled axes, rainbow palettes, and decorative gauges.

Diagrams need named nodes, directional edges, boundaries, legends when necessary, and a clear reading order. Do not use Mermaid as an excuse for a visually poor result; style and simplify it or build a dedicated component.

## Accessibility

- Respect WCAG contrast and visible focus.
- Provide alt text or a concise equivalent for every non-text object.
- Provide data-table or textual summaries for charts.
- Maintain keyboard access to editor and presenter controls.
- Preserve logical reading order on responsive layouts.
- Respect `prefers-reduced-motion`.
- Do not encode meaning by color alone.

## Security

Use structured block data. Sanitize imported rich text and SVG. Validate asset URLs and content types. External embeds require allow-lists, sandbox policy, loading behavior, and a documented message protocol. Never expose secrets in deck JSON.

## Performance

Lazy-load non-current heavy media, prefetch adjacent slides, avoid re-rendering the whole deck for a selection change, virtualize long slide rails, and keep transforms on compositor-friendly properties. Measure before optimizing.

## Verification loop

1. Validate schema and catalogs.
2. Run the target app.
3. Review each slide at the authored canvas size.
4. Review at a narrow viewport.
5. Test keyboard, touch, fullscreen, deep links, overview, notes, and build sequence.
6. Run accessibility checks.
7. Run the anti-slop and quality rubric.
8. Fix all blocking failures.
9. Report implemented behavior, tests, remaining tradeoffs, and exact file paths.
