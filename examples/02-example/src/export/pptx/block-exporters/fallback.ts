import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";
import { renderSnapshotSvg } from "../../fidelity/svg/svg-snapshot";

export const fallbackBlockExporter: PptxBlockExporter = {
  type: "fallback",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const anyBlock = block as Record<string, unknown>;
    const blockType = (anyBlock.type as string) ?? "unknown";
    const frame = (anyBlock.frame as { x?: number; y?: number; w?: number; h?: number } | undefined) ?? {};
    const x = (anyBlock.x as number) ?? frame.x ?? 0;
    const y = (anyBlock.y as number) ?? frame.y ?? 0;
    const w = (anyBlock.w as number) ?? frame.w ?? ctx.slideWidth * 0.5;
    const h = (anyBlock.h as number) ?? frame.h ?? ctx.slideHeight * 0.3;

    const content = anyBlock.content;
    const text = typeof content === "string" ? content : content ? JSON.stringify(content) : "";
    const alt = (anyBlock.alt as string) ?? (anyBlock.ariaLabel as string) ?? "";

    const svg = renderSnapshotSvg({
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
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
        x,
        y,
        w,
        h,
        data: { svg, alt },
      },
    };
  },
};
