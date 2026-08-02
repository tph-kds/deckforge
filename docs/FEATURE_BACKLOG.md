# Product Implementation Backlog

This backlog is for a target DeckForge application, not for the Agent Skills repository itself.

## Phase 1 — Dependable web deck foundation

- DeckProject validation, migrations, fixtures, and block registry.
- Stateless renderer with canonical canvas and responsive reading mode.
- Slide rail, canvas selection, insert, duplicate/delete, reorder, undo/redo, notes, themes, and layouts.
- Presenter navigation, builds, fullscreen, overview, deep links, touch, and reduced motion.
- Local persistence or existing application storage adapter.
- Accessibility baseline and visual/behavioral tests.

**Exit:** a user can create, edit, save, reload, and present a professional deck without data loss or inaccessible core navigation.

## Phase 2 — Production authoring and delivery

- Rich text, image/media pipeline, charts, diagrams, tables, code, and citations.
- Properties panel, alignment, grouping, locking, guides, command palette, and autosave recovery.
- Speaker view synchronization, timer, media checks, and presentation rehearsal mode.
- Versioning, publish/unpublish, private/unlisted/public routes, embeds, origin policy, analytics, and export adapters.
- Import/migration reports and representative visual regression suite.

**Exit:** teams can author and distribute governed web presentations with traceable versions and safe sharing.

## Phase 3 — Intelligent and collaborative workflows

- Brand/design-system binding and reusable organization templates.
- Comments, review workflow, approvals, and real-time collaboration.
- AI-assisted outline, rewrite, layout recommendation, theme matching, source grounding, alt text, and quality audit—always as reviewable commands rather than silent mutation.
- Polls, Q&A, quizzes, branching, forms, code/demo sandboxes, and audience analytics through runtime adapters.
- Offline recovery, multi-region asset delivery, enterprise authorization, retention, audit logs, and observability.

**Exit:** the product supports scalable organizational workflows without weakening content trust, user control, accessibility, or security.

## Non-goals by default

- Pixel-perfect PowerPoint parity for every feature and animation.
- Arbitrary raw HTML/JavaScript blocks.
- Image-only slides as the canonical editable representation.
- A universal whiteboard, website builder, document editor, or video editor inside the slide canvas.
- Authentication, billing, database, and deployment code inside this skills repository.

## DeckForge 3 baseline already enforced by the skill

The following are no longer optional backlog items for an `editable-deck` output:

- semantic slot-based layouts with collision validation
- functional slide rail, toolbar, inspector/tools panel, notes, and save status
- state mutation, undo/redo, persistence, and reload recovery
- theme, layout, text, and media editing
- separate presenter mode with fullscreen, overview, blackout, progress, and shortcut help
- archetype-aware template selection and named motion profiles
- schema, layout, output-contract, build, and behavioral verification
