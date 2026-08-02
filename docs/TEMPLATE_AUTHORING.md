# Template Authoring

A template is a narrative recipe, not a theme. It defines audience, goal, slide roles, recommended layouts, evidence expectations, and quality risks. A theme controls visual tokens and motion personality.

To add a template:

1. Add one object to `skills/deckforge/assets/template-manifest.json`.
2. Use canonical layouts from `layout-manifest.json`.
3. Keep the slide plan adaptable; avoid mandatory filler slides.
4. State the audience and decision the deck supports.
5. Run `python scripts/validate_catalogs.py` and tests.
