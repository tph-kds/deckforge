// export/pptx/block-exporters/text.ts
//
// PPTX text exporter that uses the resolved theme for colors and fonts.
// This ensures typography parity between web and PPTX.

import type {
  ExportIssue,
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import {
  browserTypographyFor,
  estimateTextHeightPx,
  exportFrameOf,
  fontSizeToPpt,
  frameErrorIssue,
  pptFontFor,
  type BrowserTypography,
} from "../export-utils";
import { resolveTheme, hexToPptx } from "../../resolved-theme";
import type { Block } from "../../../deck/types";

const MAX_TEXT_LENGTH = 4000;

interface BlockLike {
  id: string;
  type: string;
}

/** Text content arrived as a plain string, array of lines, or {text|value}. */
function stringContent(block: { content?: unknown }): string {
  if (typeof block.content === "string") return block.content;
  if (Array.isArray(block.content)) {
    return block.content.filter((item): item is string => typeof item === "string").join("\n");
  }
  if (block.content && typeof block.content === "object") {
    const obj = block.content as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.value === "string") return obj.value;
    if (obj.label && typeof obj.label === "string") return obj.label;
  }
  return "";
}

/**
 * Map a web letter-spacing (em units) to PPTX charSpacing (points), using the
 * exact same document-px -> point conversion as fontSizeToPpt so the exported
 * tracking matches the browser proportionally.
 */
function charSpacingOf(
  typography: BrowserTypography,
  fontPx: number,
  ctx: PptxExportContext,
): number | undefined {
  const em = typography.letterSpacingEm ?? 0;
  if (!em) return undefined;
  const sign = em < 0 ? -1 : 1;
  return Math.round(fontSizeToPpt(fontPx * Math.abs(em), ctx) * sign * 100) / 100;
}

/**
 * Resolve a text block into a PPTX text element with geometry and typography
 * DERIVED from the document (Phase 5/7). Never default-features a missing
 * frame to (0,0): a frame-less block is a geometry error, not an invisible
 * top-left text box.
 */
function buildTextElement(
  text: string,
  block: unknown,
  ctx: PptxExportContext,
  containerWidthPx: number,
  extra: Record<string, unknown> = {},
): PptxSlideElement | null {
  const frame = exportFrameOf(block as Block);
  if (!frame) return null;

  const b = block as Block;
  const typography = browserTypographyFor(b, containerWidthPx > 0 ? containerWidthPx : frame.w);
  const fontPx = (extra.fontSizePx as number) ?? typography.fontSizePx;
  const fontSizePt = fontSizeToPpt(fontPx, ctx);

  // Use resolved theme for colors and fonts
  const theme = resolveTheme(ctx.deck);
  const explicitFont = (b as { fontFamily?: string }).fontFamily ?? "";
  // Headings and the metric value render in the theme heading font on the web
  // (BlockRenderer styleFrom + styles.css), so they must not use the body font.
  const isHeadingLike = b.type === "heading" || b.type === "metric";
  const webFont = explicitFont || (isHeadingLike ? theme.typography.headingFont : theme.typography.bodyFont);
  const fontFace = pptFontFor(webFont, ctx);

  const style = b.style ?? {};
  const align = (extra.textAlign as string) ?? (style as { align?: string }).align ?? "left";
  const valign = (extra.valign as string) ?? "top";

  // Resolve color from theme tokens (web truth = styles.css):
  //  - citations are explicitly muted (`.block-citation`).
  //  - the meta variant is foreground at 75% opacity; muted approximates it.
  //  - callouts and kickers inherit the base foreground color.
  let color = theme.tokens.foreground;
  if (b.type === "citation") {
    color = theme.tokens.muted;
  } else if (style.variant === "meta") {
    color = theme.tokens.muted;
  }

  const charSpacing = charSpacingOf(typography, fontPx, ctx);
  const options: Record<string, unknown> = {
    fontFace,
    fontSize: fontSizePt,
    bold: (extra.bold as boolean) ?? typography.bold,
    italic: (extra.italic as boolean) ?? typography.italic,
    color: hexToPptx(color),
    align,
    valign,
    wrap: true,
    breakLine: true,
    autoFit: false,
    margin: 0,
    lineSpacingMultiple: typography.lineHeight,
    breakMustFit: true,
  };
  if (charSpacing !== undefined) options.charSpacing = charSpacing;

  // Kicker blocks render `text-transform: uppercase` on the web (styleFrom);
  // the exported text must carry the same casing.
  const outText = style.variant === "kicker" ? text.toUpperCase() : text;

  return {
    type: "text",
    elementId: b.id,
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    data: {
      text: outText,
      options,
    },
  };
}

function frameIssueIfMissing(block: BlockLike): ExportIssue | null {
  const frame = exportFrameOf(block as Block);
  if (frame) return null;
  return frameErrorIssue(block.id, "text blocks require a resolved frame");
}

