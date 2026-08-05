import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
} from "../../export-types";

export const fallbackBlockExporter: PptxBlockExporter = {
  type: "fallback",
  exportability: "image-only",

  async export(block: unknown, _ctx: PptxExportContext): Promise<PptxBlockExport> {
    const anyBlock = block as Record<string, unknown>;
    const blockType = (anyBlock.type as string) ?? "unknown";

    return {
      status: "unsupported",
      issues: [
        {
          code: "unsupported-block",
          severity: "warning",
          message: `Block type "${blockType}" cannot be exported to PPTX and was omitted`,
          suggestedFix: "Replace it with a supported block type (text, image, chart, shape, table, diagram)",
          automaticFixAvailable: false,
        },
      ],
    };
  },
};
