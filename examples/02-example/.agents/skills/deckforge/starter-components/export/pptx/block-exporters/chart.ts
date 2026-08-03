// starter-components/export/pptx/block-exporters/chart.ts

import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartBlock {
  id: string;
  type: "chart";
  chartType: "bar" | "line" | "pie" | "doughnut" | "scatter";
  data: ChartDataPoint[];
  title?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

const CHART_TYPE_MAP: Record<string, string> = {
  bar: "bar",
  line: "line",
  pie: "pie",
  doughnut: "pie",
  scatter: "scatter",
};

export const chartBlockExporter: PptxBlockExporter = {
  type: "chart",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const chartBlock = block as ChartBlock;
    const pptxChartType = CHART_TYPE_MAP[chartBlock.chartType] ?? "bar";

    const chartData = [
      {
        name: chartBlock.title ?? "Data",
        labels: chartBlock.data.map((d) => d.label),
        values: chartBlock.data.map((d) => d.value),
      },
    ];

    return {
      type: "chart",
      x: chartBlock.x ?? 0,
      y: chartBlock.y ?? 0,
      w: chartBlock.w ?? ctx.slideWidth * 0.7,
      h: chartBlock.h ?? ctx.slideHeight * 0.5,
      data: {
        chartType: pptxChartType,
        data: chartData,
        options: {
          showTitle: !!chartBlock.title,
          title: chartBlock.title ?? "",
          showValue: true,
          dataLabelPosition: "outEnd",
        },
      },
    };
  },
};
