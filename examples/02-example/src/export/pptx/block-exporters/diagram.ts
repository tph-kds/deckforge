import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";

interface DiagramBlock {
  id: string;
  type: "diagram";
  nodes?: Array<{ id: string; label: string }>;
  edges?: Array<{ from: string; to: string }>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  frame?: { x?: number; y?: number; w?: number; h?: number };
}

export const diagramBlockExporter: PptxBlockExporter = {
  type: "diagram",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const diagramBlock = block as DiagramBlock;

    const nodeCount = diagramBlock.nodes?.length ?? 0;
    const edgeCount = diagramBlock.edges?.length ?? 0;
    const summary = `Diagram: ${nodeCount} nodes, ${edgeCount} edges`;

    return {
      status: "substituted",
      issues: [
        {
          code: "unsupported-block",
          severity: "warning",
          message: "Diagram exported as a simplified text summary; nodes and edges are not preserved",
          suggestedFix: "Rebuild the diagram as shapes and text blocks for native fidelity",
          automaticFixAvailable: false,
        },
      ],
      element: {
        type: "fallback",
        x: diagramBlock.x ?? diagramBlock.frame?.x ?? 0,
        y: diagramBlock.y ?? diagramBlock.frame?.y ?? 0,
        w: diagramBlock.w ?? diagramBlock.frame?.w ?? ctx.slideWidth * 0.6,
        h: diagramBlock.h ?? diagramBlock.frame?.h ?? ctx.slideHeight * 0.4,
        data: {
          text: summary,
          options: {
            fill: { color: "F0F0F0" },
            line: { color: "CCCCCC", width: 1 },
          },
        },
      },
    };
  },
};
