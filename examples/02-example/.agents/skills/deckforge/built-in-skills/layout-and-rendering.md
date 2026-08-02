# Layout and Rendering

The renderer is shared by editor, presenter, viewer, and thumbnails. Build a single deterministic content renderer and layer editor affordances around it.

## Canonical canvas

Use an authored canvas such as 1600×900 for 16:9. Store semantic slot bindings as the default composition model. Resolve them from `layout-manifest.json` into canvas geometry.

Use viewport transforms for zoom. Do not mutate authored values merely because the editor window changes size.

## Position modes

Each content block has one of these modes:

- `slot` — default; geometry comes from its layout slot.
- `flow` — content flows within a slot/container.
- `freeform` — explicit x/y/w/h for user-dragged or annotation content.
- `background` — non-reading-order decorative/background layer.

Do not emit a `frame` for normal slot-bound blocks unless it is a cached resolved frame ignored by authoring logic.

## Slot rendering

- Use CSS Grid/Flexbox or an equivalent constraint layout inside slots.
- Keep title/header slots isolated from visuals and diagrams.
- Use consistent gaps from theme tokens.
- Attach captions and sources to the related visual.
- Preserve explicit responsive slot order.
- Render unknown/unassigned blocks in a recovery tray in the editor, not silently off-canvas.

## Content fit

Use explicit fit policies:

- `wrap`;
- `truncate-with-warning` only in editor previews, never final presenter content;
- `scroll` only for code/table/editor panels, not ordinary slide prose;
- `contain` or `cover` for media;
- `split-slide` or `change-layout` as repair actions.

Never repeatedly shrink text until it fits. Detect and show overflow warnings.

## Responsive strategy

- Presenter: letterbox composition when appropriate.
- Editor: preserve the authored canvas with zoom/fit.
- Published mobile viewer: semantic reflow using slot order.
- Embed: choose letterbox or reflow explicitly based on host contract.

Do not hide essential content on narrow screens.

## Rendering architecture

Use a semantic block registry. Keep block rendering independent from editor selection. Render selection handles, snap lines, and resize affordances in a separate overlay layer so they never change presenter geometry.

Sanitize rich content and SVG. Validate unknown block types and unsupported assets.

## Required checks

Run the layout audit and inspect:

- bounds and safe margins;
- overlap/collision;
- title/visual separation;
- z-order;
- text line count and capacity;
- image crop;
- table/code legibility;
- caption/source attachment;
- responsive order;
- thumbnail accuracy;
- print/static fallback.
