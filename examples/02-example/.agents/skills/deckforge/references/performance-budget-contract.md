# Performance Budget Contract

Budgets are measured against representative decks, including a 100-slide fixture.

- Slide rail and overview thumbnails are virtualized or windowed; thumbnails are generated asynchronously and invalidated by slide version.
- Charts and motion libraries are lazy-loaded; heavy media, fonts, video, and embeds are lazy and preloaded only for current and adjacent slides.
- No deck-wide re-render for pointer movement, cursor position, hover, selection handles, or timer updates.
- Drag/resize previews use transforms; the document changes once at gesture end.
- CPU-heavy import, export, thumbnail, and layout work moves to a worker or server task.
- Long-session runs show no unbounded memory growth.
- Budgets: editor input latency and slide-change time stay under 100ms on a reference machine; animation stays at target frame rate; repeated presenter navigation causes no sustained memory growth.

Verification: profile a real 100-slide deck, not an empty sample; record budgets in CI where feasible.