async function exportTextBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const textBlock = block as BlockLike & { content?: unknown };
  const text = stringContent(textBlock);
  const issues: ExportIssue[] = [];
  const frame = exportFrameOf(block as Block);
  const containerWidth = frame?.w ?? ctx.slideWidth;

  const missing = frameIssueIfMissing(textBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  if (text.length > MAX_TEXT_LENGTH) {
    issues.push({
      code: "oversized-content",
      severity: "warning",
      message: `Text block contains ${text.length} characters; PowerPoint may truncate oversized content`,
      automaticFixAvailable: false,
    });
  }

  const element = buildTextElement(text, block, ctx, containerWidth, {
    textAlign: (block as { textAlign?: string }).textAlign,
  });

  return {
    status: element ? "native" : "unsupported",
    issues: element ? issues : [...issues, frameErrorIssue(textBlock.id, "could not resolve geometry")],
    element: element ?? undefined,
  };
}

async function exportBulletsBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const bulletsBlock = block as BlockLike & { content?: unknown };
  const lines = Array.isArray(bulletsBlock.content)
    ? bulletsBlock.content.filter((line): line is string => typeof line === "string")
    : [];
  const frame = exportFrameOf(bulletsBlock as Block);
  const missing = frameIssueIfMissing(bulletsBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  const b = bulletsBlock as Block;
  const typography = browserTypographyFor(b, frame?.w ?? ctx.slideWidth);
  const fontSizePt = fontSizeToPpt(typography.fontSizePx, ctx);
  const theme = resolveTheme(ctx.deck);
  const fontFace = pptFontFor(theme.typography.bodyFont, ctx);

  // Web truth (styles.css `.block-bullets`): flex column with `gap: 0.4em`
  // (6.4px at 16px) and `padding-left: 1.1em` (17.6px); `li::marker` uses the
  // theme secondary while the text stays foreground. The 16px font-size comes
  // from browserTypographyFor (the list inherits the body font). We reproduce
  // the padding by insetting the element, the inter-item gap with a paragraph
  // space-after on every line but the last, and the marker as a secondary run.
  const bulletColor = hexToPptx(theme.tokens.secondary);
  const textColor = hexToPptx(theme.tokens.foreground);
  const gapPt = fontSizeToPpt(6.4, ctx);
  const runs = lines.flatMap((line, index) => {
    const isLast = index === lines.length - 1;
    const runsForLine: Array<{ text: string; options: Record<string, unknown> }> = [
      { text: "•  ", options: { fontFace, fontSize: fontSizePt, bold: false, color: bulletColor } },
      {
        text: line,
        options: {
          fontFace,
          fontSize: fontSizePt,
          bold: false,
          color: textColor,
          ...(isLast ? {} : { paraSpaceAfter: gapPt }),
        },
      },
    ];
    if (!isLast) {
      runsForLine.push({ text: "", options: { fontFace, fontSize: fontSizePt, breakLine: true } });
    }
    return runsForLine;
  });

  const paddingLeftPx = 17.6;
  const element: PptxSlideElement = {
    type: "text",
    elementId: bulletsBlock.id,
    x: frame!.x + paddingLeftPx,
    y: frame!.y,
    w: Math.max(20, frame!.w - paddingLeftPx),
    h: frame!.h,
    data: {
      text: runs,
      options: {
        align: "left",
        valign: "top",
        wrap: true,
        breakLine: true,
        autoFit: false,
        margin: 0,
        lineSpacingMultiple: typography.lineHeight,
      },
    },
  };
  return {
    status: "native",
    issues: [],
    element,
  };
}

async function exportCalloutBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const calloutBlock = block as BlockLike & { content?: unknown };
  const frame = exportFrameOf(calloutBlock as Block);
  const missing = frameIssueIfMissing(calloutBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  const b = calloutBlock as Block;
  const theme = resolveTheme(ctx.deck);
  const typography = browserTypographyFor(b, frame?.w ?? ctx.slideWidth);
  const fontPx = typography.fontSizePx;

  // Web truth (styles.css `.block-callout`): a 3px secondary left border with
  // `padding: 0.4em 0 0.4em 0.8em` (top/bottom and left, right = 0) and top
  // text alignment. The paddings scale with the callout's own font-size.
  const borderW = 3;
  const padTop = 0.4 * fontPx;
  const padLeft = 0.8 * fontPx;

  const accentBar: PptxSlideElement = {
    type: "shape",
    elementId: calloutBlock.id,
    x: frame!.x,
    y: frame!.y,
    w: borderW,
    h: frame!.h,
    data: {
      shape: "rect",
      options: {
        fill: { color: hexToPptx(theme.tokens.secondary) },
        line: { color: hexToPptx(theme.tokens.secondary), width: 0 },
      },
    },
  };

  const textEl = buildTextElement(stringContent(calloutBlock), calloutBlock, ctx, frame?.w ?? ctx.slideWidth, {
    valign: "top",
  });
  if (!textEl) {
    return { status: "unsupported", issues: [frameErrorIssue(calloutBlock.id, "no geometry")] };
  }
  const insetEl: PptxSlideElement = {
    ...textEl,
    x: frame!.x + borderW + padLeft,
    y: frame!.y + padTop,
    w: Math.max(20, frame!.w - borderW - padLeft),
    h: Math.max(20, frame!.h - padTop * 2),
  };
  return {
    status: "native",
    issues: [],
    element: textEl,
    elements: [accentBar, insetEl],
  };
}

