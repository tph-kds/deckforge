# Performance

A slide editor combines rich content, frequent interaction, and media-heavy presentation. Performance work must protect input responsiveness first and visual spectacle second.

## Rendering boundaries

Avoid deck-wide rerenders for pointer movement, cursor position, hover, selection handles, or timer updates. Subscribe components to the smallest possible state slice. Keep stateless slide rendering separate from editor overlays. Memoize expensive chart and diagram computation only when measurement shows value.

## Long decks

Virtualize or window the slide rail and expensive overview thumbnails. Generate thumbnails asynchronously and invalidate them by slide version. Do not mount every video, embed, chart, and animation in a hundred-slide deck.

## Media and assets

Lazy-load heavy images, fonts, video, and embeds; preload the current and adjacent slides; provide responsive image sources; and avoid decoding large assets during a transition. Pause off-screen media and dispose of third-party players. Track upload and CDN transformations separately from local editor previews.

## Interaction

Use transforms for drag/resize previews and commit document changes at gesture end. Throttle collaboration presence and pointer broadcasts. Keep autosave incremental and debounced without risking data loss. Move CPU-heavy import, export, thumbnail, or layout work to a worker or server task when appropriate.

## Dependency discipline

Do not add a full whiteboard/editor framework to implement a static viewer. Measure bundle cost, tree-shaking, hydration, and route-level loading. Presenter routes should not ship editor-only dependencies when code splitting can avoid it.

## Verification

Profile real representative decks rather than empty samples. Measure editor input latency, slide change time, animation smoothness, memory growth, initial audience load, and long-deck behavior. Test slow networks, failed assets, reduced-power devices, and repeated presenter navigation. Record performance budgets and regressions in CI where feasible.
