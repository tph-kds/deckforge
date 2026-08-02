# Research Foundations

This redesign synthesizes patterns from established Agent Skills and web presentation projects without copying their implementation text.

- `mvanhorn/last30days-skill`: strong explicit contracts, environment-aware routing, failure-mode documentation, deterministic self-checks, and production validation.
- `JimLiu/baoyu-design`: a concise orchestrator, a separate craft source of truth, harness-specific references, task-specific built-in skills, and starter components.
- `Imbad0202/academic-research-skills`: staged orchestration, entry-point detection, state tracking, handoff contracts, checkpoints, integrity gates, and quality trajectories.
- `JimLiu/baoyu-skills`: parameterized style systems, reproducible intermediate artifacts, conditional review stages, and modular references.
- `slidevjs/slidev`: feature-oriented agent documentation, presenter mode, animations, code and diagram support, SPA delivery, and web-native presentation semantics.
- `hakimel/reveal.js`: mature keyboard navigation, overview, speaker notes, plugins, vertical/horizontal structures, and robust browser presentation behavior.
- `FormidableLabs/spectacle`: React/JSX presentation composition and live code demonstrations.
- `tldraw/tldraw`, `prevwong/craft.js`, and headless rich-text editors such as Tiptap: patterns for editor state, direct manipulation, extensible nodes, and command/history systems.

## Resulting design decisions

- One main skill with on-demand modules instead of many thin always-loaded skills.
- A structured deck schema instead of arbitrary HTML content.
- Template recipes separated from visual themes.
- Editor and presenter behavior specified independently.
- Quality, accessibility, security, and reduced-motion checks are blocking gates.
- Reference components are included, but a production runtime remains the responsibility of the target project.
