import type { ChartContent } from '../deck/types';
import { chartSpecFromContent, describeBarChartLayout } from '../deck/chart-spec';
import { getTheme } from '../deck/themes';

interface ChartProps {
  chart: ChartContent;
  themeId: string;
}

function useThemeColors(themeId: string) {
  const theme = getTheme(themeId);
  const foreground = theme.tokens.foreground;
  const muted = theme.tokens.muted;
  const accent = theme.chartPalette[0];
  const highlight = theme.tokens.secondary;
  const axis = theme.tokens.border;
  return { foreground, muted, accent, highlight, axis };
}

export function BarChart({ chart, themeId }: ChartProps) {
  const colors = useThemeColors(themeId);
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
        <text x={8} y={14} fontSize={13} fontWeight={600} fill={colors.muted} fontFamily="var(--font-body)">
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
            fill={colors.muted}
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
              fill={isHighlight ? colors.highlight : colors.accent}
            />
            <text
              x={placement.categoryLabelX}
              y={placement.categoryLabelY}
              fontSize={spec.categoryLabelFontSizePx}
              fill={colors.muted}
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
                fill={isHighlight ? colors.highlight : colors.foreground}
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

export function BarHorizontalChart({ chart, themeId }: ChartProps) {
  const colors = useThemeColors(themeId);
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
        <text x={0} y={14} fontSize={13} fontWeight={600} fill={colors.muted} fontFamily="var(--font-body)">
          {spec.title}
        </text>
      ) : null}
      {values.map((value, index) => {
        const y = top + index * rowH;
        const w = (value.value / max) * barMaxW;
        const isHighlight = spec.highlightIndex === index;
        return (
          <g key={value.label}>
            <text x={0} y={y + 16} fontSize={12} fill={colors.muted} textAnchor="start" fontFamily="var(--font-body)">
              {value.label}
            </text>
            <rect
              x={labelW}
              y={y + 2}
              width={Math.max(w, 2)}
              height={20}
              rx={3}
              fill={isHighlight ? colors.highlight : colors.accent}
            />
            <text
              x={labelW + w + 6}
              y={y + 17}
              fontSize={11}
              fontWeight={600}
              fill={colors.foreground}
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

export function ChartRenderer({ chart, themeId }: ChartProps) {
  if (chart.type === 'bar-horizontal') return <BarHorizontalChart chart={chart} themeId={themeId} />;
  return <BarChart chart={chart} themeId={themeId} />;
}
