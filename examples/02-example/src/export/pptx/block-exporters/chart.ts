// export/pptx/block-exporters/chart.ts
//
// PPTX chart exporter that consumes the canonical ResolvedChartSpec from the
// snapshot resolver. The exporter NEVER reconstructs chart data, orientation or
// colors on its own — it reads the same immutable spec the web and presenter
// surfaces use, then maps it to a native PowerPoint chart. When the native
// chart cannot reproduce the web appearance within the fidelity policy, the
// chart falls back to an SVG rendered from the SAME spec.

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import type { Block, ChartContent } from "../../../deck/types";
import { chartSpecFromContent } from "../../../deck/chart-spec";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import { hexToPptx } from "../../resolved-theme";
import type { ResolvedChartSpec } from "../../snapshot";
import { resolveChartSpecForBlock } from "../../snapshot";
import { renderChartToSvg } from "../../fidelity/svg/svg-chart";

/** PptxGenJS data-label position derived from the shared ChartSpec policy. */
function dataLabelPositionOf(position: string): string {
  return position === "in-end" ? "inEnd" : "outEnd";
}

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/** A chart data point that is definitely well-formed enough to export. */
function hasRealChartData(content: ChartContent | undefined): boolean {
  return Array.isArray(content?.values) && content.values.length > 0;
}

export const chartBlockExporter: PptxBlockExporter = {
  type: "chart",
  exportability: "native-editable",

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

    const spec = chartSpecFromContent(content as ChartContent);

    // ── Fidelity gate ────────────────────────────────────────────────────────
    // A native PowerPoint chart is only used when it can reproduce the web
    // chart's orientation, exact colors and data labels. Otherwise, in
    // fidelity-first mode, render the SAME spec to SVG.
    const fidelityIssues: string[] = [];

    const hasAutomaticColors = chartSpec.style.seriesColors.some(
      (c) => !HEX_COLOR_RE.test(c),
    );
    if (hasAutomaticColors) {
      fidelityIssues.push("series colors are not explicit hex values");
    }
    if (!/^#[0-9a-f]{6}$/i.test(chartSpec.style.highlightColor)) {
      fidelityIssues.push("highlight color is not an explicit hex value");
    }
    if (!spec.labelPolicy.showDataLabels) {
      fidelityIssues.push("data labels disabled");
    }

    if (fidelityIssues.length > 0 && ctx.config.mode === "fidelity-first") {
      const svgString = renderChartToSvg(chartSpec);
      return {
        status: "rasterized",
        issues: [
          {
            code: "fallback-rasterized",
            severity: "warning",
            message: `Chart "${chartBlock.id}" fell back to SVG: ${fidelityIssues.join(", ")}`,
            automaticFixAvailable: false,
          },
        ],
        element: {
          type: "svg",
          elementId: chartBlock.id,
          ...frame,
          data: {
            svg: svgString,
            alt: chartSpec.summary || chartSpec.title || "Chart",
          },
        },
      };
    }

    // ── Deterministic Web → PPTX orientation mapping ────────────────────────
    // Web bar (vertical) → PowerPoint column chart (barDir "col").
    // Web bar-horizontal → PowerPoint horizontal bar chart (barDir "bar").
    // Never inferred from data shape; always driven by the persisted
    // orientation on the canonical spec.
    const isHorizontal = chartSpec.orientation === "horizontal";
    const pptxChartType = "bar" as const;
    const barDir = isHorizontal ? "bar" : "col";

    const labels = chartSpec.categories;
    const dataValues = chartSpec.series[0]?.values ?? [];
    const seriesName = chartSpec.series[0]?.name || chartSpec.title || "Data";

    const chartData = [
      {
        name: seriesName,
        labels,
        values: dataValues,
      },
    ];

    const showValueLabels =
      spec.labelPolicy.showDataLabels && chartSpec.type !== "line";
    const labelOptions = {
      showValue: showValueLabels,
      dataLabelPosition: dataLabelPositionOf(spec.labelPolicy.dataLabelPosition),
      dataLabelColor: hexToPptx(chartSpec.style.foreground),
      dataLabelFontSize: chartSpec.style.fontSize,
      dataLabelFontBold: true,
      ...(chartSpec.unit
        ? { valAxisTitle: chartSpec.unit, valAxisTitleFontSize: 9 }
        : {}),
      valAxisLabelShow: true,
      catAxisLabelShow: true,
      catAxisLabelFontSize: chartSpec.style.fontSize,
    };

    return {
      status: "native",
      issues: [],
      element: {
        type: "chart",
        elementId: chartBlock.id,
        ...frame,
        data: {
          chartType: pptxChartType,
          data: chartData,
          options: {
            showTitle: !!chartSpec.title,
            title: chartSpec.title,
            chartColors: chartSpec.style.seriesColors.map((c) => hexToPptx(c)),
            barDir,
            ...labelOptions,
          },
        },
      },
    };
  },
};
