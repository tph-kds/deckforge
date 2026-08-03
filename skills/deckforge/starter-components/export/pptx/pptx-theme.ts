import type { DeckProject } from "../../deck-types";
import type PptxGenJS from "pptxgenjs";

type DeckTheme = DeckProject["theme"];

interface PptxThemeColors {
  background: string;
  text: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  accent6: string;
  dark1: string;
  dark2: string;
  light1: string;
  light2: string;
}

export function mapThemeColors(theme: DeckTheme): PptxThemeColors {
  const palette = (theme.overrides?.colors ?? {}) as Record<string, string>;
  return {
    background: palette.background ?? "#FFFFFF",
    text: palette.text ?? palette.foreground ?? "#000000",
    accent1: palette.primary ?? "#1A73E8",
    accent2: palette.secondary ?? "#34A853",
    accent3: palette.tertiary ?? "#FBBC04",
    accent4: palette.quaternary ?? "#EA4335",
    accent5: palette.quinary ?? "#9334E6",
    accent6: palette.senary ?? "#FF6D01",
    dark1: palette.dark1 ?? "#1F1F1F",
    dark2: palette.dark2 ?? "#3C4043",
    light1: palette.light1 ?? "#F8F9FA",
    light2: palette.light2 ?? "#E8EAED",
  };
}

export function mapThemeFonts(theme: DeckTheme): { heading: string; body: string } {
  const typography = (theme.overrides?.typography ?? {}) as Record<string, string>;
  return {
    heading: typography.headingFont ?? "Arial",
    body: typography.bodyFont ?? "Arial",
  };
}

export function applyThemeToPptx(pptx: PptxGenJS, theme: DeckTheme): void {
  const colors = mapThemeColors(theme);
  const fonts = mapThemeFonts(theme);

  pptx.theme = {
    headColor: colors.dark1,
    bodyColor: colors.text,
    headFontFace: fonts.heading,
    bodyFontFace: fonts.body,
  };
}
