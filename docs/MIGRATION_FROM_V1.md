# Migration from DeckPageSpec 1.0

- `slug`, `title`, and `description` move under `meta`.
- `mode` becomes `presentation.mode`.
- `theme` becomes `theme.id` with optional token overrides.
- `page` behavior is split between `editor`, `presentation`, and `publish`.
- Slide blocks become typed and receive stable IDs, frames, style, source IDs, and animation metadata.
- Embed settings move under `publish.embed`.
- Sources and assets become first-class registries.

Use the `migration` built-in workflow and keep the original file as a fixture until visual and behavioral parity is verified.
