// export/pptx/block-exporters/fallback.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderSnapshotSvg } from "../../fidelity/svg/svg-snapshot";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import type { Block } from "../../../deck/types";

export const fallbackBlockExporter: PptxBlockExporter = {
  type: "fallback",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const anyBlock = block as Block;
    const frame = exportFrameOf(anyBlock);
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(anyBlock.id, "fallback blocks require a resolved frame")],
      };
    }

    const blockType = anyBlock.type ?? "unknown";
    const content = anyBlock.content;
    const text = typeof content === "string" ? content : content ? JSON.stringify(content) : "";
    const alt = anyBlock.alt ?? anyBlock.ariaLabel ?? "";

    const finalW = Math.max(100, frame.w);
    const finalH = Math.max(60, frame.h);

    const svg = renderSnapshotSvg({
      width: Math.round(finalW),
      height: Math.round(finalH),
      title: blockType,
      text,
      alt,
    });

    return {
      status: "rasterized",
      issues: [
        {
          code: "no-fallback-produced",
          severity: "info",
          message: `Block type "${blockType}" has no native representation and was exported as a visual snapshot`,
          suggestedFix: "Add a dedicated exporter for this block type for native editability",
          automaticFixAvailable: false,
        },
      ],
      element: {
        type: "svg",
        elementId: anyBlock.id,
        ...frame,
        data: { svg, alt },
      },
    };
  },
};