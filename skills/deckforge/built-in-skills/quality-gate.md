# Quality Gate

Quality validation is a blocking workflow, not a list of future recommendations. Load `assets/quality-rubric.json` and evaluate the complete product against its weighted dimensions and blocking checks.

## Automated checks

Run repository linting, type checking, tests, schema validation, unknown block detection, duplicate ID checks, asset URL validation, accessibility automation, and representative visual regression where the target supports them. Validate imported and example DeckProject documents.

## Manual story and visual review

Read slide titles as a narrative. Inspect every slide for hierarchy, density, alignment, safe margins, text fit, meaningful imagery, data integrity, source presentation, and consistent visual language. Check for repeated layouts and pacing monotony.

Search deliberately for AI-slop indicators: irrelevant neon gradients, glowing orbs, ubiquitous glass cards, generic three-card sections, decorative dashboards, fake metrics, invented logos/testimonials, mixed icon styles, excessive rounded containers, and filler copy. A fashionable effect is acceptable only when it serves the content and brand.

## Behavioral review

Exercise editor selection, history, insert, duplicate/delete, reorder, notes, theme/layout changes, autosave, error recovery, and publish state. Exercise presenter keyboard/touch navigation, builds, overview, fullscreen, deep links, speaker view, reduced motion, embeds, and exit behavior.

## Viewports and accessibility

Review canonical 16:9, a common laptop viewport, embed width, and narrow/mobile reading mode. Test keyboard-only flow, focus restoration, labels, contrast, alt text, chart summaries, zoom, and reduced motion.

## Handoff

Fix all blocking defects and in-scope high-impact issues before completion. Report commands run, routes and viewports inspected, artifacts changed, remaining limitations, and any check that could not be executed. Never claim a preview or device was tested when it was not.
