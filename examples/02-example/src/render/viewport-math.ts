// render/viewport-math.ts
//
// Pure view-transform math for the editor viewport (Phase 9-12). Kept
// framework-free so the Fit / pan-clamp behaviour is unit-testable and so the
// exact same numbers drive the DOM and any future headless verification.
//
// These functions operate ONLY on view parameters (size, zoom, pan); they
// never read or mutate the SlideDocument.

export interface ViewportSize {
  w: number;
  h: number;
}

export interface FitResult {
  /** The scale that fits the document in the viewport with the given padding. */
  fit: number;
}

/**
 * Compute the Fit scale: the largest scale that keeps the whole document
 * visible inside the viewport, with `padding` px on every side. Clamped into
 * [minZoom, maxZoom]. Returns 1 when there is no measurable viewport yet.
 */
export function computeFitScale(
  viewport: ViewportSize | null,
  documentW: number,
  documentH: number,
  padding = 32,
  minZoom = 0.05,
  maxZoom = 4,
): number {
  if (!viewport || viewport.w <= 0 || viewport.h <= 0) return 1;
  const availW = viewport.w - padding * 2;
  const availH = viewport.h - padding * 2;
  if (availW <= 0 || availH <= 0) return 1;
  const raw = Math.min(availW / documentW, availH / documentH);
  return Math.max(minZoom, Math.min(maxZoom, raw));
}

/**
 * Clamp a pan offset so the zoomed document never leaves the viewport
 * entirely (a strip always remains visible). Returns {x,y}. When the document
 * fits (zoom <= fit) the pan is always (0,0) so the slide stays centered.
 */
export function clampPan(
  viewport: ViewportSize | null,
  documentW: number,
  documentH: number,
  zoom: number,
  fit: number,
  padding = 32,
  x: number,
  y: number,
): { x: number; y: number } {
  if (!viewport || zoom <= fit) return { x: 0, y: 0 };
  const slideW = documentW * zoom;
  const slideH = documentH * zoom;
  const visibleW = viewport.w;
  const visibleH = viewport.h;

  const slackX = Math.max(0, (slideW - visibleW) / 2 + padding);
  const slackY = Math.max(0, (slideH - visibleH) / 2 + padding);

  const clampedX = Math.max(-slackX, Math.min(slackX, x));
  const clampedY = Math.max(-slackY, Math.min(slackY, y));
  return { x: clampedX, y: clampedY };
}

/**
 * Zoom one step around the viewport center, clamping to [minZoom, maxZoom].
 * When at Fit the next zoom is center-anchored (pan reset to 0).
 */
export function zoomStep(zoom: number, step: number, minZoom = 0.05, maxZoom = 4): number {
  return Math.max(minZoom, Math.min(maxZoom, zoom * step));
}
