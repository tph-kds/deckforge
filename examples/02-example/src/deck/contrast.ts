import type { ThemeDef } from './types';

/**
 * Theme contrast validation (plan §10.4).
 *
 * WCAG 2.x relative-luminance contrast checks run purely on the theme token
 * graph so theme families ship readable by default: body text against the
 * background, foreground/primary headings, muted text, and chart palette
 * contrast against the background.
 */

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA?: boolean;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return 0;
  const rgb = [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastIssue {
  pair: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  message: string;
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const AAA_NORMAL = 7;

/**
 * Validate the pairs that carry readable content (plan §10.4). Returns an
 * array of issues; an empty array means the theme passes.
 */
export function validateThemeContrast(theme: ThemeDef): ContrastIssue[] {
  const t = theme.tokens;
  const issues: ContrastIssue[] = [];

  const check = (pair: string, fg: string, bg: string, required: number) => {
    const ratio = contrastRatio(fg, bg);
    if (ratio < required) {
      issues.push({
        pair,
        fg,
        bg,
        ratio,
        required,
        message: `"${pair}" pair has ${ratio.toFixed(2)}:1 contrast, below the ${required}:1 threshold.`,
      });
    }
  };

  check('foreground/background', t.foreground, t.background, AA_NORMAL);
  check('primary/background', t.primary, t.background, AA_NORMAL);
  check('primary/surface', t.primary, t.surface, AA_NORMAL);
  check('muted/background', t.muted, t.background, AA_LARGE);
  check('muted/surface', t.muted, t.surface, AA_LARGE);

  for (const color of theme.chartPalette) {
    check(`chart series "${color}" vs background`, color, t.background, AA_LARGE);
  }

  return issues;
}
