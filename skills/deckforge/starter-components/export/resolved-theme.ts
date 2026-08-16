// export/resolved-theme.ts
//
// THE single source of truth for theme resolution.
// This module provides a resolver that creates a fully-resolved theme
// from the DeckProject's theme configuration.
//
// The resolved theme is used by both the Web Renderer and PPTX Exporter
// to ensure color/typography parity.

import type { DeckProject, ThemeDef, ThemeTokens } from "../deck/types";
import { getTheme } from "../deck/themes";

// ─── Canonical Color Resolution ──────────────────────────────────────────────

/**
 * Normalize a CSS color to a canonical hex format.
 * This ensures consistent color representation across all renderers.
 */
export function normalizeColor(color: string): string {
  if (!color) return "#000000";

  // Already hex
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    return `#${hex.slice(0, 6)}`;
  }

  // RGB/RGBA
  if (color.startsWith("rgb")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
      const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
      const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }

  // Named colors - return as-is (CSS will handle)
  return color;
}

/**
 * Parse a hex color to RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeColor(hex);
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;

  const hexStr = match[1];
  return {
    r: parseInt(hexStr.slice(0, 2), 16),
    g: parseInt(hexStr.slice(2, 4), 16),
    b: parseInt(hexStr.slice(4, 6), 16),
  };
}

/**
 * Convert a hex color to PPTX format (without # prefix).
 */
export function hexToPptx(hex: string): string {
  return normalizeColor(hex).replace("#", "");
}

// ─── Canonical Font Resolution ───────────────────────────────────────────────

const PPTX_SAFE_FONTS = new Set([
  "Arial",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Courier New",
  "Georgia",
  "Impact",
  "Lucida Console",
  "Palatino Linotype",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
]);

const WEB_TO_SUBSTITUTES: Record<string, string> = {
  Inter: "Arial",
  Manrope: "Arial",
  "IBM Plex Sans": "Arial",
  Sora: "Arial",
  "Libre Baskerville": "Georgia",
  "JetBrains Mono": "Consolas",
};

/**
 * Resolve a web font to a PPTX-safe font family.
 */
export function resolvePptxFont(fontFamily: string): string {
  if (!fontFamily) return "Arial";
  const cleanName = fontFamily.replace(/['"]/g, "").trim().split(",")[0].trim();
  if (PPTX_SAFE_FONTS.has(cleanName)) return cleanName;
  if (WEB_TO_SUBSTITUTES[cleanName]) return WEB_TO_SUBSTITUTES[cleanName];
  return "Arial";
}

/**
 * Check if a font is PPTX-safe.
 */
export function isPptxSafeFont(fontFamily: string): boolean {
  const cleanName = fontFamily.replace(/['"]/g, "").trim().split(",")[0].trim();
  return PPTX_SAFE_FONTS.has(cleanName) || !!WEB_TO_SUBSTITUTES[cleanName];
}

// ─── Canonical Theme Resolution ──────────────────────────────────────────────

export interface ResolvedTheme {
  id: string;
  tokens: ThemeTokens;
  typography: {
    headingFont: string;
    bodyFont: string;
    codeFont: string;
  };
  chartPalette: string[];
  gradients: Record<string, string>;
}

/**
 * Resolve a DeckProject's theme to a fully-resolved theme.
 * This is the single source of truth for all renderers.
 */
export function resolveTheme(deck: DeckProject): ResolvedTheme {
  const themeDef = getTheme(deck.theme?.id ?? "editorial-cream");
  const overrides = deck.theme?.overrides ?? {};

  // Apply overrides to tokens
  const tokens: ThemeTokens = {
    background: normalizeColor(
      (overrides as Record<string, string>).background ?? themeDef.tokens.background
    ),
    foreground: normalizeColor(
      (overrides as Record<string, string>).foreground ?? themeDef.tokens.foreground
    ),
    primary: normalizeColor(
      (overrides as Record<string, string>).primary ?? themeDef.tokens.primary
    ),
    secondary: normalizeColor(
      (overrides as Record<string, string>).secondary ?? themeDef.tokens.secondary
    ),
    surface: normalizeColor(
      (overrides as Record<string, string>).surface ?? themeDef.tokens.surface
    ),
    muted: normalizeColor(
      (overrides as Record<string, string>).muted ?? themeDef.tokens.muted
    ),
    surfaceElevated: normalizeColor(
      (overrides as Record<string, string>).surfaceElevated ?? themeDef.tokens.surfaceElevated
    ),
    border: normalizeColor(
      (overrides as Record<string, string>).border ?? themeDef.tokens.border
    ),
    focus: normalizeColor(
      (overrides as Record<string, string>).focus ?? themeDef.tokens.focus
    ),
  };

  // Apply overrides to typography
  const typographyOverrides = (overrides.typography ?? {}) as Record<string, string>;
  const typography = {
    headingFont: typographyOverrides.headingFont ?? themeDef.typography.headingFont,
    bodyFont: typographyOverrides.bodyFont ?? themeDef.typography.bodyFont,
    codeFont: typographyOverrides.codeFont ?? themeDef.typography.codeFont,
  };

  // Apply overrides to chart palette
  const chartPalette = Array.isArray(overrides.chartPalette)
    ? (overrides.chartPalette as string[]).map(normalizeColor)
    : themeDef.chartPalette.map(normalizeColor);

  // Apply overrides to gradients
  const gradients = {
    ...(themeDef.gradients ?? {}),
    ...((overrides.gradients as Record<string, string>) ?? {}),
  };

  return {
    id: themeDef.id,
    tokens,
    typography,
    chartPalette,
    gradients,
  };
}

/**
 * Get chart colors for a specific chart.
 * Returns the resolved colors based on the theme's chart palette.
 */
export function resolveChartColors(
  theme: ResolvedTheme,
  seriesCount: number,
  highlightIndex?: number
): {
  seriesColors: string[];
  highlightColor: string;
  axisColor: string;
  gridColor: string;
  labelColor: string;
} {
  const palette = theme.chartPalette;

  // Generate series colors from palette
  const seriesColors: string[] = [];
  for (let i = 0; i < seriesCount; i++) {
    seriesColors.push(palette[i % palette.length]);
  }

  // Highlight color is the secondary color
  const highlightColor = theme.tokens.secondary;

  return {
    seriesColors,
    highlightColor,
    axisColor: theme.tokens.border,
    gridColor: theme.tokens.border,
    labelColor: theme.tokens.muted,
  };
}

/**
 * Get text color for a block based on its role.
 */
export function resolveTextColor(
  theme: ResolvedTheme,
  role?: "primary" | "secondary" | "muted" | "foreground"
): string {
  switch (role) {
    case "primary":
      return theme.tokens.primary;
    case "secondary":
      return theme.tokens.secondary;
    case "muted":
      return theme.tokens.muted;
    case "foreground":
    default:
      return theme.tokens.foreground;
  }
}
