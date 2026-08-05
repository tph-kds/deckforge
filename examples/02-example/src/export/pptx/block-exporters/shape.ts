// export/pptx/block-exporters/shape.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";

interface ShapeBlock {
  id: string;
  type: "shape";
  shapeType?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
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
    const shapeBlock = block as ShapeBlock;
    const pptxShape = SHAPE_MAP[shapeBlock.shapeType ?? "rectangle"] ?? "rect";

    return {
      status: "native",
      issues: [],
      element: {
        type: "shape",
        x: shapeBlock.x ?? 0,
        y: shapeBlock.y ?? 0,
        w: shapeBlock.w ?? 2,
        h: shapeBlock.h ?? 2,
        data: {
          shape: pptxShape,
          options: {
            fill: { color: shapeBlock.fill?.replace("#", "") ?? "FFFFFF" },
            line: {
              color: shapeBlock.stroke?.replace("#", "") ?? "000000",
              width: shapeBlock.strokeWidth ?? 1,
            },
          },
        },
      },
    };
  },
};
