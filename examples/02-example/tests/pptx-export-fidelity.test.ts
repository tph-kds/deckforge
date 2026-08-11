import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { buildExportReport, deriveExportStatus, PptxExporter } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";

function makeDeck(slides: DeckSlide[]): DeckProject {
  return {
    schemaVersion: "2.1",
    meta: { id: "t", slug: "t", title: "T", language: "en" },
    canvas: { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    theme: { id: "editorial-cream" },
    presentation: {},
    editor: { enabled: true },
    slides,
  };
}
function slide(id: string, blocks: Block[]): DeckSlide {
  const slotForType: Record<string, string> = {
    heading: "title",
    text: "subtitle",
    bullets: "subtitle",
    caption: "meta",
    image: "visual",
    video: "visual",
    diagram: "visual",
    chart: "visual",
    shape: "visual",
  };
  const bySlot = new Map<string, string[]>();
  blocks.forEach((block, index) => {
    const slot = slotForType[block.type] ?? (index === 0 ? "title" : "subtitle");
    const ids = bySlot.get(slot) ?? [];
    ids.push(block.id);
    bySlot.set(slot, ids);
  });
  return {
    id,
    title: id,
    layout: "title-hero",
    blocks,
    layoutBindings: Array.from(bySlot.entries()).map(([slot, blockIds]) => ({ slot, blockIds })),
  };
}
function block(id: string, type: string, content: unknown): Block {
  return { id, type, content };
}

describe("export fidelity wiring", () => {
  it("derives complete-with-fallbacks when a diagram is preserved as SVG", async () => {
    const deck = makeDeck([
      slide("s1", [
        block("b1", "heading", "Title"),
        block("b2", "diagram", { nodes: ["A", "B"], edges: ["A->B"] }),
      ]),
    ]);
    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    expect(report.status).toBe("complete-with-fallbacks");
    const diagram = report.slides[0].blocks.find((b) => b.blockId === "b2");
    expect(diagram?.representation).toBe("svg");
    expect(diagram?.contentPreserved).toBe(true);
  });

  it("reports failed when a block exporter errors and produces no element", async () => {
    const deck = makeDeck([
      slide("s1", [
        block("b1", "heading", "Title"),
        block("b2", "chart", { type: "bar", values: 42 }),
      ]),
    ]);
    const { report, fidelity } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    expect(report.status).toBe("failed");
    expect(fidelity.missingVisibleBlocks).toBe(1);
  });

  it("includes a fidelity report on the exporter result for the seed deck", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);
    expect(result.fidelity).toBeDefined();
    expect(result.fidelity?.contentRecall).toBe(1);
    expect(result.fidelity?.missingVisibleBlocks).toBe(0);
    expect(result.archiveVerified).toBe(true);
  }, 60000);

  it("keeps deriveExportStatus compatible with the fidelity layer", () => {
    expect(deriveExportStatus([], [], "complete")).toBe("complete");
  });
});
