import type { ChartContent } from '../deck/types';
import type { Block, DeckProject } from '../deck/types';
import { chartSpecFromContent, describeBarChartLayout } from '../deck/chart-spec';
import { getTheme } from '../deck/themes';
import { resolveChartSpecForBlock } from '../export/snapshot';

interface ChartProps {
  chart: ChartContent;
  themeId: string;
  deck?: DeckProject;
  block?: Block;
}

interface ResolvedChartColors {
  seriesColors: string[];
  highlightColor: string;
  foreground: string;
  labelColor: string;
  axis: string;
  accent: string;
}

/**
 * Colors for a chart. When a deck + block are available they come from the
 * canonical ResolvedChartSpec (the same spec the PPTX exporter consumes), so
 * Web and PPTX always render the exact same hexadecimal values. Without a
 * deck/block (standalone rendering, tests) the theme is used directly, which
 * produces identical colors for the same theme.
 */
function useResolvedChartColors(chart: ChartContent, themeId: string, deck?: DeckProject, block?: Block): ResolvedChartColors {
  if (deck && block) {
    const spec = resolveChartSpecForBlock(deck, block);
    if (spec) {
      return {
        seriesColors: spec.style.seriesColors,
        highlightColor: spec.style.highlightColor,
        foreground: spec.style.foreground,
        labelColor: spec.style.labelColor,
        axis: spec.style.axisColor,
        accent: spec.style.accentColor,
      };
    }
  }
  const theme = getTheme(themeId);
  return {
    seriesColors: [],
    highlightColor: theme.tokens.secondary,
    foreground: theme.tokens.foreground,
    labelColor: theme.tokens.muted,
    axis: theme.tokens.border,
    accent: theme.chartPalette[0],
  };
}

function barFill(colors: ResolvedChartColors, index: number, isHighlight: boolean): string {
  return isHighlight ? colors.highlightColor : (colors.seriesColors[index] ?? colors.accent);
}

function dataLabelFill(colors: ResolvedChartColors, isHighlight: boolean): string {
  return isHighlight ? colors.highlightColor : colors.foreground;
}

export function BarChart({ chart, themeId, deck, block }: ChartProps) {
  const colors = useResolvedChartColors(chart, themeId, deck, block);
  const spec = chartSpecFromContent(chart);
  const values = spec.values;
  if (!values.length) return null;
  const layout = describeBarChartLayout(spec);
  const { plot, gridlines, bars } = layout;
  return (
    <svg
      viewBox="0 0 560 300"
      width="100%"
      height="100%"
      role="img"
      aria-label={chart.summary ?? 'Bar chart'}
    >
      {spec.title ? (
        <text x={8} y={14} fontSize={13} fontWeight={600} fill={colors.labelColor} fontFamily="var(--font-body)">
          {spec.title}
        </text>
      ) : null}
      <line
        x1={plot.x}
        x2={plot.x + plot.w}
        y1={plot.y + plot.h}
        y2={plot.y + plot.h}
        stroke={colors.axis}
        strokeWidth={1}
      />
      {gridlines.map((gridline) => (
        <g key={gridline.fraction}>
          <line
            x1={plot.x}
            x2={plot.x + plot.w}
            y1={gridline.y}
            y2={gridline.y}
            stroke={colors.axis}
            strokeWidth={1}
            strokeDasharray={gridline.fraction === 0 ? 'none' : '3 4'}
          />
          <text
            x={gridline.labelX}
            y={gridline.labelY}
            fontSize={spec.axisLabelFontSizePx}
            fill={colors.labelColor}
            textAnchor={layout.axisLabelAnchor}
            fontFamily="var(--font-body)"
          >
            {gridline.label}
          </text>
        </g>
      ))}
      {values.map((value, index) => {
        const placement = bars[index];
        const isHighlight = spec.highlightIndex === index;
        return (
          <g key={value.label}>
            <rect
              x={placement.barX}
              y={placement.barY}
              width={placement.barW}
              height={placement.barH}
              rx={3}
              fill={barFill(colors, index, isHighlight)}
            />
            <text
              x={placement.categoryLabelX}
              y={placement.categoryLabelY}
              fontSize={spec.categoryLabelFontSizePx}
              fill={colors.labelColor}
              textAnchor="middle"
              fontFamily="var(--font-body)"
            >
              {value.label}
            </text>
            {spec.labelPolicy.showDataLabels && (
              <text
                x={placement.dataLabelX}
                y={placement.dataLabelY}
                fontSize={spec.dataLabelFontSizePx}
                fontWeight={600}
                fill={dataLabelFill(colors, isHighlight)}
                textAnchor="middle"
                fontFamily="var(--font-body)"
              >
                {placement.dataLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BarHorizontalChart({ chart, themeId, deck, block }: ChartProps) {
  const colors = useResolvedChartColors(chart, themeId, deck, block);
  const spec = chartSpecFromContent(chart);
  const values = spec.values;
  if (!values.length) return null;
  const max = Math.max(...values.map((value) => value.value), 1);
  const titleH = spec.title ? 20 : 0;
  const rowH = 40;
  const labelW = 96;
  const barMaxW = 560 - labelW - 56;
  const top = titleH + 8;
  return (
    <svg
      viewBox="0 0 560 300"
      width="100%"
      height="100%"
      role="img"
      aria-label={chart.summary ?? 'Horizontal bar chart'}
    >
      {spec.title ? (
        <text x={0} y={14} fontSize={13} fontWeight={600} fill={colors.labelColor} fontFamily="var(--font-body)">
          {spec.title}
        </text>
      ) : null}
      {values.map((value, index) => {
        const y = top + index * rowH;
        const w = (value.value / max) * barMaxW;
        const isHighlight = spec.highlightIndex === index;
        return (
          <g key={value.label}>
            <text x={0} y={y + 16} fontSize={12} fill={colors.labelColor} textAnchor="start" fontFamily="var(--font-body)">
              {value.label}
            </text>
            <rect
              x={labelW}
              y={y + 2}
              width={Math.max(w, 2)}
              height={20}
              rx={3}
              fill={barFill(colors, index, isHighlight)}
            />
            <text
              x={labelW + w + 6}
              y={y + 17}
              fontSize={11}
              fontWeight={600}
              fill={dataLabelFill(colors, isHighlight)}
              fontFamily="var(--font-body)"
            >
              {value.value}
              {spec.unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartRenderer({ chart, themeId, deck, block }: ChartProps) {
  if (chart.type === 'bar-horizontal') return <BarHorizontalChart chart={chart} themeId={themeId} deck={deck} block={block} />;
  return <BarChart chart={chart} themeId={themeId} deck={deck} block={block} />;
}
