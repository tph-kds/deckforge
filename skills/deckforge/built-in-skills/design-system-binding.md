# Design System Binding

DeckForge must feel native to the target product or brand. Treat the existing design system as a constraint and implementation source, not as loose inspiration.

## Inspect first

Locate typography scales, color tokens, spacing, radii, shadows, icon sets, chart palettes, motion curves, component primitives, dark/light modes, and accessibility conventions. Identify whether tokens are expressed through CSS variables, Tailwind configuration, theme objects, design-token packages, or component APIs.

## Adapter layer

Map project tokens to a small DeckForge semantic layer such as:

- `deck.canvas`, `deck.surface`, `deck.text`, `deck.muted`, `deck.accent`, `deck.border`, `deck.focus`;
- `deck.heading.*`, `deck.body.*`, `deck.code.*`;
- `deck.space.*`, `deck.radius.*`, `deck.shadow.*`;
- `deck.motion.fast`, `deck.motion.normal`, `deck.motion.ease`;
- `deck.chart.series.*`, `deck.chart.positive`, `deck.chart.negative`.

Do not duplicate the complete design system or hard-code brand values throughout slide components. Theme overrides must remain declarative and validated.

## Presentation-specific adaptation

A product UI type scale is often too small for projected slides. Preserve the typeface and visual character while introducing presentation-safe sizes, line lengths, contrast, and spacing. Similarly, adapt controls for editor density but hide them entirely from audience mode. Use the brand icon language consistently and avoid mixing unrelated illustration styles.

## Theme behavior

Support light/dark or branded theme switching only when the target system supports it coherently. Charts, focus states, code blocks, images, embeds, and selection affordances must respond to theme changes. Avoid applying the accent color to all text or using brand gradients as a universal background.

## Verification

Compare DeckForge screens with adjacent product screens. Check token reuse, component semantics, typography hierarchy, spacing rhythm, icon treatment, disabled/error states, and motion. Document any new semantic token and why existing tokens were insufficient.
