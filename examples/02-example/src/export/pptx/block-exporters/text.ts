// export/pptx/block-exporters/text.ts

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
} from "../export-utils";
import { getTheme } from "../../../deck/themes";
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
  const bodyFont = (b as { fontFamily?: string }).fontFamily ?? "";
  const theme = getTheme(ctx.deck.theme?.id ?? "editorial-cream");
  const webFont = bodyFont || theme.typography.bodyFont;
  const fontFace = pptFontFor(webFont, ctx);

  const style = b.style ?? {};
  const align = (extra.textAlign as string) ?? (style as { align?: string }).align ?? "left";
  const valign = (extra.valign as string) ?? "top";

  return {
    type: "text",
    elementId: b.id,
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    data: {
      text,
      options: {
        fontFace,
        fontSize: fontSizePt,
        bold: (extra.bold as boolean) ?? typography.bold,
        italic: (extra.italic as boolean) ?? typography.italic,
        color: (extra.color as string) ?? (theme.tokens?.foreground ?? "#0F172A").replace("#", ""),
        align,
        valign,
        wrap: true,
        breakLine: true,
        autoFit: false,
        margin: 0,
        lineSpacingMultiple: typography.lineHeight,
        breakMustFit: true,
      },
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
  const text = lines.map((line) => `• ${line}`).join("\n");
  const frame = exportFrameOf(bulletsBlock as Block);
  const missing = frameIssueIfMissing(bulletsBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  const element = buildTextElement(text, bulletsBlock, ctx, frame?.w ?? ctx.slideWidth, {});
  return {
    status: element ? "native" : "unsupported",
    issues: element ? [] : [frameErrorIssue(bulletsBlock.id, "no geometry")],
    element: element ?? undefined,
  };
}

async function exportCalloutBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const calloutBlock = block as BlockLike & { content?: unknown };
  const frame = exportFrameOf(calloutBlock as Block);
  const missing = frameIssueIfMissing(calloutBlock);
  if (missing) return { status: "unsupported", issues: [missing] };
  const element = buildTextElement(stringContent(calloutBlock), calloutBlock, ctx, frame?.w ?? ctx.slideWidth, {
    bold: true,
    valign: "middle",
  });
  return {
    status: element ? "native" : "unsupported",
    issues: element ? [] : [frameErrorIssue(calloutBlock.id, "no geometry")],
    element: element ?? undefined,
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
  const text = [value, label, delta].filter(Boolean).join("\n");
  const frame = exportFrameOf(metricBlock as Block);
  const missing = frameIssueIfMissing(metricBlock);
  if (missing) return { status: "unsupported", issues: [missing] };

  const element = buildTextElement(text, metricBlock, ctx, frame?.w ?? ctx.slideWidth, {
    bold: true,
    valign: "middle",
  });
  return {
    status: element ? "native" : "unsupported",
    issues: element ? [] : [frameErrorIssue(metricBlock.id, "no geometry")],
    element: element ?? undefined,
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