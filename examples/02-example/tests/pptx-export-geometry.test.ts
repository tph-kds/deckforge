import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

describe("PPTX export geometry (regression)", () => {
  it("resolves slot-based blocks to sane, in-bounds pixel frames", async () => {
    const deck = loadSeedDeck();
    const { slides, report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).not.toBe("failed");

    const canvas = deck.canvas;
    for (const { elements } of slides) {
      for (const el of elements) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.y).toBeGreaterThanOrEqual(0);
        expect(el.w).toBeGreaterThan(0);
        expect(el.h).toBeGreaterThan(0);
        expect(el.x + el.w).toBeLessThanOrEqual(canvas.width + 1);
        expect(el.y + el.h).toBeLessThanOrEqual(canvas.height + 1);
      }
    }
  });

  it("does not place slot blocks at the origin (the original 0,0 export bug)", async () => {
    const deck = loadSeedDeck();
    const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    const firstSlide = slides[0];
    expect(firstSlide.elements.length).toBeGreaterThan(0);
    for (const el of firstSlide.elements) {
      // Blocks resolved via layoutBindings must have a real frame, not the
      // default 0,0 / 1x1 used when no frame was attached (P0-002).
      expect(el.x + el.y).toBeGreaterThan(0);
    }
  });

  it("reports every block as exported natively or with a known substitution", async () => {
    const deck = loadSeedDeck();
    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    for (const slideReport of report.slides) {
      for (const blockReport of slideReport.blocks) {
        expect(["native", "rasterized", "substituted", "skipped"]).toContain(
          blockReport.status,
        );
        if (blockReport.status === "skipped") {
          expect(
            blockReport.issues.some((issue) => issue.code === "block-hidden-skipped"),
          ).toBe(true);
        }
      }
    }
  });
});
