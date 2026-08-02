import type { ChartContent } from '../deck/types';
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
  const values = chart.values ?? [];
  if (!values.length) return null;
  const max = Math.max(...values.map((value) => value.value), 1);
  const unit = chart.unit ?? '';
  const baseline = 8;
  const chartH = 132;
  const labelH = 18;
  const titleH = chart.title ? 20 : 0;
  const padX = 8;
  const usable = 560 - padX * 2;
  const slotW = usable / values.length;
  const barW = Math.min(slotW * 0.55, 42);
  const gridlines = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg
      viewBox="0 0 560 300"
      width="100%"
      height="100%"
      role="img"
      aria-label={chart.summary ?? 'Bar chart'}
    >
      {chart.title ? (
        <text x={padX} y={14} fontSize={13} fontWeight={600} fill={colors.muted} fontFamily="var(--font-body)">
          {chart.title}
        </text>
      ) : null}
      {gridlines.map((fraction) => {
        const y = baseline + titleH + chartH - fraction * chartH;
        return (
          <g key={fraction}>
            <line
              x1={padX}
              x2={560 - padX}
              y1={y}
              y2={y}
              stroke={colors.axis}
              strokeWidth={1}
              strokeDasharray={fraction === 0 ? 'none' : '3 4'}
            />
            <text x={560 - padX} y={y - 4} fontSize={9} fill={colors.muted} textAnchor="end" fontFamily="var(--font-body)">
              {Math.round(fraction * max * 10) / 10}
              {unit}
            </text>
          </g>
        );
      })}
      {values.map((value, index) => {
        const h = (value.value / max) * chartH;
        const x = padX + index * slotW + (slotW - barW) / 2;
        const y = baseline + titleH + chartH - h;
        const isHighlight = chart.highlightIndex === index;
        return (
          <g key={value.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={3}
              fill={isHighlight ? colors.highlight : colors.accent}
            />
            <text
              x={x + barW / 2}
              y={baseline + titleH + chartH + labelH - 5}
              fontSize={10}
              fill={colors.muted}
              textAnchor="middle"
              fontFamily="var(--font-body)"
            >
              {value.label}
            </text>
            <text
              x={x + barW / 2}
              y={y - 6}
              fontSize={10}
              fontWeight={600}
              fill={isHighlight ? colors.highlight : colors.foreground}
              textAnchor="middle"
              fontFamily="var(--font-body)"
            >
              {value.value}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarHorizontalChart({ chart, themeId }: ChartProps) {
  const colors = useThemeColors(themeId);
  const values = chart.values ?? [];
  if (!values.length) return null;
  const max = Math.max(...values.map((value) => value.value), 1);
  const unit = chart.unit ?? '';
  const titleH = chart.title ? 20 : 0;
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
      {chart.title ? (
        <text x={0} y={14} fontSize={13} fontWeight={600} fill={colors.muted} fontFamily="var(--font-body)">
          {chart.title}
        </text>
      ) : null}
      {values.map((value, index) => {
        const y = top + index * rowH;
        const w = (value.value / max) * barMaxW;
        const isHighlight = chart.highlightIndex === index;
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
              {unit}
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
