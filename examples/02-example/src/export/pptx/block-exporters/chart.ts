// export/pptx/block-exporters/chart.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import type { Block, ChartContent, ChartValue } from "../../../deck/types";
import { chartSpecFromContent } from "../../../deck/chart-spec";
import { exportFrameOf, frameErrorIssue } from "../export-utils";

interface ChartDataPoint {
  label: string;
  value: number;
}

const CHART_TYPE_MAP: Record<string, string> = {
  bar: "bar",
  "bar-horizontal": "bar",
  line: "line",
  pie: "pie",
  doughnut: "pie",
  scatter: "scatter",
};

/** PptxGenJS data-label position derived from the shared ChartSpec policy. */
function dataLabelPositionOf(position: string): string {
  return position === "in-end" ? "inEnd" : "outEnd";
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

    const values: ChartValue[] = content?.values ?? (chartBlock as { data?: ChartDataPoint[] }).data ?? [];
    const chartType = content?.type ?? (chartBlock as { chartType?: string }).chartType ?? "bar";
    const spec = chartSpecFromContent(content as ChartContent);
    const title = spec.title || (chartBlock as { title?: string }).title || "";
    const unit = spec.unit;
    const pptxChartType = CHART_TYPE_MAP[chartType] ?? "bar";

    if (!Array.isArray(values)) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "chart-no-data",
            severity: "error",
            message: `Chart block "${chartBlock.id}" has malformed data (expected an array of {label, value})`,
            suggestedFix: "Give the chart a valid values array",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    if (values.length === 0) {
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

    const labels = values.map((point) => point.label);
    const dataValues = values.map((point) => point.value);
    const seriesName = title || "Data";

    const chartData = [
      {
        name: seriesName,
        labels,
        values: dataValues,
      },
    ];

    const showValueLabels =
      spec.labelPolicy.showDataLabels && pptxChartType !== "line";
    const labelOptions = {
      showValue: showValueLabels,
      dataLabelPosition: dataLabelPositionOf(spec.labelPolicy.dataLabelPosition),
      dataLabelColor: "555555",
      dataLabelFontSize: 10,
      dataLabelFontBold: true,
      ...(unit ? { valAxisTitle: unit, valAxisTitleFontSize: 9 } : {}),
      valAxisLabelShow: true,
      catAxisLabelShow: true,
      catAxisLabelFontSize: 9,
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
            showTitle: !!title,
            title,
            ...labelOptions,
          },
        },
      },
    };
  },
};