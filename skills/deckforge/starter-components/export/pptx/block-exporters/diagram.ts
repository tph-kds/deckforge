import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderDiagramSvg } from "../../fidelity/svg/svg-diagram";
import { mapThemeColors } from "../pptx-theme";

interface DiagramBlock {
  id: string;
  type: "diagram";
  nodes?: Array<{ id?: string; label: string } | string>;
  edges?: Array<{ from: string; to: string } | string>;
  content?: { nodes?: Array<{ id?: string; label: string } | string>; edges?: Array<{ from: string; to: string } | string> };
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
    const content = diagramBlock.content;
    const nodes = content?.nodes ?? diagramBlock.nodes ?? [];
    const edges = content?.edges ?? diagramBlock.edges ?? [];
    const x = diagramBlock.x ?? diagramBlock.frame?.x ?? 0;
    const y = diagramBlock.y ?? diagramBlock.frame?.y ?? 0;
    const w = diagramBlock.w ?? diagramBlock.frame?.w ?? ctx.slideWidth * 0.6;
    const h = diagramBlock.h ?? diagramBlock.frame?.h ?? ctx.slideHeight * 0.4;

    const theme = mapThemeColors(ctx.deck.theme);
    const svg = renderDiagramSvg(
      { nodes, edges },
      {
        width: Math.max(1, Math.round(w)),
        height: Math.max(1, Math.round(h)),
        colors: {
          background: theme.background,
          nodeFill: theme.light1,
          nodeStroke: theme.accent1,
          labelColor: theme.text,
          edgeColor: theme.dark2,
        },
      }
    );

    return {
      status: "rasterized",
      issues: [],
      element: {
        type: "svg",
        x,
        y,
        w,
        h,
        data: { svg, alt: (diagramBlock as { alt?: string }).alt },
      },
    };
  },
};
