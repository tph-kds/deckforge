# Template and Theme

A presentation archetype describes the communication situation. A template describes the narrative recipe. A theme describes the visual token system. A layout describes a single-slide constraint system. Select them independently.

## Selection sequence

1. Select archetype from `presentation-archetype-manifest.json`.
2. Select template from `template-manifest.json`.
3. Select one primary theme from `theme-manifest.json`.
4. Plan layout rhythm from `layout-manifest.json`.
5. Apply justified token overrides.

## Template scoring

Score candidates against audience, objective, decision/learning type, duration, evidence type, domain, delivery mode, and interaction needs.

A template slide plan is a starting point. Remove filler roles and add domain-specific slides only when they advance the argument. Do not force every deck into eight slides.

## Theme selection

Score tone, brand compatibility, contrast, density, typography, media mix, chart palette, shape language, and motion style. Bind to the target product's design system when available.

Fonts in a catalog are preferences, not bundled licenses. Use available or project-native alternatives.

## Editor expectations

The default editable profile must expose:

- theme picker with previews;
- palette/accent controls;
- typography pair controls;
- background controls;
- layout picker grouped by purpose;
- template/archetype metadata for new-deck flows;
- reset-to-theme behavior.

Theme changes should update tokens, not rewrite every block with duplicated style values.

## Layout rhythm

Keep typography and tokens coherent while varying composition. Avoid using `two-column`, `card-grid`, or centered statement repeatedly. Use low-density slides around high-density technical/data slides to maintain pace.

## Custom generation

When no template fits, create a stable recipe with archetype, audience, goal, slide roles, layout mapping, evidence expectations, interaction profile, and known risks. Validate every referenced ID.

## Verification

Preview actual content. Check theme contrast, layout fit, chart colors, media treatment, narrow behavior, and presentation-distance legibility. Compare the result with the audience and purpose, not only visual trends.
