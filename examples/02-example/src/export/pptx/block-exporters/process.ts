// export/pptx/block-exporters/process.ts
//
// Native PPTX export for `process` blocks. A process is rendered as editable
// PowerPoint shapes with real text runs — never a screenshot. The layout is the
// web renderer's vertical numbered list (render/BlockRenderer.tsx ProcessBlock +
// styles.css `.block-process`):
//
//   01  <title>            <- code-font index, bold, secondary color
//       <detail>           <- muted detail below the title
//
//   process node    -> editable text rows stacked vertically inside the frame
//   step index      -> its own "01".."0N" column on the left
//   node title/body -> styled text runs (bold title + muted detail)
//
// The old horizontal "card row + right-arrow connectors" layout was removed
// because it did not match the webapp; connectors would have to be re-added
// only if a future web design uses them. Fallback hierarchy honoured:
// 1) native editable primitives, 2) SVG, 3) raster, 4) fatal only when the
// source content itself is unavailable. A missing frame is a geometry error and
// returns "unsupported" — never a (0,0) placeholder.

import type {
  ExportIssue,
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import { resolveTheme, hexToPptx } from "../../resolved-theme";
import {
  browserTypographyFor,
  exportFrameOf,
  fontSizeToPpt,
  frameErrorIssue,
  pptFontFor,
} from "../export-utils";
import { fontSizeFromCqw } from "../../geometry";
import type { Block } from "../../../deck/types";

interface ProcessStepContent {
  title?: unknown;
  detail?: unknown;
}

interface ProcessContent {
  steps?: ProcessStepContent[];
}

const INDEX_GLYPH_FACTOR = 1.1;
const BODY_GAP_PX = 12.8;
const ROW_GAP_PX = 11.2;
const INDEX_TOP_PAD_PX = 3.2;

function stepTitle(step: ProcessStepContent | undefined, index: number): string {
  if (!step) return `Step ${index + 1}`;
  const title = typeof step.title === "string" ? step.title : "";
  return title || `Step ${index + 1}`;
}

function stepDetail(step: ProcessStepContent | undefined): string {
  return typeof step?.detail === "string" ? step.detail : "";
}

async function exportProcessBlock(
  block: unknown,
  ctx: PptxExportContext,
): Promise<PptxBlockExport> {
  const processBlock = block as Block;
  const frame = exportFrameOf(processBlock);
  const issues: ExportIssue[] = [];
  if (!frame) {
    return {
      status: "unsupported",
      issues: [frameErrorIssue(processBlock.id, "process blocks require a resolved frame")],
    };
  }

  const theme = resolveTheme(ctx.deck);
  const content = processBlock.content as ProcessContent | undefined;
  const steps = Array.isArray(content?.steps) ? content.steps : [];

  const elements: PptxSlideElement[] = [];
  const bodyFont = pptFontFor(theme.typography.bodyFont, ctx);
  const codeFont = pptFontFor(theme.typography.codeFont, ctx);
  const typography = browserTypographyFor(processBlock, frame.w);

  // Web `.process-step` typography: index < title > detail. Each size is an
  // independent cqw clamp from styles.css (not derived from the title):
  //  title -> clamp(13px,1.6cqw,18px), index -> clamp(11px,1.4cqw,15px),
  //  detail -> clamp(12px,1.5cqw,16px).
  const titlePx = typography.fontSizePx;
  const clampCqw = (factor: number, min: number, max: number): number =>
    Math.round(fontSizeFromCqw(factor, min, max, frame.w) * 100) / 100;
  const detailPx = clampCqw(1.5, 12, 16);
  const indexPx = clampCqw(1.4, 11, 15);
  const titlePt = fontSizeToPpt(titlePx, ctx);
  const detailPt = fontSizeToPpt(detailPx, ctx);
  const indexPt = fontSizeToPpt(indexPx, ctx);

  if (steps.length === 0) {
    // Content present but no steps: still preserve the block as an editable
    // text shape rather than silently dropping it.
    const fallbackText =
      typeof processBlock.content === "string"
        ? processBlock.content
        : processBlock.alt || "Process";
    elements.push({
      type: "text",
      elementId: processBlock.id,
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      data: {
        text: fallbackText,
        options: {
          fontFace: bodyFont,
          fontSize: titlePt,
          bold: true,
          color: hexToPptx(theme.tokens.foreground),
          align: "left",
          valign: "top",
          wrap: true,
          breakLine: true,
          autoFit: false,
          margin: 0,
        },
      },
    });
  } else {
    // Web `.block-process` is a flex column at natural height, packed from the
    // top (no frame-filling stretch): rows stack with `gap: 0.7em` (11.2px)
    // and each row is a flex row with `gap: 0.8em` (12.8px) between the index
    // glyphs and the body. The index has `padding-top: 0.2em` (3.2px).
    const indexW = indexPx * INDEX_GLYPH_FACTOR;
    const bodyX = frame.x + indexW + BODY_GAP_PX;
    const bodyW = Math.max(40, frame.w - indexW - BODY_GAP_PX);
    const lineH = (px: number) => px * typography.lineHeight;
    let y = frame.y;

    for (let i = 0; i < steps.length; i++) {
      const title = stepTitle(steps[i], i);
      const detail = stepDetail(steps[i]);
      const titleH = lineH(titlePx);
      const detailH = detail ? lineH(detailPx) : 0;
      const rowH = Math.max(lineH(indexPx), titleH + detailH);

      // Index column: "01".."0N" in the code font, bold, secondary color.
      elements.push({
        type: "text",
        elementId: processBlock.id,
        x: frame.x,
        y: y + INDEX_TOP_PAD_PX,
        w: indexW,
        h: rowH,
        data: {
          text: String(i + 1).padStart(2, "0"),
          options: {
            fontFace: codeFont,
            fontSize: indexPt,
            bold: true,
            color: hexToPptx(theme.tokens.secondary),
            align: "left",
            valign: "top",
            wrap: true,
            breakLine: true,
            autoFit: false,
            margin: 0,
            lineSpacingMultiple: typography.lineHeight,
          },
        },
      });

      // Body: bold title run, then a muted detail run on the next line.
      const runs: Array<{ text: string; options: Record<string, unknown> }> = [
        {
          text: title,
          options: {
            fontFace: bodyFont,
            fontSize: titlePt,
            bold: true,
            color: hexToPptx(theme.tokens.foreground),
          },
        },
      ];
      if (detail) {
        runs.push({
          text: detail,
          options: {
            fontFace: bodyFont,
            fontSize: detailPt,
            bold: false,
            color: hexToPptx(theme.tokens.muted),
            breakLine: true,
          },
        });
      }

      elements.push({
        type: "text",
        elementId: processBlock.id,
        x: bodyX,
        y,
        w: bodyW,
        h: rowH,
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
      });

      y += rowH + ROW_GAP_PX;
    }
  }

  return {
    status: "native",
    issues,
    element: elements[0],
    elements,
  };
}

export const processBlockExporter: PptxBlockExporter = {
  type: "process",
  exportability: "native-editable",
  export: exportProcessBlock,
};
