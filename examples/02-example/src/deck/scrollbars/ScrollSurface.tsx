import type { CSSProperties, ReactNode } from 'react';
import { useResolvedScrollbarStyle } from './useResolvedScrollbarStyle';
import type { ScrollAxis, ScrollbarStyleId, ScrollbarThemeMapping, ScrollSurface as ScrollSurfaceId } from './scrollbarTypes';

export interface ScrollSurfaceProps {
  /** Semantic scroll surface driving the theme scrollbar mapping. */
  surface: ScrollSurfaceId;
  /** Explicit style override (skips theme resolution). */
  styleId?: ScrollbarStyleId;
  axis?: ScrollAxis;
  /** The scroll container itself may be the semantic surface. */
  as?: 'div' | 'section' | 'nav' | 'aside' | 'main';
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  children: ReactNode;
  mapping?: ScrollbarThemeMapping;
}

export function ScrollSurface({
  surface,
  styleId,
  axis = 'vertical',
  as: Tag = 'div',
  className,
  style,
  children,
  mapping,
  ...rest
}: ScrollSurfaceProps) {
  const resolved = useResolvedScrollbarStyle(surface, styleId, mapping);
  return (
    <Tag
      className={['scroll-surface', className].filter(Boolean).join(' ')}
      data-scroll-surface={surface}
      data-scrollbar-style={resolved.styleId}
      data-scroll-axis={axis}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
