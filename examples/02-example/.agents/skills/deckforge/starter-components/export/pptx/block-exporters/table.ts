// export/pptx/block-exporters/table.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { Block } from "../../../deck/types";

interface TableCell {
  text: string;
  bold?: boolean;
  color?: string;
  fill?: string;
}

interface TableBlockContent {
  rows: TableCell[][];
  headerRow?: boolean;
}

export const tableBlockExporter: PptxBlockExporter = {
  type: "table",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const tableBlock = block as Block;
    const frame = exportFrameOf(tableBlock);
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(tableBlock.id, "table blocks require a resolved frame")],
      };
    }

    const content = tableBlock.content as TableBlockContent | undefined;
    const rows = content?.rows ?? [];
    const headerRow = content?.headerRow ?? false;

    const pptxRows = rows.map((row, rowIdx) =>
      row.map((cell) => ({
        text: cell.text,
        options: {
          bold: cell.bold ?? (headerRow && rowIdx === 0),
          color: cell.color?.replace("#", "") ?? "000000",
          fill: { color: cell.fill?.replace("#", "") ?? "FFFFFF" },
          valign: "middle",
          margin: [0.1, 0.1, 0.1, 0.1],
        },
      }))
    );

    return {
      status: "native",
      issues: [],
      element: {
        type: "table",
        elementId: tableBlock.id,
        ...frame,
        data: {
          rows: pptxRows,
          options: {
            border: { type: "solid", pt: 0.5, color: "CCCCCC" },
            colW: undefined,
          },
        },
      },
    };
  },
};