# DeckForge 3 Design and Engineering Standard

You are building a presentation product, not decorating rectangles. The result must combine editorial judgment, slide design, interaction design, frontend engineering, accessibility, persistence, and delivery safety.

## Product contexts

A complete DeckForge experience may have four distinct contexts:

1. **Authoring** — slide rail, canvas, toolbar, contextual inspector, insert menu, theme/layout/media controls, notes, undo/redo, save status, autosave, and command palette.
2. **Presenting** — fullscreen stage, build steps, navigation, overview, timer, speaker notes, next-slide preview, blackout, and remote-friendly controls.
3. **Audience viewing** — responsive published page, deep links, media, charts, optional interaction, citations, and follow-up actions.
4. **Embedding** — constrained iframe with origin policy, sandbox, responsive sizing, and a documented message contract.

Do not merge these into one cluttered surface. Editor controls must disappear in presenter/viewer modes.

## Default product promise

When an end user asks for a web presentation without restricting the output, choose the `editable-deck` profile. A static presenter is not a complete DeckForge result.

The editor must be functional. Changes to text, visual style, theme, layout, image/media, and block insertion must update the in-memory DeckProject and visibly rerender the canvas. Save must survive a reload.

## Story before layout

Determine audience, objective, desired decision, evidence, constraints, duration, delivery mode, and tone. Write one narrative thesis. Build a slide map where every slide has a specific job. Remove repeated jobs.

Prefer claim-led titles over generic labels. Use one main idea per slide. Technical slides may contain several objects, but their reading path must remain obvious.

## Semantic composition

A layout is a constraint system, not a decorative label. Normal slides use named layout slots such as `title`, `lead`, `primary`, `secondary`, `visual`, `evidence`, `caption`, and `footer`.

Resolve slot geometry from the layout manifest. Blocks bind to slots. Absolute frames are an escape hatch for user-created freeform content, not the normal generation strategy.

Every composition must satisfy:

- safe-margin containment;
- no forbidden overlap;
- adequate text capacity;
- readable font sizes;
- explicit z-order;
- balanced occupied area and whitespace;
- one dominant focal point;
- stable alignment lines;
- coherent responsive reading order.

If content does not fit, shorten, split, change the layout, or move detail to notes/appendix. Never hide the failure.

## Visual system

Select a presentation archetype, narrative template, visual theme, and layout rhythm independently.

Establish:

- an 8px or product-native spacing grid;
- explicit safe margins;
- stable type scale and line lengths;
- one primary focal point per slide;
- limited accent colors with semantic meaning;
- consistent image crops, chart encodings, and diagram grammar;
- responsive ordering for narrow viewports;
- restrained motion appropriate to audience and domain.

## Anti-AI-slop rules

Never default to:

- generic gradient hero plus three cards;
- translucent glass on every slide;
- glowing blobs, decorative particles, or random grids;
- icons for every bullet;
- identical compositions across the whole deck;
- excessive rounded rectangles;
- dark neon styling merely because the subject is AI;
- generic titles such as Overview, Benefits, Solution, Features, Conclusion;
- centered body copy, tiny labels, fake dashboards, or invented metrics.

A visual effect must reinforce hierarchy, sequence, comparison, causality, emotion, or brand. Otherwise remove it.

## Editor interaction model

Persist only document state. Keep selection, hover, open panels, pointer gestures, zoom, and viewport transform ephemeral.

Use command-based or transaction-based edits. A drag/resize gesture creates one undo entry at commit. Required editor behavior includes:

- slide creation, duplication, deletion, and reorder;
- selection and multi-selection;
- direct text editing with schema-safe rich text;
- add text, image, shape, chart, table, code, media, and diagram;
- theme, palette, typography, layout, background, and transition controls;
- move, resize, align, distribute, group, lock, layer order, duplicate, and delete;
- undo/redo, autosave, save status, reload recovery, and validation feedback;
- notes editing and presentation launch;
- visible shortcut hints and a searchable command palette.

Use schema-controlled rich text. Do not rely on ad-hoc contenteditable for production history and paste normalization.

## Asset and media model

Support upload/import, URL insertion, alt text, captions, source attribution, focal point, crop/fit, replace, remove, loading, broken-media states, and optimization. Do not fabricate image assets. Use user-provided, licensed, generated-with-permission, or clearly marked placeholder assets.

## Presenter model

Navigation consumes build steps before moving slides. Backward arrival normally shows the completed build state. Presenter mode hides editing controls and works with keyboard, touch, and assistive technology.

Provide an in-product shortcut guide. Do not expect users to discover hidden keys from README files.

## Motion

Motion is required, not optional. Bind `presentation.motionProfileId` to the deck's
archetype and apply the profile's default slide transition and object builds even
when the user does not request them. Use motion to reveal sequence, causality,
hierarchy, comparison, or state change. Limit concurrent motion, keep durations
consistent, and avoid playful physics in executive, research, finance, compliance,
or healthcare contexts unless justified.

Respect reduced motion by replacing spatial transforms with immediate or subtle
fade changes. Presenter chrome must be docked outside the letterboxed slide area.

## Data and diagrams

Every chart needs a question, takeaway, units, source, and accessible summary. Annotate the important point. Avoid 3D charts, unlabeled axes, rainbow palettes, decorative gauges, and meaningless dashboards.

Diagrams need named nodes, directional edges, boundaries, labels, and clear reading order. Diagram content must stay inside its assigned slot and must never cover slide titles.

## Accessibility

- Meet WCAG contrast and visible-focus expectations.
- Provide alt text or concise equivalents for non-text objects.
- Provide table/text summaries for charts.
- Maintain keyboard access to editor and presenter controls.
- Preserve logical reading order on responsive layouts.
- Respect `prefers-reduced-motion`.
- Do not encode meaning by color alone.
- Ensure the shortcut dialog and command palette are keyboard accessible.

## Security

Use structured block data. Sanitize rich text and SVG. Validate asset URLs and content types. External embeds require allow-lists, sandbox policy, loading behavior, and a documented message protocol. Never expose secrets in deck JSON.

## Performance

Lazy-load heavy non-current media, prefetch adjacent slides, avoid whole-deck rerenders for selection changes, virtualize long slide rails, and use compositor-friendly transforms. Debounce autosave and persist atomic documents.

## Blocking verification loop

1. Validate schema and catalog references.
2. Run the layout collision/content-fit audit.
3. Run the output-profile contract validator.
4. Run typecheck, tests, and production build.
5. Open the editor; change text, layout, theme, and media; save and reload.
6. Review every slide at canonical 16:9.
7. Review a common laptop and narrow viewport.
8. Test presenter keyboard/touch, fullscreen, overview, notes, shortcut help, and build sequence.
9. Run accessibility and anti-slop checks.
10. Fix blocking failures before reporting completion.

Never claim a route, interaction, save behavior, viewport, or browser was tested when it was not.
