// render/SlideViewport.tsx
//
// The editor's zoom/pan/fit viewport (Phase 9-12).
//
// The SlideDocument is NEVER scaled here: this layer applies a pure view
// transform to a logical, unscaled slide render. Transform functions compose
// right-to-left, so `translate(-50%,-50%) translate(px,py) scale(s)` scales
// the element about its own center (transform-origin: center) which keeps the
// viewport center anchored while zooming and lets `px,py` pan once the slide
// is larger than the viewport. No scrollbars: `overflow: hidden` and panning
// is internal.
//
// Rules enforced:
//  - `fit` is COMPUTED from the viewport size, never a hard-coded 0.62.
//  - Zoom/pan/fit never mutate the deck or the renderer's logical geometry.
//  - The slide is rendered once at scale 1 and transformed; exporting reads
//    the same logical geometry the editor shows.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DeckProject, DeckSlide } from '../deck/types';
import { clampPan, computeFitScale, zoomStep } from './viewport-math';

export interface ViewState {
  /** Current scale (1 = 100% of document size). */
  zoom: number;
  /** The computed Fit scale for the current viewport size. */
  fit: number;
  /** Whether the current zoom equals Fit (no user override). */
  atFit: boolean;
}

export interface SlideViewportHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

interface SlideViewportProps {
  deck: DeckProject;
  slide: DeckSlide;
  /** Render the slide at LOGICAL scale (scale=1); the viewport transforms it. */
  renderSlide: () => ReactNode;
  /** Margin (CSS px) between the slide and the viewport edge at Fit. */
  fitPadding?: number;
  className?: string;
  /** Emitted whenever zoom/pan/fit changes (for the toolbar label). */
  onViewChange?: (view: ViewState) => void;
  /** Emitted when the viewport background (not a block) is clicked. */
  onBackgroundClick?: () => void;
  /** Minimal scale clamp (e.g. 0.05). */
  minZoom?: number;
  /** Max scale clamp (e.g. 4). */
  maxZoom?: number;
}

const DEFAULT_PADDING = 32;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.15;

export const SlideViewport = forwardRef<SlideViewportHandle, SlideViewportProps>(function SlideViewport(
  {
    deck,
    renderSlide,
    fitPadding = DEFAULT_PADDING,
    className,
    onViewChange,
    onBackgroundClick,
    minZoom = MIN_ZOOM,
    maxZoom = MAX_ZOOM,
  }: SlideViewportProps,
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fit, setFit] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const didFitOnMount = useRef(false);

  const canvasW = deck.canvas?.width ?? 1600;
  const canvasH = deck.canvas?.height ?? 900;

  // Track the viewport size so Fit is always real, not a constant.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Recompute Fit whenever the viewport or canvas changes.
  const computedFit = computeFitScale(size, canvasW, canvasH, fitPadding, minZoom, maxZoom);
  useEffect(() => {
    setFit(computedFit);
  }, [computedFit]);

  // Open at Fit so the whole slide is visible on first layout (any screen
  // size). Only the first render does this; user zoom/pan always wins after.
  useEffect(() => {
    if (didFitOnMount.current || size == null || computedFit <= 0) return;
    didFitOnMount.current = true;
    setZoom(computedFit);
    setPan({ x: 0, y: 0 });
  }, [size, computedFit]);

  const atFit = Math.abs(zoom - fit) < 1e-6;

  const clampZoom = useCallback(
    (value: number) => Math.max(minZoom, Math.min(maxZoom, value)),
    [minZoom, maxZoom],
  );

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = clampZoom(zoomStep(z, ZOOM_STEP, minZoom, maxZoom));
      if (atFit) setPan({ x: 0, y: 0 });
      return next;
    });
  }, [atFit, clampZoom, minZoom, maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = clampZoom(zoomStep(z, 1 / ZOOM_STEP, minZoom, maxZoom));
      if (atFit) setPan({ x: 0, y: 0 });
      return next;
    });
  }, [atFit, clampZoom, minZoom, maxZoom]);

  const fitNow = useCallback(() => {
    setZoom(fit);
    setPan({ x: 0, y: 0 });
  }, [fit]);

  useImperativeHandle(forwardedRef, () => ({ zoomIn, zoomOut, fit: fitNow }), [zoomIn, zoomOut, fitNow]);

  // Keep the slide on screen: once it is larger than the viewport, pan is
  // clamped so at least a strip remains visible (no scrollbars, ever).
  const clampViewPan = useCallback(
    (x: number, y: number) => clampPan(size, canvasW, canvasH, zoom, fit, fitPadding, x, y),
    [size, canvasW, canvasH, zoom, fit, fitPadding],
  );

  useEffect(() => {
    onViewChange?.({ zoom, fit, atFit });
  }, [zoom, fit, atFit, onViewChange]);

  const oversized = size != null && (size.w < canvasW * zoom || size.h < canvasH * zoom);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!oversized || !size) return;
    if (event.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setPan(clampViewPan(dragStart.current.panX + dx, dragStart.current.panY + dy));
  };

  const endDrag = () => {
    setDragging(false);
    dragStart.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`slide-viewport${className ? ` ${className}` : ''}${dragging ? ' is-panning' : ''}`}
      data-viewport-size={size ? `${Math.round(size.w)}x${Math.round(size.h)}` : undefined}
      data-canvas-size={`${canvasW}x${canvasH}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={(event) => {
        // Blocks stopPropagation, so a click landing here is background.
        if (event.target === containerRef.current) onBackgroundClick?.();
      }}
      style={{ overflow: 'hidden', position: 'relative', touchAction: 'none' }}
    >
      <div
        className="slide-viewport-transform"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: canvasW,
          height: canvasH,
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {renderSlide()}
      </div>
    </div>
  );
});
