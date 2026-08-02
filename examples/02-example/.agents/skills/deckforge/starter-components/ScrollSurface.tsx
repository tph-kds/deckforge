import type { CSSProperties, ReactNode } from 'react';

export type ScrollSurfaceId =
  | 'app-page'
  | 'slide-list'
  | 'inspector'
  | 'grid'
  | 'speaker-notes'
  | 'modal'
  | 'asset-library'
  | 'theme-library'
  | 'presenter'
  | 'slide-stage';

export type ScrollAxis = 'vertical' | 'horizontal' | 'both';

export interface ScrollSurfaceProps {
  /** Semantic scroll surface (drives the theme scrollbar mapping). */
  surface: ScrollSurfaceId;
  /** Optional explicit catalog style id; overrides the theme mapping. */
  styleId?: string;
  axis?: ScrollAxis;
  /** Smooth programmatic scrolling (respects reduced motion via CSS). */
  smoothScroll?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Semantic scroll-surface wrapper. Every permitted scrollable region should
 * be wrapped with this component so the theme's scrollbar mapping resolves
 * through `data-scroll-surface` / `data-scrollbar-style`, and the
 * `scrollbars.css` catalog drives the visuals.
 *
 * The slide stage and fullscreen presenter must NEVER use this as a
 * scrollable surface — resolve them to `data-scrollbar-style="none"`.
 */
export function ScrollSurface({
  surface,
  styleId,
  axis = 'vertical',
  smoothScroll = true,
  className,
  style,
  children,
}: ScrollSurfaceProps) {
  return (
    <div
      className={['scroll-surface', className].filter(Boolean).join(' ')}
      data-scroll-surface={surface}
      data-scrollbar-style={styleId}
      data-scroll-axis={axis}
      data-smooth-scroll={smoothScroll ? 'true' : undefined}
      style={style}
    >
      {children}
    </div>
  );
}
