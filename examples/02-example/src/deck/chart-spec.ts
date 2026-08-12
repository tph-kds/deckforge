import type { ChartContent, ChartValue } from "./types";

/**
 * deck/chart-spec.ts
 *
 * THE single source of truth for chart semantics shared by the browser
 * renderer (`src/render/Chart.tsx`) and the PPTX chart exporter
 * (`src/export/pptx/block-exporters/chart.ts`).
 *
 * Regression (P2-001): the browser BarChart drew value-axis tick labels at the
 * RIGHT edge of the plot with textAnchor="end", so the tallest bar's OUT-END
 * data label (e.g. "2.4MB" for 2024) collided with the top tick label
 * ("2.4MB"). The fix is enforced here, once, for both surfaces:
 *
 *  - value-axis tick labels live on the LEFT in their own reserved column;
 *  - OUT-END data labels reserve vertical padding above the plot so a full
 *    height bar can never push a label out of the SVG bounds;
 *  - tick labels carry the NUMBER only (the unit renders once per data label),
 *    so a value is never duplicated at the same visual point.
 */

export type ChartAxisSide = "left" | "right";
export type DataLabelPosition = "out-end" | "in-end";

export interface ChartLabelPolicy {
  /** Side of the plot that carries value-axis tick labels. */
  valueAxisSide: ChartAxisSide;
  showDataLabels: boolean;
  dataLabelPosition: DataLabelPosition;
  /** Document px reserved ABOVE the plot for out-end data labels. */
  dataLabelPadding: number;
  /** Document px reserved on the value-axis side for tick labels. */
  axisLabelWidth: number;
  /** When false, tick labels show the number only; the unit is not repeated. */
  showUnitInAxisLabels: boolean;
}

export interface ChartSpec {
  chartType: "bar" | "bar-horizontal" | "line";
  orientation: "horizontal" | "vertical";
  title?: string;
  unit: string;
  values: ChartValue[];
  highlightIndex?: number;
  summary?: string;
  labelPolicy: ChartLabelPolicy;
  dataLabelFontSizePx: number;
  categoryLabelFontSizePx: number;
  axisLabelFontSizePx: number;
}

export const DEFAULT_CHART_SPEC: ChartSpec = {
  chartType: "bar",
  orientation: "vertical",
  unit: "",
  values: [],
  labelPolicy: {
    valueAxisSide: "left",
    showDataLabels: true,
    dataLabelPosition: "out-end",
    dataLabelPadding: 18,
    axisLabelWidth: 46,
    showUnitInAxisLabels: false,
  },
  dataLabelFontSizePx: 10,
  categoryLabelFontSizePx: 10,
  axisLabelFontSizePx: 9,
};

/** Derive the canonical chart spec from a block's ChartContent. */
export function chartSpecFromContent(chart: ChartContent): ChartSpec {
  return {
    chartType: chart.type ?? "bar",
    orientation: chart.type === "bar-horizontal" ? "horizontal" : "vertical",
    title: chart.title,
    unit: chart.unit ?? "",
    values: Array.isArray(chart.values) ? chart.values : [],
    highlightIndex: chart.highlightIndex,
    summary: chart.summary,
    labelPolicy: { ...DEFAULT_CHART_SPEC.labelPolicy },
    dataLabelFontSizePx: DEFAULT_CHART_SPEC.dataLabelFontSizePx,
    categoryLabelFontSizePx: DEFAULT_CHART_SPEC.categoryLabelFontSizePx,
    axisLabelFontSizePx: DEFAULT_CHART_SPEC.axisLabelFontSizePx,
  };
}

export interface ChartPlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChartGridline {
  fraction: number;
  y: number;
  label: string;
  labelX: number;
  labelY: number;
}

export interface BarPlacement {
  barX: number;
  barY: number;
  barW: number;
  barH: number;
  dataLabelX: number;
  dataLabelY: number;
  categoryLabelX: number;
  categoryLabelY: number;
  dataLabel: string;
}

export interface BarChartLayout {
  plot: ChartPlotRect;
  gridlines: ChartGridline[];
  bars: BarPlacement[];
  maxValue: number;
  axisLabelAnchor: "end" | "start";
}

const DEFAULT_VIEWBOX = { width: 560, height: 300 };

/**
 * Compute the deterministic bar-chart layout in viewBox document px. Both the
 * browser SVG renderer and the shared label-policy tests use this so geometry
 * decisions live in one module.
 */
export function describeBarChartLayout(
  spec: ChartSpec,
  viewBox: { width: number; height: number } = DEFAULT_VIEWBOX,
): BarChartLayout {
  const { width, height } = viewBox;
  const policy = spec.labelPolicy;
  const titleH = spec.title ? 20 : 0;
  const padX = 8;
  const categoryH = 18;
  const baselineH = 8;
  const axisW = policy.axisLabelWidth;
  const dataPad =
    policy.showDataLabels && policy.dataLabelPosition === "out-end"
      ? policy.dataLabelPadding
      : 0;

  const axisOnLeft = policy.valueAxisSide === "left";
  const plot: ChartPlotRect = {
    x: padX + (axisOnLeft ? axisW : 0),
    y: titleH + dataPad,
    w: width - padX * 2 - axisW,
    h: height - titleH - dataPad - baselineH - categoryH,
  };

  const values = spec.values;
  const maxValue = values.length
    ? Math.max(...values.map((value) => value.value), 1)
    : 1;
  const slotW = values.length ? plot.w / values.length : plot.w;
  const barW = Math.min(slotW * 0.55, 42);

  const fractions = [0, 0.25, 0.5, 0.75, 1];
  const gridlines: ChartGridline[] = fractions.map((fraction) => {
    const y = plot.y + plot.h - fraction * plot.h;
    const raw = Math.round(fraction * maxValue * 10) / 10;
    const label = policy.showUnitInAxisLabels ? `${raw}${spec.unit}` : String(raw);
    return {
      fraction,
      y,
      label,
      labelX: axisOnLeft ? plot.x - 4 : plot.x + plot.w + 4,
      labelY: y - 4,
    };
  });

  const bars: BarPlacement[] = values.map((value, index) => {
    const h = (value.value / maxValue) * plot.h;
    const x = plot.x + index * slotW + (slotW - barW) / 2;
    const y = plot.y + plot.h - h;
    return {
      barX: x,
      barY: y,
      barW,
      barH: Math.max(h, 2),
      dataLabelX: x + barW / 2,
      dataLabelY: y - 4,
      categoryLabelX: x + barW / 2,
      categoryLabelY: plot.y + plot.h + baselineH + categoryH - 5,
      dataLabel: `${value.value}${spec.unit}`,
    };
  });

  return {
    plot,
    gridlines,
    bars,
    maxValue,
    axisLabelAnchor: axisOnLeft ? "end" : "start",
  };
}
