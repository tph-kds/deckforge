# Scrollbar and Scroll Surfaces

DeckForge ships a governed, theme-aware scrollbar system. Follow this guidance so
generated products get polished, smooth, theme-matched scrollbars on editor and
publishing surfaces while the slide canvas and the fullscreen audience
presentation stay scrollbar-free.

## Non-negotiable rules

1. **Never make the slide canvas scrollable.** A slide that overflows must be
   shortened, re-laid-out, or split — never scrolled. `.slide-stage` is always
   `overflow: hidden`.
2. **Never show a scrollbar in fullscreen presentation mode.** The audience view
   is a single slide surface. Lock body scrolling, hide presenter-tree
   scrollbars, and restore state on exit.
3. **Use the theme scrollbar mappings**, not arbitrary per-app CSS. Every theme
   in `assets/theme-manifest.json` declares `scrollbar.default` plus optional
   per-surface overrides; `presenter` and `slide-stage` are always `none`.
4. **Use the semantic `ScrollSurface` wrapper** around every permitted scroll
   container (slide list, inspector, notes, grid, modals, libraries). Do not
   sprinkle `::-webkit-scrollbar` rules globally.
5. **Preserve native scrolling.** Never intercept wheel/trackpad input to fake
   smoothness. Use `scroll-behavior: smooth` only for programmatic navigation
   (`scrollIntoView` of the active slide, a validation error, a newly added
   asset) and respect reduced motion by falling back to `auto`.
6. **Style both axes** (`--scrollbar-width` and `--scrollbar-height`) so
   horizontal containers (toolbar, inspector tabs, narrow rails) match too.

## Design quality

7. Match the scrollbar profile to the theme's visual language: restrained
   `gradient-slim` for clean/technical themes, `aurora-glow` for premium dark
   themes, `minimal-thin` for editorial/minimal themes, `neon-edge` only for neon
   and experimental themes, `mono-ink` for monochrome themes.
8. Do not apply glow or saturation to every small panel. Speaker notes and
   long-form content may be more visible; tiny modals should stay subtle.
9. Keep decorative restraint: one clear thumb, a restrained track, a subtle hover
   change, stable dimensions. Do not combine gradient + glow + animated width +
   bright track + thick border.
10. Use `scrollbar-gutter: stable` so scrollbar appearance never shifts content.

## Accessibility and robustness

11. Keep thumbs visibly distinct from tracks; never rely on glow alone.
12. Provide forced-colors (`@media (forced-colors: active)`) and high-contrast
    solid-thumb overrides.
13. On coarse pointers (touch), fall back to the device-native scrollbar
    (`scrollbar-width: auto`) to preserve momentum.
14. Keep speaker-note scrolling isolated from the audience stage.
15. Use `system-native` as the safe fallback for unsupported browsers and runtime
    failures. Never let a styling failure leave the app unscrollable.

## Runtime wiring

- Resolve `theme.scrollbar` -> surface override -> style from
  `assets/scrollbar-manifest.json`, then inject `--scrollbar-*` CSS variables and
  set `data-scrollbar-style` on the `ScrollSurface`.
- Fullscreen lifecycle: on enter, save body overflow + window scroll position,
  set `html[data-presentation-mode="fullscreen"]`, lock `body`, reset scroll; on
  exit (Escape, `fullscreenchange`, unmount, route change), restore overflow and
  scroll position and return focus.
- `renderMode: "system-native"` and `"none"` require no WebKit pseudo-element
  styling; `"none"` is restricted to non-scrollable surfaces.
