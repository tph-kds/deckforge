import { describe, expect, it } from "vitest";
import {
  chartSpecFromContent,
  describeBarChartLayout,
  DEFAULT_CHART_SPEC,
} from "../src/deck/chart-spec";
import type { ChartContent } from "../src/deck/types";

const WEIGHT_CHART: ChartContent = {
  type: "bar",
  title: "Median desktop page weight, by year",
  unit: "MB",
  values: [
    { label: "2016", value: 1.6 },
    { label: "2017", value: 1.7 },
    { label: "2018", value: 1.9 },
    { label: "2019", value: 2.0 },
    { label: "2020", value: 2.1 },
    { label: "2021", value: 2.2 },
    { label: "2022", value: 2.3 },
    { label: "2023", value: 2.4 },
    { label: "2024", value: 2.4 },
  ],
  highlightIndex: 8,
  summary: "Median desktop page weight rose nearly every year.",
};

describe("chartSpecFromContent", () => {
  it("derives a shared spec with the collision-safe label policy", () => {
    const spec = chartSpecFromContent(WEIGHT_CHART);
    expect(spec.chartType).toBe("bar");
    expect(spec.unit).toBe("MB");
    expect(spec.values).toHaveLength(9);
    expect(spec.labelPolicy.valueAxisSide).toBe("left");
    expect(spec.labelPolicy.dataLabelPosition).toBe("out-end");
    expect(spec.labelPolicy.dataLabelPadding).toBeGreaterThan(0);
    expect(spec.labelPolicy.axisLabelWidth).toBeGreaterThan(0);
    expect(spec.labelPolicy.showUnitInAxisLabels).toBe(false);
  });

  it("derives orientation from chart type", () => {
    const barSpec = chartSpecFromContent(WEIGHT_CHART);
    expect(barSpec.orientation).toBe("vertical");

    const horizontalSpec = chartSpecFromContent({ ...WEIGHT_CHART, type: "bar-horizontal" });
    expect(horizontalSpec.orientation).toBe("horizontal");

    const lineSpec = chartSpecFromContent({ ...WEIGHT_CHART, type: "line" });
    expect(lineSpec.orientation).toBe("vertical");
  });

  it("tolerates malformed values arrays", () => {
    const spec = chartSpecFromContent({ type: "bar", values: undefined as never });
    expect(spec.values).toEqual([]);
    expect(spec.labelPolicy).toEqual(DEFAULT_CHART_SPEC.labelPolicy);
  });
});

describe("describeBarChartLayout (regression: 2.4MB label collision)", () => {
  const spec = chartSpecFromContent(WEIGHT_CHART);
  const layout = describeBarChartLayout(spec);
  const { plot, gridlines, bars } = layout;

  it("reserves an axis column to the LEFT and keeps data labels inside the plot", () => {
    expect(plot.x).toBeGreaterThan(spec.labelPolicy.axisLabelWidth * 0.9);
    expect(plot.x).toBe(8 + spec.labelPolicy.axisLabelWidth);
    expect(plot.w).toBe(560 - 8 * 2 - spec.labelPolicy.axisLabelWidth);
  });

  it("places every out-end data label inside the SVG bounds", () => {
    for (const bar of bars) {
      // Reserved padding above the plot means a full-height bar's label
      // can never escape the top edge of the SVG.
      expect(bar.dataLabelY - spec.dataLabelFontSizePx).toBeGreaterThanOrEqual(0);
      expect(bar.dataLabelX + 8).toBeLessThanOrEqual(560);
      expect(bar.dataLabelX - 8).toBeGreaterThanOrEqual(0);
    }
  });

  it("never overlaps the final bar's data label with a value-axis tick label", () => {
    // Axis labels are anchored at plot.x - 4 (left); data labels sit at
    // bar centers which are strictly inside the plot, so the "2.4MB" data
    // label for 2024 cannot collide with the "2.4" tick label.
    for (const gridline of gridlines) {
      expect(gridline.labelX + (layout.axisLabelAnchor === "end" ? 4 : 0)).toBeLessThanOrEqual(plot.x);
    }
    const last = bars[bars.length - 1];
    const lastSlotCenter = plot.x + (plot.w / spec.values.length) * (spec.values.length - 1);
    expect(last.dataLabelX).toBeGreaterThanOrEqual(lastSlotCenter - 1);
    expect(last.dataLabelX - (plot.x - 4)).toBeGreaterThan(20);
  });

  it("does not duplicate the unit on tick labels", () => {
    for (const gridline of gridlines) {
      expect(gridline.label).not.toContain("MB");
    }
    expect(bars[bars.length - 1].dataLabel).toBe("2.4MB");
  });

  it("keeps the highlight bar aligned with its data label", () => {
    const highlighted = bars[spec.highlightIndex ?? -1];
    expect(highlighted).toBeDefined();
    expect(highlighted.dataLabel).toBe("2.4MB");
  });

  it("produces one data label per point", () => {
    expect(bars).toHaveLength(spec.values.length);
  });
});
