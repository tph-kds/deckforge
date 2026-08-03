import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

interface TextBlock {
  id: string;
  type: "text";
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const textBlockExporter: PptxBlockExporter = {
  type: "text",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const textBlock = block as TextBlock;

    return {
      type: "text",
      x: textBlock.x ?? 0,
      y: textBlock.y ?? 0,
      w: textBlock.w ?? ctx.slideWidth * 0.8,
      h: textBlock.h ?? 1,
      data: {
        text: textBlock.content ?? "",
        options: {
          fontFace: textBlock.fontFamily ?? "Arial",
          fontSize: textBlock.fontSize ?? 18,
          bold: textBlock.fontWeight === "bold",
          color: textBlock.color?.replace("#", "") ?? "000000",
          align: textBlock.textAlign ?? "left",
          valign: "top",
          wrap: true,
        },
      },
    };
  },
};
