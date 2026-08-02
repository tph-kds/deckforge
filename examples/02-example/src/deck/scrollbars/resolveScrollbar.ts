import { getScrollbarStyle } from './scrollbarRegistry';
import type { ScrollSurface, ScrollbarStyleId, ScrollbarThemeMapping } from './scrollbarTypes';

export type ScrollbarOverrideMap = Partial<Record<ScrollSurface, ScrollbarStyleId>>;

export const DEFAULT_SCROLLBAR_STYLE: ScrollbarStyleId = 'gradient-slim';
export const FALLBACK_SCROLLBAR_STYLE: ScrollbarStyleId = 'system-native';

/**
 * Resolve the catalog style for a surface. Presenter and slide-stage are
 * always "none" (blocking requirement: the canvas and fullscreen audience
 * view never scroll, so they never show a scrollbar). Project overrides win
 * over theme surface mappings, which win over the theme default.
 */
export function resolveScrollbarStyleId(
  mapping: ScrollbarThemeMapping | undefined,
  surface: ScrollSurface,
  overrides?: ScrollbarOverrideMap,
): ScrollbarStyleId {
  if (surface === 'presenter' || surface === 'slide-stage') {
    return 'none';
  }
  const explicit = overrides?.[surface];
  if (explicit) {
    return explicit;
  }
  const fromMapping = mapping?.[surface];
  if (fromMapping) {
    return fromMapping;
  }
  return mapping?.default ?? DEFAULT_SCROLLBAR_STYLE;
}

/**
 * Follow the fallback chain (glow -> non-glow -> system-native) until a
 * style that actually supports the requested surface is found.
 */
export function resolveScrollbar(
  mapping: ScrollbarThemeMapping | undefined,
  surface: ScrollSurface,
  overrides?: ScrollbarOverrideMap,
): ScrollbarStyleId {
  if (surface === 'presenter' || surface === 'slide-stage') {
    return 'none';
  }
  let id = resolveScrollbarStyleId(mapping, surface, overrides);
  let guard = 0;
  while (guard++ < 12) {
    const style = getScrollbarStyle(id);
    if (!style) {
      return FALLBACK_SCROLLBAR_STYLE;
    }
    if (style.supportedSurfaces.includes(surface) && style.renderMode === 'native-themed') {
      return id;
    }
    if (style.fallbackStyleId === id) {
      return FALLBACK_SCROLLBAR_STYLE;
    }
    id = style.fallbackStyleId as ScrollbarStyleId;
  }
  return FALLBACK_SCROLLBAR_STYLE;
}

export function scrollbarSupportsAutoHide(id: ScrollbarStyleId): boolean {
  return getScrollbarStyle(id)?.behavior.autoHide ?? false;
}
