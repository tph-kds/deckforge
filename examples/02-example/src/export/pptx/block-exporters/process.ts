// export/pptx/block-exporters/process.ts
//
// Native PPTX export for `process` blocks (Phase 8). A process is rendered as
// editable PowerPoint shapes with real text runs — never a screenshot:
//
//   process node        -> rounded-rectangle PowerPoint shape
//   node title / body   -> editable PowerPoint text inside the shape
//   connections         -> right-arrow connector shapes between nodes
//   icons               -> unsupported here; steps carry text only (native
//                          primitives exist for every node, so no fallback is
//                          ever required unless the frame itself is missing)
//
// Fallback hierarchy honoured: 1) native editable primitives, 2) SVG,
// 3) raster, 4) fatal only when the source content itself is unavailable.
// A missing frame is a geometry error and returns "unsupported" — never a
// (0,0) placeholder.

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
import type { Block } from "../../../deck/types";

interface ProcessStepContent {
  title?: unknown;
  detail?: unknown;
}

interface ProcessContent {
  steps?: ProcessStepContent[];
}

const CONNECTOR_GAP = 16;

function stepTitle(step: ProcessStepContent | undefined, index: number): string {
  if (!step) return `Step ${index + 1}`;
  const title = typeof step.title === "string" ? step.title : "";
  const detail = typeof step.detail === "string" ? step.detail : "";
  return [title, detail].filter(Boolean).join("\n") || `Step ${index + 1}`;
}

/**
 * A process step is an editable TEXT shape: pptxgenjs only writes `<a:t>` runs
 * through `addText`, so text-bearing steps must be emitted as `text` elements
 * with a `shape: "roundRect"` option (which renders a rounded-rectangle
 * background). Plain `addShape` silently drops any `text` option.
 */
function buildStepShape(
  blockId: string,
  frame: { x: number; y: number; w: number; h: number },
  text: string,
  ctx: PptxExportContext,
  theme: ReturnType<typeof resolveTheme>,
  titleOnly = false,
): PptxSlideElement {
  const block = { type: "process", style: {} } as Block;
  const typography = browserTypographyFor(block, frame.w);
  const titleFontPx = titleOnly ? typography.fontSizePx * 1.15 : typography.fontSizePx;
  const fontFace = pptFontFor(theme.typography.bodyFont, ctx);

  return {
    type: "text",
    elementId: blockId,
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    data: {
      text,
      options: {
        shape: "roundRect",
        fill: { color: hexToPptx(theme.tokens.primary) },
        line: { color: hexToPptx(theme.tokens.primary), width: 1 },
        fontFace,
        fontSize: Math.max(9, fontSizeToPpt(titleFontPx, ctx)),
        bold: true,
        color: hexToPptx(theme.tokens.background),
        align: "center",
        valign: "middle",
        margin: 4,
        wrap: true,
        breakLine: true,
      },
    },
  };
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
  const gap = CONNECTOR_GAP;

  if (steps.length === 0) {
    // Content present but no steps: still preserve the block as an editable
    // shape rather than silently dropping it.
    elements.push(
      buildStepShape(
        processBlock.id,
        frame,
        typeof processBlock.content === "string"
          ? processBlock.content
          : processBlock.alt || "Process",
        ctx,
        theme,
      ),
    );
  } else if (steps.length === 1) {
    elements.push(
      buildStepShape(
        processBlock.id,
        frame,
        stepTitle(steps[0], 0),
        ctx,
        theme,
      ),
    );
  } else {
    const availableW = Math.max(1, frame.w - gap * (steps.length - 1));
    const stepW = Math.max(60, availableW / steps.length);
    const connectorW = Math.max(8, gap);
    const connectorH = Math.min(18, Math.max(6, frame.h * 0.18));

    for (let i = 0; i < steps.length; i++) {
      const x = frame.x + i * (stepW + gap);
      elements.push(
        buildStepShape(
          processBlock.id,
          { x, y: frame.y, w: stepW, h: frame.h },
          stepTitle(steps[i], i),
          ctx,
          theme,
        ),
      );
      if (i < steps.length - 1) {
        const connX = x + stepW + (gap - connectorW) / 2;
        elements.push({
          type: "shape",
          elementId: processBlock.id,
          x: connX,
          y: frame.y + (frame.h - connectorH) / 2,
          w: connectorW,
          h: connectorH,
          data: {
            shape: "rightArrow",
            options: {
              fill: { color: hexToPptx(theme.tokens.muted) },
              line: { color: hexToPptx(theme.tokens.muted), width: 0 },
            },
          },
        });
      }
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
