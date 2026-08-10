import { describe, expect, it } from "vitest";
import type { FidelityReport } from "../src/export/fidelity/fidelity-types";
import type { PptxExportResult, PptxSlideElementType } from "../src/export/export-types";

describe("export schema", () => {
  it("accepts the four-value fidelity status order", () => {
    const order: Array<"complete" | "complete-with-fallbacks" | "partial" | "failed"> = [
      "complete",
      "complete-with-fallbacks",
      "partial",
      "failed",
    ];
    expect(order).toHaveLength(4);
  });

  it("defines PptxExportResult with an optional fidelity report", () => {
    const result: PptxExportResult = {
      report: { status: "complete", slides: [], issues: [] },
      blob: new Blob(),
      archiveVerified: true,
      fidelity: { status: "complete", contentRecall: 1, missingVisibleBlocks: 0, blocks: [] },
    };
    expect(result.fidelity?.status).toBe("complete");
  });

  it("allows an svg slide element type", () => {
    const t: PptxSlideElementType = "svg";
    expect(t).toBe("svg");
  });
});
