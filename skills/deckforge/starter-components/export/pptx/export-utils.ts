// export/pptx/export-utils.ts
//
// Shared, purely-derived helpers for the PPTX block exporters so no single
// exporter can invent its own coordinate or font conversion (Phases 5/7/10).
//
// RULES enforced here:
//  - Geometry comes ONLY from the resolved document frame. Missing/malformed
//    frames are errors, never silently placed at (0,0).
//  - Font sizes are derived from the browser (document) typography and mapped
//    to PPT points via the geometry layer.

import type { ExportIssue, PptxExportContext } from "../export-types";
import type { Block } from "../../deck/types";
import {
  browserFontSizeToPptPt,
  fontSizeFromCqw,
  isUsableFrame,
  validateFrame,
  type Rect,
} from "../geometry";
import { resolvePptxFont } from "./pptx-fonts";

/** Extract an element rect from a resolved block frame; undefined when invalid. */
export function exportFrameOf(block: Block): Rect | undefined {
  // Prefer the resolved frame (canonical geometry pipeline) over the raw
  // persisted frame so slot/flow blocks always export at their real location.
  const frame = block.resolvedFrame ?? block.frame;
  if (!frame) return undefined;
  const rect = { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
  return isUsableFrame(rect) ? rect : undefined;
}

const FRAME_ERROR_CODES = new Set([
  "missing-frame",
]);

export function frameErrorIssue(blockId: string, detail: string): ExportIssue {
  return {
    code: "block-export-failed",
    severity: "error",
    message: `Block "${blockId}" has invalid geometry: ${detail}. The block was not exported.`,
    suggestedFix: "Give the block a valid frame (x, y, w > 0, h > 0) in the editor",
    automaticFixAvailable: false,
  };
}

/** Full geometry validation errors for a block frame (used for diagnostics). */
export function frameValidation(block: Block): string[] {
  const frame = block.frame;
  if (!frame) return ["missing frame"];
  return validateFrame({ x: frame.x, y: frame.y, w: frame.w, h: frame.h });
}

/** Text block type -> base styling that mirrors render/BlockRenderer.tsx. */
export interface BrowserTypography {
  fontSizePx: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  letterSpacingEm?: number;
}

const clamp = fontSizeFromCqw;

function clampTo(width: number, factor: number, min: number, max: number): number {
  return Math.round(clamp(factor, min, max, width) * 100) / 100;
}

/**
 * Resolve the browser-equivalent typography for a block given its rendered
 * container width (in document pixels). Kept in sync with BlockRenderer/styles:
 * a block must look the same on the exported slide as in the browser.
 */
export function browserTypographyFor(block: Block, containerWidthPx: number): BrowserTypography {
  const style = block.style ?? {};
  const variant = typeof style.variant === "string" ? style.variant : "";
  const level = typeof style.level === "number" ? style.level : 3;
  const w = containerWidthPx > 0 ? containerWidthPx : 1;

  switch (block.type) {
    case "heading":
      if (level === 1) {
        return {
          fontSizePx: clampTo(w, 4.2, 34, 52),
          lineHeight: 1.05,
          bold: false,
          italic: false,
          letterSpacingEm: -0.02,
        };
      }
      // All headings render as <h2> on the web (BlockRenderer), and h2 keeps
      // the browser default font-weight: bold. Only level 1 overrides weight
      // to 400, so every other level is bold.
      return { fontSizePx: 24, lineHeight: 1.25, bold: true, italic: false };
    case "caption":
      return { fontSizePx: 13, lineHeight: 1.5, bold: true, italic: false };
    case "bullets":
      // `.block-bullets` inherits the 16px body font-size (styles.css has no
      // font-size on the list), so lines are 16px with a normal ~1.2 line box.
      return { fontSizePx: 16, lineHeight: 1.2, bold: false, italic: false };
    case "citation":
      // `.block-citation` sets no font-style, so citations are NOT italic.
      return { fontSizePx: clampTo(w, 1.2, 10, 13), lineHeight: 1.5, bold: false, italic: false };
    case "callout":
      return { fontSizePx: clampTo(w, 1.7, 14, 19), lineHeight: 1.5, bold: false, italic: true };
    case "metric":
      return { fontSizePx: clampTo(w, 9, 64, 128), lineHeight: 1.0, bold: true, italic: false };
    case "process":
      return { fontSizePx: clampTo(w, 1.6, 13, 18), lineHeight: 1.4, bold: true, italic: false };
    default:
      if (variant === "kicker") return { fontSizePx: 12, lineHeight: 1.4, bold: true, italic: false, letterSpacingEm: 0.14 };
      if (variant === "meta") return { fontSizePx: 13, lineHeight: 1.5, bold: false, italic: false };
      if (variant === "caption") return { fontSizePx: 13, lineHeight: 1.5, bold: true, italic: false };
      // Inline variant (BlockRenderer styleFrom) fixes 15px; the `.block-callout`
      // class clamps instead — that branch is handled by the "callout" case above.
      if (variant === "callout") return { fontSizePx: 15, lineHeight: 1.5, bold: false, italic: true };
      return { fontSizePx: clampTo(w, 1.6, 14, 20), lineHeight: 1.55, bold: false, italic: false };
  }
}

/** Convert a browser font size (px, document units) to PPT points. */
export function fontSizeToPpt(fontSizePx: number, ctx: PptxExportContext): number {
  return browserFontSizeToPptPt(fontSizePx, ctx.slideHeight, ctx.pptxHeight);
}

/** Resolve the PPT-safe font family for a web font name. */
export function pptFontFor(webFont: string | undefined, ctx: PptxExportContext): string {
  const resolved = resolvePptxFont(webFont ?? "Arial");
  if (webFont && resolved !== webFont) {
    ctx.fontWarnings.push({
      fontFamily: webFont,
      substituteFont: resolved,
    });
  }
  return resolved;
}

/** Shared baseline text frame options (margins disabled, no autofit surprises). */
export function textFrameOptions(
  base: Record<string, unknown>,
  ctx: PptxExportContext,
): Record<string, unknown> {
  return {
    margin: 0,
    wrap: true,
    breakLine: true,
    autoFit: false,
    ...base,
  };
}

/** Estimate a text-height-in-document-px heuristic (mirrors measure.ts). */
export function estimateTextHeightPx(text: string, fontSizePx: number, widthPx: number): number {
  const charsPerLine = Math.max(8, Math.floor(widthPx / (fontSizePx * 0.5)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return Math.ceil(lines * fontSizePx * 1.5) + (fontSizePx * 0.4);
}

export { FRAME_ERROR_CODES };