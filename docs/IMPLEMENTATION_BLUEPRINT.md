# Implementation Blueprint

## Greenfield

1. Inspect product requirements, audience, brand, and deployment constraints.
2. Create a DeckProject schema and block registry.
3. Build a stateless renderer before the editor.
4. Add presenter navigation, builds, notes, overview, deep links, and reduced motion.
5. Add editor selection, history, slide rail, toolbar, insert menu, layout/theme panels, and autosave.
6. Add persistence and publish/embed adapters.
7. Add visual regression, keyboard, accessibility, and schema migration tests.

## Brownfield

1. Inventory existing deck/page models, rendering paths, editor state, and exports.
2. Identify duplicated components and implicit layout rules.
3. Introduce an adapter that maps legacy content to DeckProject 2.0.
4. Replace presentation rendering first while preserving old editing.
5. Migrate editor commands and history behind feature flags.
6. Run side-by-side visual and behavioral comparisons.
7. Remove legacy paths only after migration fixtures pass.

## Suggested libraries

Choose based on the target repository rather than blindly adding dependencies:

- dnd-kit for sortable slide lists and controlled drag interactions.
- Zustand, Redux Toolkit, or project-native state for commands and selection.
- Tiptap or Lexical only for rich text; plain contenteditable is insufficient for production history and schema control.
- Framer Motion or Motion One for transition orchestration.
- ECharts/Visx for complex data; Recharts for simpler declarative charts.
- Playwright and axe-core for keyboard, fullscreen, visual, and accessibility checks.
