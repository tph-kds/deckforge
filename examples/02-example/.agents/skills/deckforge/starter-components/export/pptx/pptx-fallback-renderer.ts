// export/pptx/pptx-fallback-renderer.ts

import type { PptxExportContext, PptxSlideElement } from "../export-types";

export async function renderFallback(
  block: Record<string, unknown>,
  ctx: PptxExportContext,
  reason: string
): Promise<PptxSlideElement> {
  const blockType = (block.type as string) ?? "unknown";
  const frame = (block.frame as { x?: number; y?: number; w?: number; h?: number } | undefined) ?? {};

  return {
    type: "fallback",
    x: (block.x as number) ?? frame.x ?? 0,
    y: (block.y as number) ?? frame.y ?? 0,
    w: (block.w as number) ?? frame.w ?? ctx.slideWidth * 0.5,
    h: (block.h as number) ?? frame.h ?? ctx.slideHeight * 0.3,
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
