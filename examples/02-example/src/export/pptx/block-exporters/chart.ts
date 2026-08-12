// export/pptx/block-exporters/chart.ts
//
// PPTX chart exporter that uses the canonical chart spec from the snapshot.
// This ensures color/typography parity between web and PPTX.

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import type { Block, ChartContent, ChartValue } from "../../../deck/types";
import { chartSpecFromContent } from "../../../deck/chart-spec";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import { resolveTheme, hexToPptx } from "../../resolved-theme";
import type { ResolvedChartSpec } from "../../snapshot";

interface ChartDataPoint {
  label: string;
  value: number;
}



/** PptxGenJS data-label position derived from the shared ChartSpec policy. */
function dataLabelPositionOf(position: string): string {
  return position === "in-end" ? "inEnd" : "outEnd";
}

/**
 * Build the resolved chart spec from a block's content.
 * This is the single source of truth for chart rendering.
 */
function buildResolvedChartSpec(
  content: ChartContent | undefined,
  block: Block,
  ctx: PptxExportContext
): ResolvedChartSpec | null {
  if (!content) return null;

  // Skip template charts
  if (content.isTemplate) return null;

  // Validate chart data
  if (!Array.isArray(content.values) || content.values.length === 0) return null;

  const theme = resolveTheme(ctx.deck);
  const palette = theme.chartPalette;

  return {
    type: content.type ?? "bar",
    orientation: content.type === "bar-horizontal" ? "horizontal" : "vertical",
    title: content.title ?? "",
    unit: content.unit ?? "",
    categories: content.values.map((v: ChartValue) => v.label),
    series: [
      {
        name: content.title ?? "Data",
        values: content.values.map((v: ChartValue) => v.value),
      },
    ],
    highlightIndex: content.highlightIndex,
    summary: content.summary ?? "",
    style: {
      seriesColors: palette.slice(0, content.values.length).map(hexToPptx),
      axisColor: hexToPptx(theme.tokens.border),
      gridColor: hexToPptx(theme.tokens.border),
      labelColor: hexToPptx(theme.tokens.muted),
      fontFamily: theme.typography.bodyFont,
      fontSize: 10,
      background: "transparent",
      highlightColor: hexToPptx(theme.tokens.secondary),
    },
  };
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

    // Build resolved chart spec
    const chartSpec = buildResolvedChartSpec(content, chartBlock, ctx);

    if (!chartSpec) {
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

    const spec = chartSpecFromContent(content as ChartContent);
    const isHorizontal = chartSpec.orientation === "horizontal";
    const isBar = chartSpec.type === "bar" || chartSpec.type === "bar-horizontal";
    const pptxChartType = isBar ? "bar" : "line";
    const barDir = isHorizontal ? "bar" : "col";

    const labels = chartSpec.categories;
    const dataValues = chartSpec.series[0]?.values ?? [];
    const seriesName = chartSpec.title || "Data";

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
      dataLabelColor: chartSpec.style.labelColor,
      dataLabelFontSize: chartSpec.style.fontSize,
      dataLabelFontBold: true,
      ...(chartSpec.unit ? { valAxisTitle: chartSpec.unit, valAxisTitleFontSize: 9 } : {}),
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
            chartColors: chartSpec.style.seriesColors,
            ...(isBar ? { barDir } : {}),
            ...labelOptions,
          },
        },
      },
    };
  },
};
