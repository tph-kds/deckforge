// export/pptx/block-exporters/shape.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { Block } from "../../../deck/types";

interface ShapeBlock {
  shapeType?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

const SHAPE_MAP: Record<string, string> = {
  rectangle: "rect",
  "rounded-rectangle": "roundRect",
  ellipse: "ellipse",
  diamond: "diamond",
  triangle: "triangle",
  arrow: "rightArrow",
  star: "star5",
  hexagon: "hexagon",
};

export const shapeBlockExporter: PptxBlockExporter = {
  type: "shape",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const shapeBlock = block as Block;
    const frame = exportFrameOf(shapeBlock);
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(shapeBlock.id, "shape blocks require a resolved frame")],
      };
    }

    const props = shapeBlock.content as ShapeBlock | undefined;
    const pptxShape = SHAPE_MAP[props?.shapeType ?? "rectangle"] ?? "rect";

    return {
      status: "native",
      issues: [],
      element: {
        type: "shape",
        elementId: shapeBlock.id,
        ...frame,
        data: {
          shape: pptxShape,
          options: {
            fill: { color: props?.fill?.replace("#", "") ?? "FFFFFF" },
            line: {
              color: props?.stroke?.replace("#", "") ?? "000000",
              width: props?.strokeWidth ?? 1,
            },
          },
        },
      },
    };
  },
};