async function exportCitationBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const citationBlock = block as BlockLike & { content?: unknown };
  const frame = exportFrameOf(citationBlock as Block);
  const missing = frameIssueIfMissing(citationBlock);
  if (missing) return { status: "unsupported", issues: [missing] };
  const element = buildTextElement(stringContent(citationBlock), citationBlock, ctx, frame?.w ?? ctx.slideWidth, {});
  return {
    status: element ? "native" : "unsupported",
    issues: element ? [] : [frameErrorIssue(citationBlock.id, "no geometry")],
    element: element ?? undefined,
  };
}

async function exportMetricBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const metricBlock = block as BlockLike & {
    content?: { value?: unknown; label?: unknown; delta?: unknown };
  };
  const content = metricBlock.content;
  const value = typeof content?.value === "string" ? content.value : "";
  const label = typeof content?.label === "string" ? content.label : "";
  const delta = typeof content?.delta === "string" ? content.delta : "";
  const frame = exportFrameOf(metricBlock as Block);
  const missing = frameIssueIfMissing(metricBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  const b = metricBlock as Block;
  const theme = resolveTheme(ctx.deck);
  const headingFontFace = pptFontFor(theme.typography.headingFont, ctx);
  const bodyFontFace = pptFontFor(theme.typography.bodyFont, ctx);

  // Web truth (styles.css .block-metric):
  //  value -> heading font, clamp(64px,9cqw,128px), weight 400, primary, -0.03em
  //  label -> clamp(13px,1.8cqw,20px), muted, margin-top 0.4em (0.4 * label size)
  //  delta -> weight 700, clamp(12px,1.6cqw,17px), secondary, margin-top 0.5em
  const w = frame?.w ?? ctx.slideWidth;
  const valuePx = Math.min(128, Math.max(64, w * 0.09));
  const labelPx = Math.min(20, Math.max(13, w * 0.018));
  const deltaPx = Math.min(17, Math.max(12, w * 0.016));
  const valuePt = fontSizeToPpt(valuePx, ctx);
  const labelPt = fontSizeToPpt(labelPx, ctx);
  const deltaPt = fontSizeToPpt(deltaPx, ctx);
  const valueAfterPt = Math.round(fontSizeToPpt(0.4 * labelPx, ctx) * 100) / 100;
  const labelAfterPt = Math.round(fontSizeToPpt(0.5 * deltaPx, ctx) * 100) / 100;

  const runs: Array<{ text: string; options: Record<string, unknown> }> = [];
  if (value) {
    runs.push({
      text: value,
      options: {
        fontFace: headingFontFace,
        fontSize: valuePt,
        bold: false,
        color: hexToPptx(theme.tokens.primary),
        charSpacing: Math.round(fontSizeToPpt(valuePx * 0.03, ctx) * -100) / 100, // -0.03em
        paraSpaceAfter: valueAfterPt,
      },
    });
  }
  if (label) {
    runs.push({
      text: label,
      options: {
        fontFace: bodyFontFace,
        fontSize: labelPt,
        bold: false,
        color: hexToPptx(theme.tokens.muted),
        breakLine: true,
        paraSpaceAfter: labelAfterPt,
      },
    });
  }
  if (delta) {
    runs.push({
      text: delta,
      options: {
        fontFace: bodyFontFace,
        fontSize: deltaPt,
        bold: true,
        color: hexToPptx(theme.tokens.secondary),
        breakLine: true,
      },
    });
  }

  const element: PptxSlideElement = {
    type: "text",
    elementId: metricBlock.id,
    x: frame!.x,
    y: frame!.y,
    w: frame!.w,
    h: frame!.h,
    data: {
      text: runs,
      options: {
        align: "left",
        valign: "top",
        wrap: true,
        breakLine: true,
        autoFit: false,
        margin: 0,
      },
    },
  };
  return {
    status: "native",
    issues: [],
    element,
  };
}

export const textBlockExporter: PptxBlockExporter = {
  type: "text",
  exportability: "native-editable",
  export: exportTextBlock,
};

export const headingBlockExporter: PptxBlockExporter = {
  type: "heading",
  exportability: "native-editable",
  export: exportTextBlock,
};

export const bulletsBlockExporter: PptxBlockExporter = {
  type: "bullets",
  exportability: "native-editable",
  export: exportBulletsBlock,
};

export const calloutBlockExporter: PptxBlockExporter = {
  type: "callout",
  exportability: "native-editable",
  export: exportCalloutBlock,
};

export const citationBlockExporter: PptxBlockExporter = {
  type: "citation",
  exportability: "native-editable",
  export: exportCitationBlock,
};

export const metricBlockExporter: PptxBlockExporter = {
  type: "metric",
  exportability: "native-editable",
  export: exportMetricBlock,
};
