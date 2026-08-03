import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

interface DiagramBlock {
  id: string;
  type: "diagram";
  nodes?: Array<{ id: string; label: string }>;
  edges?: Array<{ from: string; to: string }>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const diagramBlockExporter: PptxBlockExporter = {
  type: "diagram",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const diagramBlock = block as DiagramBlock;

    const nodeCount = diagramBlock.nodes?.length ?? 0;
    const edgeCount = diagramBlock.edges?.length ?? 0;
    const summary = `Diagram: ${nodeCount} nodes, ${edgeCount} edges`;

    return {
      type: "fallback",
      x: diagramBlock.x ?? 0,
      y: diagramBlock.y ?? 0,
      w: diagramBlock.w ?? ctx.slideWidth * 0.6,
      h: diagramBlock.h ?? ctx.slideHeight * 0.4,
      data: {
        text: summary,
        options: {
          fill: { color: "F0F0F0" },
          line: { color: "CCCCCC", width: 1 },
        },
      },
    };
  },
};
