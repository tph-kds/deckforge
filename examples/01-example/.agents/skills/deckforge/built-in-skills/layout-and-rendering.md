# Layout and Rendering

The renderer is the stable foundation for both editor and presenter surfaces. Build it before complex editing interactions.

## Canonical canvas

Author against a deterministic canvas such as 1600×900 for 16:9 and store block frames in canvas coordinates. Apply zoom through a viewport transform, not by changing authored values. Keep slide safe margins and grid units explicit.

Use layouts from `assets/layout-manifest.json` as semantic recipes, not rigid screenshots. A layout defines regions, hierarchy, expected block types, density, and responsive behavior. Blocks remain independently editable.

## Responsive strategy

Do not blindly scale the desktop canvas for every viewport. For audience presentation, letterboxing may preserve composition on wide screens. For embedded and mobile reading modes, provide a semantic responsive transformation: stack columns, preserve evidence before commentary, keep reading order, simplify decoration, and allow content to flow. Never hide essential content solely because the viewport is narrow.

## Text and media fit

Use explicit fit policies: fixed presentation size, measured wrapping, optional region expansion, or layout change. Do not continually shrink text until it fits. Detect overflow and surface it in the editor. Define object-fit and focal-point behavior for images and video. Keep charts, tables, code, captions, and citations legible at presentation distance.

## Rendering architecture

Use a block registry keyed by semantic type. Keep block rendering stateless with respect to editor selection. Overlay editor affordances outside the content layer so published output remains clean. Sanitize all rich content and validate unknown block types.

## Verification

Inspect every layout at canonical 16:9, common laptop sizes, embed widths, and at least one narrow viewport. Check clipping, z-order, safe margins, line breaks, image crops, table overflow, code scrolling, focus rings, and print/static fallback. Test deep-linked entry directly into any slide and build step.
