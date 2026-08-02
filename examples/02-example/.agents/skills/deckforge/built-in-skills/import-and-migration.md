# Import and Migration

Migration must preserve meaning and provide an auditable record of what changed. Treat every imported file or document as untrusted input.

## Inventory

Identify the source format, version, slide count, dimensions, masters/themes, fonts, layouts, groups, notes, comments, animations, charts, tables, media, hyperlinks, citations, and embedded content. Preserve the original source as a fixture and record a checksum when appropriate.

## Mapping

Map metadata, themes, slides, semantic blocks, assets, notes, sources, interactions, and publishing settings into DeckProject 2.0. Prefer semantic reconstruction over a single screenshot of each slide. Preserve visual fidelity only where it does not destroy editability, accessibility, or responsive behavior.

Create an explicit compatibility matrix:

- fully supported and editable;
- imported with a safe approximation;
- flattened to media with a warning;
- omitted because it is unsafe or impossible;
- requires user review.

Never silently discard unsupported content. Sanitize rich text, SVG, URLs, scripts, fonts, and embedded documents. Do not execute macros or imported code.

## Migration strategy

For a brownfield web application, introduce adapters and schema migrations behind feature flags. Keep legacy rendering available until representative fixtures pass visual and behavioral comparison. Version the migration and make repeated runs deterministic and idempotent where possible.

## Verification

Validate the resulting DeckProject, render source and target side by side, compare notes and reading order, test charts and links, inspect text fit and image crops, and exercise presenter navigation. Record all warnings in a migration report linked to slide and block IDs. Keep a reversible path until stakeholders approve parity.
