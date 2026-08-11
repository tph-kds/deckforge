/**
 * export/geometry.ts
 *
 * THE canonical slide-coordinate geometry layer (DeckForge architecture rule).
 *
 * SlideDocument owns logical width/height + element geometry in DOCUMENT
 * pixels. Everything else — editor zoom, pan, Fit, fullscreen, presenter
 * letterboxing, and the PPTX surface — is a VIEW or SERIALIZATION transform
 * and MUST NOT mutate document geometry.
 *
 * All pixel space exists in document coordinates. Conversions to PowerPoint
 * units are pure, ratio-based, aspect-preserving functions centralised here so
 * no individual exporter can invent its own coordinate mapping.
 *
 * Invariant:   docW / docH  ===  pptxW / pptxH
 */

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Aspect ratio width/height. */
export function aspectOf(width: number, height: number): number {
  if (!isFinite(width) || !isFinite(height) || height <= 0) return NaN;
  return width / height;
}

/** True when two rectangles have the same aspect ratio within tolerance. */
export function aspectMatches(
  w1: number,
  h1: number,
  w2: number,
  h2: number,
  tolerance = 1e-6,
): boolean {
  const a = aspectOf(w1, h1);
  const b = aspectOf(w2, h2);
  if (!isFinite(a) || !isFinite(b)) return false;
  return Math.abs(a - b) <= tolerance;
}

/**
 * Derive a PowerPoint slide size (inches) that PRESERVES the document aspect
 * ratio for any canvas resolution. `pxPerInch` fixes the physical density but
 * never the aspect ratio: PPTX width is proportional to document pixel width
 * and height follows from the aspect, so element geometry stays visually
 * equivalent whether the canvas is 1600x900, 1920x1080, or 1920x800.
 *
 * Previously the exporter forced 13.333"x7.5" whenever the canvas was labelled
 * "16:9", which silently distorted any canvas whose real pixels were not
 * exactly 16:9. This function is the single source of truth instead.
 */
export function derivePptxSlideSize(
  documentWidthPx: number,
  documentHeightPx: number,
  pxPerInch = 120,
): Size {
  const safeW = sanitizeDimension(documentWidthPx, 1600);
  const safeH = sanitizeDimension(documentHeightPx, 900);
  const width = safeW / pxPerInch;
  const height = safeH / pxPerInch;
  return { width, height };
}

/**
 * Map a document-coordinate rect into a PPTX rect (inches) by pure ratios
 * (Phase 5). When aspect ratios match this is visually equivalent to the
 * browser layout. Never falls back to (0,0): use validateFrame first.
 */
export function documentRectToPptxRect(
  source: Pick<Rect, 'x' | 'y' | 'w' | 'h'>,
  documentWidthPx: number,
  documentHeightPx: number,
  pptxWidthInches: number,
  pptxHeightInches: number,
): Rect {
  const xRatio = source.x / documentWidthPx;
  const yRatio = source.y / documentHeightPx;
  const wRatio = source.w / documentWidthPx;
  const hRatio = source.h / documentHeightPx;
  return {
    x: xRatio * pptxWidthInches,
    y: yRatio * pptxHeightInches,
    w: wRatio * pptxWidthInches,
    h: hRatio * pptxHeightInches,
  };
}

/**
 * Convert one document-pixel dimension to PPTX inches, proportional to the
 * owning axis of the slide (deterministic; Phase 5/7).
 */
export function documentUnitToPptxInches(
  px: number,
  documentDimensionPx: number,
  pptxDimensionInches: number,
): number {
  if (!isFinite(documentDimensionPx) || documentDimensionPx <= 0) return 0;
  return (px / documentDimensionPx) * pptxDimensionInches;
}

/**
 * Convert a browser (document-pixel) font size to PowerPoint points so that
 * text scales with the slide (Phase 7). At matching aspect ratios this keeps
 * the type exactly proportional to the browser layout instead of using
 * unrelated hard-coded PPT sizes.
 */
export function browserFontSizeToPptPt(
  fontSizePx: number,
  documentHeightPx: number,
  pptxHeightInches: number,
): number {
  if (!isFinite(fontSizePx) || fontSizePx <= 0) return 11;
  const ptPerPx = (pptxHeightInches * 72) / documentHeightPx;
  return Math.round(fontSizePx * ptPerPx * 100) / 100;
}

/** Clamp a container-query based font size (mirrors browser clamp() rules). */
export function fontSizeFromCqw(
  factor: number,
  minPx: number,
  maxPx: number,
  containerWidthPx: number,
): number {
  const raw = factor * (containerWidthPx / 100);
  return Math.min(maxPx, Math.max(minPx, raw));
}

function sanitizeDimension(value: number, fallback: number): number {
  return isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Validate a frame before it is exported. Returns a list of human-readable
 * errors. MISSING geometry is distinguished from a legitimate 0 coordinate:
 * an explicit x=0 is valid; an undefined/NaN/negative/zero-size frame is not
 * and must never be silently placed at the top-left corner.
 */
export function validateFrame(
  source: Partial<Pick<Rect, 'x' | 'y' | 'w' | 'h'>>,
  options?: { allowOutside?: boolean },
): string[] {
  const errors: string[] = [];
  for (const key of ['x', 'y', 'w', 'h'] as const) {
    const value = source[key];
    if (value === undefined) {
      errors.push(`missing "${key}"`);
      continue;
    }
    if (typeof value !== 'number' || !isFinite(value)) {
      errors.push(`"${key}" is not a finite number`);
      continue;
    }
    if ((key === 'w' || key === 'h') && value <= 0) {
      errors.push(`"${key}" must be > 0 (got ${value})`);
    }
    if ((key === 'x' || key === 'y') && value < 0) {
      errors.push(`"${key}" must be >= 0 (got ${value})`);
    }
  }
  return errors;
}

/** Full validation of a rect against the document bounds (Phase 16 diagnostics). */
export function validateRectWithinSlide(
  rect: Partial<Pick<Rect, 'x' | 'y' | 'w' | 'h'>>,
  documentWidthPx: number,
  documentHeightPx: number,
  tolerance = 1,
): string[] {
  const errors = validateFrame(rect);
  if (errors.length) return errors;
  const { x = 0, y = 0, w = 0, h = 0 } = rect as Rect;
  if (x + w > documentWidthPx + tolerance) {
    errors.push(`rect exceeds slide width (x+w=${x + w} > ${documentWidthPx})`);
  }
  if (y + h > documentHeightPx + tolerance) {
    errors.push(`rect exceeds slide height (y+h=${y + h} > ${documentHeightPx})`);
  }
  return errors;
}

/** True when a rect is valid enough to be placed (never false-negatives). */
export function isUsableFrame(source: Partial<Pick<Rect, 'x' | 'y' | 'w' | 'h'>>): boolean {
  return validateFrame(source).length === 0;
}