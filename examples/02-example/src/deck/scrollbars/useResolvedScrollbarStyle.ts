import { useContext, useMemo } from 'react';
import { ScrollbarContext } from './scrollbarRuntime';
import { resolveScrollbar } from './resolveScrollbar';
import type { ScrollSurface, ScrollbarStyleId, ScrollbarThemeMapping } from './scrollbarTypes';

export interface ResolvedScrollbar {
  styleId: ScrollbarStyleId;
}

export function useResolvedScrollbarStyle(
  surface: ScrollSurface,
  styleId?: ScrollbarStyleId,
  mappingOverride?: ScrollbarThemeMapping,
): ResolvedScrollbar {
  const context = useContext(ScrollbarContext);
  const mapping = mappingOverride ?? context.mapping;
  const overrides = context.overrides;

  return useMemo(() => {
    const resolved = styleId ?? resolveScrollbar(mapping, surface, overrides);
    return { styleId: resolved };
  }, [mapping, overrides, surface, styleId]);
}
