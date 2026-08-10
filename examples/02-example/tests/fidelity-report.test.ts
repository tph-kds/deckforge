import { describe, expect, it } from "vitest";
import type { DeckProject } from "../src/deck/types";
import type { ExportBlockReport } from "../src/export/export-types";
import { FIDELITY_POLICY } from "../src/export/fidelity/fidelity-policy";
import {
  buildFidelityReport,
  countRepresentation,
  fidelityStatus,
} from "../src/export/fidelity/fidelity-report";
import type { FidelityBlockReport, PptxFidelityPolicy } from "../src/export/fidelity/fidelity-types";

function report(overrides: Partial<FidelityBlockReport> = {}): FidelityBlockReport {
  return {
    blockId: "b1",
    status: "native",
    issues: [],
    representation: "native",
    contentPreserved: true,
    editable: true,
    visualParity: 1,
    ...overrides,
  };
}

function deckWith(blocks: ExportBlockReport[]): DeckProject {
  const visibility = new Map(blocks.map((b) => [b.blockId, b.status === "skipped"]));
  return {
    meta: { title: "Test" },
    theme: {} as DeckProject["theme"],
    slides: [
      {
        id: "s1",
        title: "Slide",
        layout: "title",
        blocks: blocks.map((b) => ({
          id: b.blockId,
          type: "text",
          content: { text: "meaningful content words are preserved across the export" },
          hidden: visibility.get(b.blockId) ?? false,
        })),
      },
    ],
  } as DeckProject;
}

describe("fidelityStatus", () => {
  it("reports complete when all content is natively preserved", () => {
    const blocks = [report()];
    expect(fidelityStatus(1, blocks, FIDELITY_POLICY)).toBe("complete");
  });

  it("reports complete-with-fallbacks when any block used a fallback representation", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "raster", contentPreserved: false })];
    expect(fidelityStatus(1, blocks, FIDELITY_POLICY)).toBe("complete-with-fallbacks");
  });

  it("reports failed when content recall drops below the hard threshold", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "unsupported" })];
    expect(fidelityStatus(0.5, blocks, FIDELITY_POLICY)).toBe("failed");
  });

  it("reports failed when a visible block is unsupported (omitted content blocks the gate)", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "unsupported" })];
    expect(fidelityStatus(0.95, blocks, FIDELITY_POLICY)).toBe("failed");
  });

  it("reports failed when an error issue is present", () => {
    const blocks = [
      report({ issues: [{ code: "block-export-failed", severity: "error", message: "boom", automaticFixAvailable: false }] }),
    ];
    expect(fidelityStatus(1, blocks, FIDELITY_POLICY)).toBe("failed");
  });

  it("ignores skipped blocks when deciding status", () => {
    const blocks = [report(), report({ blockId: "b2", status: "skipped", representation: "unsupported" })];
    expect(fidelityStatus(1, blocks, FIDELITY_POLICY)).toBe("complete");
  });
});

describe("countRepresentation", () => {
  it("counts blocks per representation", () => {
    const blocks = [
      report(),
      report({ blockId: "b2", representation: "svg" }),
      report({ blockId: "b3", representation: "svg" }),
    ];
    expect(countRepresentation(blocks, "svg")).toBe(2);
    expect(countRepresentation(blocks, "native")).toBe(1);
  });
});

describe("buildFidelityReport", () => {
  it("builds a complete report for an all-native deck", () => {
    const blocks = [report()];
    const r = buildFidelityReport({ deck: deckWith(blocks), blocks });
    expect(r.status).toBe("complete");
    expect(r.contentRecall).toBe(1);
    expect(r.missingVisibleBlocks).toBe(0);
  });

  it("flags fallback representations without failing the export", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "expanded-build", editable: false, visualParity: 0.95 })];
    const r = buildFidelityReport({ deck: deckWith(blocks), blocks });
    expect(r.status).toBe("complete-with-fallbacks");
    expect(r.blocks).toHaveLength(2);
  });

  it("counts unsupported visible blocks as missing", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "unsupported", contentPreserved: false })];
    const r = buildFidelityReport({ deck: deckWith(blocks), blocks });
    expect(r.status).toBe("failed");
    expect(r.missingVisibleBlocks).toBe(1);
  });

  it("respects a custom policy threshold", () => {
    const blocks = [report(), report({ blockId: "b2", representation: "unsupported" })];
    const custom: PptxFidelityPolicy = { ...FIDELITY_POLICY, hardRules: { ...FIDELITY_POLICY.hardRules, meaningfulContentRecall: 0 } };
    const r = buildFidelityReport({ deck: deckWith(blocks), blocks, policy: custom });
    expect(r.status).toBe("failed");
  });

  it("never marks skipped blocks as missing", () => {
    const blocks = [report(), report({ blockId: "b2", status: "skipped", representation: "unsupported" })];
    const r = buildFidelityReport({ deck: deckWith(blocks), blocks });
    expect(r.status).toBe("complete");
    expect(r.missingVisibleBlocks).toBe(0);
  });
});
