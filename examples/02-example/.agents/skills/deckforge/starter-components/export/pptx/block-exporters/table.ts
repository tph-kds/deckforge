import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

interface TableCell {
  text: string;
  bold?: boolean;
  color?: string;
  fill?: string;
}

interface TableBlock {
  id: string;
  type: "table";
  rows: TableCell[][];
  headerRow?: boolean;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const tableBlockExporter: PptxBlockExporter = {
  type: "table",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const tableBlock = block as TableBlock;

    const pptxRows = tableBlock.rows.map((row, rowIdx) =>
      row.map((cell) => ({
        text: cell.text,
        options: {
          bold: cell.bold ?? (tableBlock.headerRow && rowIdx === 0),
          color: cell.color?.replace("#", "") ?? "000000",
          fill: { color: cell.fill?.replace("#", "") ?? "FFFFFF" },
          valign: "middle",
          margin: [0.1, 0.1, 0.1, 0.1],
        },
      }))
    );

    return {
      type: "table",
      x: tableBlock.x ?? 0,
      y: tableBlock.y ?? 0,
      w: tableBlock.w ?? ctx.slideWidth * 0.8,
      h: tableBlock.h ?? ctx.slideHeight * 0.5,
      data: {
        rows: pptxRows,
        options: {
          border: { type: "solid", pt: 0.5, color: "CCCCCC" },
          colW: undefined,
        },
      },
    };
  },
};
