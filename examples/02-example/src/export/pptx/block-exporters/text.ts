import type {
  ExportIssue,
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import { checkFontCompatibility } from "../pptx-fonts";

const MAX_TEXT_LENGTH = 4000;

interface BlockGeometry {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  frame?: { x?: number; y?: number; w?: number; h?: number };
}

interface TextBlock extends BlockGeometry {
  id: string;
  type: "text" | "heading";
  content?: unknown;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
}

function geometry(block: BlockGeometry, ctx: PptxExportContext, defaultW: number, defaultH: number) {
  return {
    x: block.x ?? block.frame?.x ?? 0,
    y: block.y ?? block.frame?.y ?? 0,
    w: block.w ?? block.frame?.w ?? defaultW,
    h: block.h ?? block.frame?.h ?? defaultH,
  };
}

function textElement(
  text: string,
  block: BlockGeometry,
  ctx: PptxExportContext,
  options: Record<string, unknown> = {}
): PptxSlideElement {
  return {
    type: "text",
    ...geometry(block, ctx, ctx.slideWidth * 0.8, 1),
    data: { text, options },
  };
}

function stringContent(block: { content?: unknown }): string {
  return typeof block.content === "string" ? block.content : "";
}

async function exportTextBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const textBlock = block as TextBlock;
  const text = stringContent(textBlock);
  const fontFamily = textBlock.fontFamily ?? "Arial";
  const issues: ExportIssue[] = [];

  const fontWarning = checkFontCompatibility(fontFamily);
  if (fontWarning) {
    ctx.fontWarnings.push(fontWarning);
    issues.push({
      code: "missing-font",
      severity: "warning",
      message: `Font "${fontFamily}" is not a PowerPoint-safe font and may be substituted with ${fontWarning.substituteFont}`,
      suggestedFix: `Use a PPTX-safe font like ${fontWarning.substituteFont}`,
      automaticFixAvailable: false,
    });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    issues.push({
      code: "oversized-content",
      severity: "warning",
      message: `Text block contains ${text.length} characters; PowerPoint may truncate oversized content`,
      automaticFixAvailable: false,
    });
  }

  return {
    status: "native",
    issues,
    element: textElement(text, textBlock, ctx, {
      fontFace: fontFamily,
      fontSize: textBlock.fontSize ?? 18,
      bold: textBlock.fontWeight === "bold",
      color: textBlock.color?.replace("#", "") ?? "000000",
      align: textBlock.textAlign ?? "left",
      valign: "top",
      wrap: true,
    }),
  };
}

async function exportBulletsBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const bulletsBlock = block as BlockGeometry & { content?: unknown };
  const lines = Array.isArray(bulletsBlock.content)
    ? bulletsBlock.content.filter((line): line is string => typeof line === "string")
    : [];
  const text = lines.map((line) => `• ${line}`).join("\n");

  return {
    status: "native",
    issues: [],
    element: textElement(text, bulletsBlock, ctx, {
      fontFace: "Arial",
      fontSize: 16,
      color: "333333",
      align: "left",
      valign: "top",
      wrap: true,
    }),
  };
}

async function exportCalloutBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const calloutBlock = block as BlockGeometry & { content?: unknown };
  return {
    status: "native",
    issues: [],
    element: textElement(stringContent(calloutBlock), calloutBlock, ctx, {
      fontFace: "Arial",
      fontSize: 18,
      bold: true,
      color: "1F2937",
      align: "left",
      valign: "middle",
      wrap: true,
    }),
  };
}

async function exportCitationBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const citationBlock = block as BlockGeometry & { content?: unknown };
  return {
    status: "native",
    issues: [],
    element: textElement(stringContent(citationBlock), citationBlock, ctx, {
      fontFace: "Arial",
      fontSize: 12,
      italic: true,
      color: "6B7280",
      align: "left",
      valign: "top",
      wrap: true,
    }),
  };
}

async function exportMetricBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const metricBlock = block as BlockGeometry & {
    content?: { value?: unknown; label?: unknown; delta?: unknown };
  };
  const content = metricBlock.content;
  const value = typeof content?.value === "string" ? content.value : "";
  const label = typeof content?.label === "string" ? content.label : "";
  const delta = typeof content?.delta === "string" ? content.delta : "";
  const text = [value, label, delta].filter(Boolean).join("\n");

  return {
    status: "native",
    issues: [],
    element: textElement(text, metricBlock, ctx, {
      fontFace: "Arial",
      fontSize: 24,
      bold: true,
      color: "111827",
      align: "left",
      valign: "middle",
      wrap: true,
    }),
  };
}

async function exportProcessBlock(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
  const processBlock = block as BlockGeometry & {
    content?: { steps?: Array<{ title?: unknown; detail?: unknown }> };
  };
  const steps = processBlock.content?.steps ?? [];
  const text = steps
    .map((step, index) => `${index + 1}. ${typeof step.title === "string" ? step.title : ""}`)
    .join("\n");

  return {
    status: "substituted",
    issues: [
      {
        code: "unsupported-block",
        severity: "warning",
        message: "Process diagram exported as a simplified numbered text list; step details are not preserved",
        suggestedFix: "Split the process into individual text/heading blocks for full fidelity",
        automaticFixAvailable: false,
      },
    ],
    element: textElement(text, processBlock, ctx, {
      fontFace: "Arial",
      fontSize: 14,
      color: "333333",
      align: "left",
      valign: "top",
      wrap: true,
    }),
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

export const processBlockExporter: PptxBlockExporter = {
  type: "process",
  exportability: "image-only",
  export: exportProcessBlock,
};
