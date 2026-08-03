// export/pptx/pptx-fonts.ts

import type { FontWarning } from "../export-types";

const SYSTEM_FONTS = new Set([
  "Arial", "Arial Black", "Comic Sans MS", "Courier New", "Georgia",
  "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif",
  "Palatino Linotype", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS",
  "Verdana",
]);

const PPTX_SAFE_FONTS = new Set([
  "Arial", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas",
  "Constantia", "Corbel", "Courier New", "Georgia", "Impact",
  "Lucida Console", "Palatino Linotype", "Segoe UI", "Tahoma",
  "Times New Roman", "Trebuchet MS", "Verdana",
]);

export function checkFontCompatibility(
  fontFamily: string,
  slideId?: string,
  blockId?: string
): FontWarning | null {
  const cleanName = fontFamily.replace(/['"]/g, "").trim().split(",")[0].trim();

  if (PPTX_SAFE_FONTS.has(cleanName)) {
    return null;
  }

  if (SYSTEM_FONTS.has(cleanName)) {
    return null;
  }

  return {
    fontFamily: cleanName,
    slideId,
    blockId,
    substituteFont: "Arial",
  };
}

export function collectFontWarnings(deck: { slides?: Array<{ id?: string; blocks?: Array<{ id?: string; fontFamily?: string }> }> }): FontWarning[] {
  const warnings: FontWarning[] = [];
  const slides = deck.slides ?? [];

  for (const slide of slides) {
    const blocks = slide.blocks ?? [];
    for (const block of blocks) {
      if (block.fontFamily) {
        const warning = checkFontCompatibility(block.fontFamily, slide.id, block.id);
        if (warning) warnings.push(warning);
      }
    }
  }

  return warnings;
}
