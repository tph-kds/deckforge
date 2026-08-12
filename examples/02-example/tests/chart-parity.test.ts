import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { resolveSlideSnapshot } from "../src/export/snapshot";
import type { ResolvedChartSpec } from "../src/export/snapshot";

function getChartSpec(deck: ReturnType<typeof loadSeedDeck>, slideId: string, blockId: string): ResolvedChartSpec {
  const slide = deck.slides.find((s) => s.id === slideId);
  if (!slide) throw new Error(`Slide ${slideId} not found`);
  const snapshot = resolveSlideSnapshot(slide, deck);
  const block = snapshot.blocks.find((b) => b.id === blockId && b.type === "chart");
  if (!block?.chartSpec) throw new Error(`Chart block ${blockId} not found in snapshot`);
  return block.chartSpec;
}

describe("chart parity: slide1 (b5)", () => {
  const deck = loadSeedDeck();

  it("has orientation vertical", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.orientation).toBe("vertical");
  });

  it("has type bar", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.type).toBe("bar");
  });

  it("has correct categories", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.categories).toEqual(["2016", "2018", "2020", "2022", "2024"]);
  });

  it("has correct values", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.series[0].values).toEqual([1.6, 1.9, 2.1, 2.3, 2.4]);
  });

  it("has highlightIndex 4", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.highlightIndex).toBe(4);
  });

  it("has no 'New chart' title", () => {
    const spec = getChartSpec(deck, "s1", "b5");
    expect(spec.title).not.toMatch(/new chart/i);
  });
});

describe("chart parity: slide3 (b13)", () => {
  const deck = loadSeedDeck();

  it("has orientation vertical", () => {
    const spec = getChartSpec(deck, "s3", "b13");
    expect(spec.orientation).toBe("vertical");
  });

  it("has correct categories", () => {
    const spec = getChartSpec(deck, "s3", "b13");
    expect(spec.categories).toEqual(["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"]);
  });

  it("has correct values", () => {
    const spec = getChartSpec(deck, "s3", "b13");
    expect(spec.series[0].values).toEqual([1.6, 1.7, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.4]);
  });

  it("has highlightIndex 8", () => {
    const spec = getChartSpec(deck, "s3", "b13");
    expect(spec.highlightIndex).toBe(8);
  });
});

describe("chart parity: slide4 (b18)", () => {
  const deck = loadSeedDeck();

  it("has orientation horizontal", () => {
    const spec = getChartSpec(deck, "s4", "b18");
    expect(spec.orientation).toBe("horizontal");
  });

  it("has type bar-horizontal", () => {
    const spec = getChartSpec(deck, "s4", "b18");
    expect(spec.type).toBe("bar-horizontal");
  });

  it("has correct categories", () => {
    const spec = getChartSpec(deck, "s4", "b18");
    expect(spec.categories).toEqual(["Images", "JavaScript", "Fonts", "CSS", "Video & other"]);
  });

  it("has correct values 50/25/7/4/14", () => {
    const spec = getChartSpec(deck, "s4", "b18");
    expect(spec.series[0].values).toEqual([50, 25, 7, 4, 14]);
  });

  it("has highlightIndex 0", () => {
    const spec = getChartSpec(deck, "s4", "b18");
    expect(spec.highlightIndex).toBe(0);
  });
});

describe("chart count invariant", () => {
  it("exported chart count equals source chart count", () => {
    const deck = loadSeedDeck();
    const sourceChartCount = deck.slides
      .flatMap((slide) => slide.blocks)
      .filter((block) => block.type === "chart" && !(block.content as { isTemplate?: boolean })?.isTemplate)
      .length;

    const exportedChartCount = deck.slides
      .flatMap((slide) => {
        const snapshot = resolveSlideSnapshot(slide, deck);
        return snapshot.blocks;
      })
      .filter((block) => block.type === "chart" && block.chartSpec)
      .length;

    expect(exportedChartCount).toBe(sourceChartCount);
  });
});

describe("chart color parity", () => {
  it("series colors are explicit hex values", () => {
    const deck = loadSeedDeck();
    const slide = deck.slides.find((s) => s.id === "s4");
    if (!slide) throw new Error("Slide s4 not found");
    const snapshot = resolveSlideSnapshot(slide, deck);
    const chartBlock = snapshot.blocks.find((b) => b.id === "b18");
    if (!chartBlock?.chartSpec) throw new Error("Chart block b18 not found");

    for (const color of chartBlock.chartSpec.style.seriesColors) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});