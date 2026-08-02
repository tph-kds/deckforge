# Security Rules

- Deck content is structured data; raw HTML is disabled by default.
- Sanitize and validate URLs, embeds, SVG, Markdown, rich text, and imported documents.
- Do not combine iframe `allow-scripts` and `allow-same-origin` without a documented threat review.
- Publish and embed operations require authorization and explicit visibility.
- External assets need provenance, licensing, size limits, and content-type checks.
- Never place API keys, tokens, cookies, database URLs, or user secrets in a deck spec or skill file.
