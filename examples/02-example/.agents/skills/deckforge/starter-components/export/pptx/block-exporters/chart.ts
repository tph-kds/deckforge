// export/pptx/block-exporters/chart.ts
//
// PPTX chart exporter that consumes the canonical ResolvedChartSpec from the
// snapshot resolver. Charts are exported as vector SVG images rendered from the
// SAME layout engine the web presenter uses (`renderChartToSvg`), placed at the
// full block frame — the web chart is an <svg viewBox="0 0 560 300"> filling the
// frame, so an embedded copy is pixel-identical.
//
// Native PowerPoint charts are deliberately NOT used: pptxgenjs/PowerPoint
// cannot reproduce the web chart's per-bar highlight color, exact plot-area
// geometry (no plot-margin API), the solid baseline under dashed gridlines, or
// the top-down category order of horizontal bars. The SVG is the only path that
// is 100% faithful to the web.

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import type { Block, ChartContent } from "../../../deck/types";
import { chartSpecFromContent } from "../../../deck/chart-spec";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { ResolvedChartSpec } from "../../snapshot";
import { resolveChartSpecForBlock } from "../../snapshot";
import { renderChartToSvg } from "../../fidelity/svg/svg-chart";

/**
 * The web chart SVG has a fixed 560x300 viewBox letterboxed inside its block
 * frame (preserveAspectRatio meet). The exported element is the largest 560:300
 * box that fits in the frame, centered — the visible drawing region.
 */
const CHART_ASPECT = 560 / 300;

function chartContainedFrame(frame: { x: number; y: number; w: number; h: number }): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const frameAspect = frame.w / frame.h;
  let w = frame.w;
  let h = frame.h;
  if (frameAspect > CHART_ASPECT) {
    w = frame.h * CHART_ASPECT;
  } else {
    h = frame.w / CHART_ASPECT;
  }
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
}

/** A chart data point that is definitely well-formed enough to export. */
function hasRealChartData(content: ChartContent | undefined): boolean {
  return Array.isArray(content?.values) && content.values.length > 0;
}

export const chartBlockExporter: PptxBlockExporter = {
  type: "chart",
  exportability: "hybrid-rasterized",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const chartBlock = block as Block;
    const frame = exportFrameOf(chartBlock);

    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(chartBlock.id, "chart blocks require a resolved frame")],
      };
    }

    const content = chartBlock.content as ChartContent | undefined;

    // A "New chart" template block has no real content yet: never export it as
    // a genuine chart with placeholder values (A=40, B=60).
    if (content?.isTemplate) {
      return {
        status: "skipped",
        issues: [
          {
            code: "template-chart-skipped",
            severity: "warning",
            message: `Chart block "${chartBlock.id}" is an unconfigured "New chart" template and was not exported`,
            suggestedFix: "Edit the chart to add real data before exporting",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    // Malformed data (a non-array "values") is a hard error: the block is a
    // source chart but cannot produce a semantic chart. This must never fall
    // through to a default chart with placeholder data.
    if (content && !Array.isArray(content.values)) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "chart-no-data",
            severity: "error",
            message: `Chart block "${chartBlock.id}" has malformed data (expected an array of {label, value}) and was not exported`,
            suggestedFix: "Give the chart a valid values array",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    if (!hasRealChartData(content)) {
      return {
        status: "skipped",
        issues: [
          {
            code: "chart-no-data",
            severity: "warning",
            message: `Chart block "${chartBlock.id}" has no data values and was skipped`,
            suggestedFix: "Add data values to the chart",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    // ── Canonical spec: THE single source of truth for data + colors. ──────
    const chartSpec: ResolvedChartSpec | undefined = resolveChartSpecForBlock(ctx.deck, chartBlock);
    if (!chartSpec) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "chart-no-data",
            severity: "error",
            message: `Chart block "${chartBlock.id}" could not be resolved into a semantic chart`,
            suggestedFix: "Verify the chart has a valid type, values, and labels",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    // Data parity invariant: the exported spec MUST be the exact content data.
    const sourceValues = content!.values;
    if (chartSpec.categories.length !== sourceValues.length) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "chart-data-mismatch",
            severity: "error",
            message: `Chart block "${chartBlock.id}" has data mismatch: ${chartSpec.categories.length} categories in spec vs ${sourceValues.length} in source`,
            suggestedFix: "Verify chart data integrity",
            automaticFixAvailable: false,
          },
        ],
      };
    }
    for (let i = 0; i < sourceValues.length; i++) {
      if (chartSpec.series[0]?.values[i] !== sourceValues[i].value) {
        return {
          status: "unsupported",
          issues: [
            {
              code: "chart-data-mismatch",
              severity: "error",
              message: `Chart block "${chartBlock.id}" value mismatch at index ${i}: expected ${sourceValues[i].value} but got ${chartSpec.series[0]?.values[i]}`,
              suggestedFix: "Verify chart data integrity",
              automaticFixAvailable: false,
            },
          ],
        };
      }
    }

// ── Render the EXACT web chart (same SVG the presenter draws). ─────────
    // The browser chart is an <svg viewBox="0 0 560 300"> filling the block
    // frame; preserveAspectRatio meet letterboxes the drawing into the largest
    // 560:300 box, which is the visible region. Embedding that same SVG at the
    // contained box reproduces the web drawing byte-for-byte: dashed gridlines,
    // per-bar highlight color, exact bar geometry, category order and data
    // labels like "2.4MB".
    const chartFrame = chartContainedFrame(frame);
    const svgString = renderChartToSvg(chartSpec);

    return {
      status: "rasterized",
      issues: [],
      element: {
        type: "svg",
        elementId: chartBlock.id,
        ...chartFrame,
        data: {
          svg: svgString,
          alt: chartSpec.summary || chartSpec.title || "Chart",
        },
      },
    };
  },
};
