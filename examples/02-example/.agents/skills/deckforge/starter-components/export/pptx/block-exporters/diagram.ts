// export/pptx/block-exporters/diagram.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderDiagramSvg } from "../../fidelity/svg/svg-diagram";
import { resolveTheme, hexToPptx } from "../../resolved-theme";
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

    const theme = resolveTheme(ctx.deck);
    const svg = renderDiagramSvg(
      { nodes, edges },
      {
        width: Math.max(1, Math.round(frame.w)),
        height: Math.max(1, Math.round(frame.h)),
        colors: {
          background: hexToPptx(theme.tokens.background),
          nodeFill: hexToPptx(theme.tokens.surface),
          nodeStroke: hexToPptx(theme.tokens.primary),
          labelColor: hexToPptx(theme.tokens.foreground),
          edgeColor: hexToPptx(theme.tokens.muted),
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