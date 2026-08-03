# Task 3: PPTX Theme Mapping

**Files:**
- Create: `starter-components/export/pptx/pptx-theme.ts`

**Interfaces:**
- Consumes: DeckProject theme from Task 2 context
- Produces: Theme definitions for PptxGenJS

## Steps

- [ ] **Step 1: Create pptx-theme.ts**

```typescript
// starter-components/export/pptx/pptx-theme.ts

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

export function mapThemeColors(theme: Record<string, unknown>): PptxThemeColors {
  const palette = (theme.colors ?? {}) as Record<string, string>;
  return {
    background: palette.background ?? "#FFFFFF",
    text: palette.text ?? "#000000",
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

export function mapThemeFonts(theme: Record<string, unknown>): { heading: string; body: string } {
  const typography = (theme.typography ?? {}) as Record<string, string>;
  return {
    heading: typography.headingFont ?? "Arial",
    body: typography.bodyFont ?? "Arial",
  };
}

export function applyThemeToPptx(pptx: Record<string, unknown>, theme: Record<string, unknown>): void {
  const colors = mapThemeColors(theme);
  const fonts = mapThemeFonts(theme);

  (pptx as Record<string, unknown>).theme = {
    headColor: colors.dark1,
    bodyColor: colors.text,
    headFontFace: fonts.heading,
    bodyFontFace: fonts.body,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add starter-components/export/pptx/pptx-theme.ts
git commit -m "feat: add DeckForge theme to PPTX theme mapper"
```
