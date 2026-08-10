import { describe, expect, it } from "vitest";
import { runExportPreflight } from "../src/export/export-preflight";
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
  return { id, title: id, layout: "title-hero", blocks };
}
function block(id: string, type: string, content: unknown): Block {
  return { id, type, content };
}

describe("runExportPreflight parity estimates", () => {
  it("estimates full recall for an all-native deck", async () => {
    const deck = makeDeck([
      slide("s1", [block("b1", "heading", "T"), block("b2", "text", "Body")]),
    ]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.estimatedRecall).toBe(1);
    expect(result.estimatedMissing).toBe(0);
  });

  it("estimates a fallback for diagram blocks", async () => {
    const deck = makeDeck([
      slide("s1", [block("b1", "diagram", { nodes: ["A"], edges: [] })]),
    ]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.estimatedRecall).toBe(1);
    expect(result.estimatedFallbacks).toBe(1);
    expect(result.estimatedMissing).toBe(0);
  });

  it("estimates missing for unknown block types", async () => {
    const deck = makeDeck([
      slide("s1", [block("b1", "mystery-block", {})]),
    ]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.estimatedMissing).toBe(1);
    expect(result.estimatedRecall).toBe(0);
  });
});
