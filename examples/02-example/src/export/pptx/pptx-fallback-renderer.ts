// export/pptx/pptx-fallback-renderer.ts

import type { PptxExportContext, PptxSlideElement } from "../export-types";

export async function renderFallback(
  block: Record<string, unknown>,
  ctx: PptxExportContext,
  reason: string
): Promise<PptxSlideElement> {
  const blockType = (block.type as string) ?? "unknown";

  return {
    type: "fallback",
    x: (block.x as number) ?? 0,
    y: (block.y as number) ?? 0,
    w: (block.w as number) ?? ctx.slideWidth * 0.5,
    h: (block.h as number) ?? ctx.slideHeight * 0.3,
    data: {
      text: `[${blockType}: ${reason}]`,
      options: {
        fill: { color: "FFF3CD" },
        line: { color: "FFC107", width: 1 },
        fontSize: 12,
        color: "856404",
      },
    },
  };
}
