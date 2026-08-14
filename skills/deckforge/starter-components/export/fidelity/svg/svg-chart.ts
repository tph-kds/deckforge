import type { ResolvedChartSpec } from "../../snapshot";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatValue(value: number, unit: string): string {
  return `${value}${unit}`;
}

// ─── Vertical Bar Chart ──────────────────────────────────────────────────────

interface ChartPlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ChartGridline {
  fraction: number;
  y: number;
  label: string;
  labelX: number;
  labelY: number;
}

interface BarPlacement {
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

interface BarChartLayout {
  plot: ChartPlotRect;
  gridlines: ChartGridline[];
  bars: BarPlacement[];
  axisLabelAnchor: "end" | "start";
}

function describeBarChartLayout(spec: ResolvedChartSpec): BarChartLayout {
  const width = 560;
  const height = 300;
  const values = spec.series[0]?.values ?? [];
  const categories = spec.categories;
  const titleH = spec.title ? 20 : 0;
  const padX = 8;
  const categoryH = 18;
  const baselineH = 8;
  const axisW = 46;
  const dataLabelPadding = 18;
  const showDataLabels = true;
  const dataPosition = "out-end";
  const dataPad = showDataLabels && dataPosition === "out-end" ? dataLabelPadding : 0;

  const axisOnLeft = true;
  const plot: ChartPlotRect = {
    x: padX + (axisOnLeft ? axisW : 0),
    y: titleH + dataPad,
    w: width - padX * 2 - axisW,
    h: height - titleH - dataPad - baselineH - categoryH,
  };

  const maxValue = values.length ? Math.max(...values, 1) : 1;
  const slotW = values.length ? plot.w / values.length : plot.w;
  const barW = Math.min(slotW * 0.55, 42);

  const fractions = [0, 0.25, 0.5, 0.75, 1];
  const gridlines: ChartGridline[] = fractions.map((fraction) => {
    const y = plot.y + plot.h - fraction * plot.h;
    const raw = Math.round(fraction * maxValue * 10) / 10;
    const label = String(raw);
    return {
      fraction,
      y,
      label,
      labelX: axisOnLeft ? plot.x - 4 : plot.x + plot.w + 4,
      labelY: y - 4,
    };
  });

  const bars: BarPlacement[] = values.map((value, index) => {
    const h = (value / maxValue) * plot.h;
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
      dataLabel: formatValue(value, spec.unit),
    };
  });

  return {
    plot,
    gridlines,
    bars,
    axisLabelAnchor: axisOnLeft ? "end" : "start",
  };
}

function renderVerticalBar(spec: ResolvedChartSpec): string {
  const layout = describeBarChartLayout(spec);
  const { plot, gridlines, bars } = layout;
  const values = spec.series[0]?.values ?? [];
  const style = spec.style;
  const fontFamily = escapeXml(style.fontFamily);

  const parts: string[] = [];

  // Title
  if (spec.title) {
    parts.push(
      `<text x="8" y="14" font-size="13" font-weight="600" fill="${style.labelColor}" font-family="${fontFamily}">${escapeXml(spec.title)}</text>`
    );
  }

  // Baseline
  parts.push(
    `<line x1="${plot.x}" x2="${plot.x + plot.w}" y1="${plot.y + plot.h}" y2="${plot.y + plot.h}" stroke="${style.axisColor}" stroke-width="1"/>`
  );

  // Gridlines + axis labels
  for (const gridline of gridlines) {
    const dashArray = gridline.fraction === 0 ? "none" : "3 4";
    parts.push(
      `<line x1="${plot.x}" x2="${plot.x + plot.w}" y1="${gridline.y}" y2="${gridline.y}" stroke="${style.axisColor}" stroke-width="1" stroke-dasharray="${dashArray}"/>`
    );
    parts.push(
      `<text x="${gridline.labelX}" y="${gridline.labelY}" font-size="9" fill="${style.labelColor}" text-anchor="${layout.axisLabelAnchor}" font-family="${fontFamily}">${escapeXml(gridline.label)}</text>`
    );
  }

  // Bars + labels
  for (let index = 0; index < values.length; index++) {
    const placement = bars[index];
    const isHighlight = spec.highlightIndex === index;
    const fill = style.seriesColors[index] ?? style.accentColor;
    const label = spec.categories[index] ?? "";

    parts.push(
      `<rect x="${placement.barX}" y="${placement.barY}" width="${placement.barW}" height="${placement.barH}" rx="3" fill="${fill}"/>`
    );
    parts.push(
      `<text x="${placement.categoryLabelX}" y="${placement.categoryLabelY}" font-size="10" fill="${style.labelColor}" text-anchor="middle" font-family="${fontFamily}">${escapeXml(label)}</text>`
    );
    parts.push(
      `<text x="${placement.dataLabelX}" y="${placement.dataLabelY}" font-size="10" font-weight="600" fill="${isHighlight ? style.highlightColor : style.foreground}" text-anchor="middle" font-family="${fontFamily}">${escapeXml(placement.dataLabel)}</text>`
    );
  }

  return parts.join("\n");
}

// ─── Horizontal Bar Chart ────────────────────────────────────────────────────

function renderHorizontalBar(spec: ResolvedChartSpec): string {
  const values = spec.series[0]?.values ?? [];
  const categories = spec.categories;
  const style = spec.style;
  const fontFamily = escapeXml(style.fontFamily);
  const max = Math.max(...values, 1);
  const titleH = spec.title ? 20 : 0;
  const rowH = 40;
  const labelW = 96;
  const barMaxW = 560 - labelW - 56;
  const top = titleH + 8;

  const parts: string[] = [];

  // Title
  if (spec.title) {
    parts.push(
      `<text x="0" y="14" font-size="13" font-weight="600" fill="${style.labelColor}" font-family="${fontFamily}">${escapeXml(spec.title)}</text>`
    );
  }

  // Rows
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const y = top + index * rowH;
    const w = (value / max) * barMaxW;
    const isHighlight = spec.highlightIndex === index;
    const fill = style.seriesColors[index] ?? style.accentColor;
    const label = categories[index] ?? "";

    parts.push(
      `<text x="0" y="${y + 16}" font-size="12" fill="${style.labelColor}" text-anchor="start" font-family="${fontFamily}">${escapeXml(label)}</text>`
    );
    parts.push(
      `<rect x="${labelW}" y="${y + 2}" width="${Math.max(w, 2)}" height="20" rx="3" fill="${fill}"/>`
    );
    parts.push(
      `<text x="${labelW + w + 6}" y="${y + 17}" font-size="11" font-weight="600" fill="${isHighlight ? style.highlightColor : style.foreground}" font-family="${fontFamily}">${escapeXml(formatValue(value, spec.unit))}</text>`
    );
  }

  return parts.join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function renderChartToSvg(spec: ResolvedChartSpec): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 300" width="100%" height="100%" role="img" aria-label="${escapeXml(spec.summary || "Chart")}">`
  );

  if (spec.orientation === "horizontal") {
    parts.push(renderHorizontalBar(spec));
  } else {
    parts.push(renderVerticalBar(spec));
  }

  parts.push("</svg>");
  return parts.join("\n");
}
