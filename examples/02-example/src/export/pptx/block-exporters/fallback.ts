import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

export const fallbackBlockExporter: PptxBlockExporter = {
  type: "fallback",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const anyBlock = block as Record<string, unknown>;
    const blockType = (anyBlock.type as string) ?? "unknown";

    return {
      type: "fallback",
      x: (anyBlock.x as number) ?? 0,
      y: (anyBlock.y as number) ?? 0,
      w: (anyBlock.w as number) ?? ctx.slideWidth * 0.5,
      h: (anyBlock.h as number) ?? ctx.slideHeight * 0.3,
      data: {
        text: `[${blockType} block - requires web rendering]`,
        options: {
          fill: { color: "FFF3CD" },
          line: { color: "FFC107", width: 1 },
        },
      },
    };
  },
};
