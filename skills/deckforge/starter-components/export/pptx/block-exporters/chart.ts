import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";

interface ChartDataPoint {
  label: string;
  value: number;
}

interface ChartBlock {
  id: string;
  type: "chart";
  chartType?: string;
  data?: ChartDataPoint[];
  content?: { type?: string; title?: string; values?: ChartDataPoint[] };
  title?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  frame?: { x?: number; y?: number; w?: number; h?: number };
}

const CHART_TYPE_MAP: Record<string, string> = {
  bar: "bar",
  "bar-horizontal": "bar",
  line: "line",
  pie: "pie",
  doughnut: "pie",
  scatter: "scatter",
};

export const chartBlockExporter: PptxBlockExporter = {
  type: "chart",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const chartBlock = block as ChartBlock;
    const content = chartBlock.content;
    const values: ChartDataPoint[] = content?.values ?? chartBlock.data ?? [];
    const chartType = content?.type ?? chartBlock.chartType ?? "bar";
    const title = content?.title ?? chartBlock.title ?? "";
    const pptxChartType = CHART_TYPE_MAP[chartType] ?? "bar";

    const chartData = [
      {
        name: title || "Data",
        labels: values.map((point) => point.label),
        values: values.map((point) => point.value),
      },
    ];

    return {
      status: "native",
      issues: [],
      element: {
        type: "chart",
        x: chartBlock.x ?? chartBlock.frame?.x ?? 0,
        y: chartBlock.y ?? chartBlock.frame?.y ?? 0,
        w: chartBlock.w ?? chartBlock.frame?.w ?? ctx.slideWidth * 0.7,
        h: chartBlock.h ?? chartBlock.frame?.h ?? ctx.slideHeight * 0.5,
        data: {
          chartType: pptxChartType,
          data: chartData,
          options: {
            showTitle: !!title,
            title,
            showValue: true,
            dataLabelPosition: "outEnd",
          },
        },
      },
    };
  },
};