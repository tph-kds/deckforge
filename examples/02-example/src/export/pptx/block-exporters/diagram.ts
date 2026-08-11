// export/pptx/block-exporters/diagram.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderDiagramSvg } from "../../fidelity/svg/svg-diagram";
import { mapThemeColors } from "../pptx-theme";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { Block } from "../../../deck/types";

interface DiagramContent {
  nodes?: Array<{ id?: string; label: string } | string>;
  edges?: Array<{ from: string; to: string } | string>;
}

export const diagramBlockExporter: PptxBlockExporter = {
  type: "diagram",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const diagramBlock = block as Block;
    const frame = exportFrameOf(diagramBlock);
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(diagramBlock.id, "diagram blocks require a resolved frame")],
      };
    }

    const content = diagramBlock.content as DiagramContent | undefined;
    const nodes = content?.nodes ?? [];
    const edges = content?.edges ?? [];

    const theme = mapThemeColors(ctx.deck.theme);
    const svg = renderDiagramSvg(
      { nodes, edges },
      {
        width: Math.max(1, Math.round(frame.w)),
        height: Math.max(1, Math.round(frame.h)),
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
        elementId: diagramBlock.id,
        ...frame,
        data: { svg, alt: (diagramBlock as { alt?: string }).alt },
      },
    };
  },
};