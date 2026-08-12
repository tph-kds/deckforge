import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSeedDeck } from "../src/deck/seed";
import { resolveSlideSnapshot, type ResolvedChartSpec } from "../src/export/snapshot";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import type { PptxSlideElement } from "../src/export/export-types";
import { ChartRenderer } from "../src/render/Chart";

interface ChartElementData {
  chartType: string;
  data: Array<{ name: string; labels: string[]; values: number[] }>;
  options: {
    title?: string;
    barDir?: string;
    chartColors?: string[];
    showValue?: boolean;
    dataLabelPosition?: string;
  };
}

const deck = loadSeedDeck();

function chartSourceBlocks(): Array<{ slideId: string; blockId: string }> {
  const out: Array<{ slideId: string; blockId: string }> = [];
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.type !== "chart") continue;
      const content = block.content as { isTemplate?: boolean; values?: unknown } | undefined;
      if (content?.isTemplate) continue;
      if (!Array.isArray(content?.values) || !content.values.length) continue;
      out.push({ slideId: slide.id, blockId: block.id });
    }
  }
  return out;
}

function sourceChartSpec(blockId: string): ResolvedChartSpec {
  const slide = deck.slides.find((s) => s.blocks.some((b) => b.id === blockId));
  if (!slide) throw new Error(`Block ${blockId} not found`);
  const snapshot = resolveSlideSnapshot(slide, deck);
  const snapBlock = snapshot.blocks.find((b) => b.id === blockId);
  if (!snapBlock?.chartSpec) throw new Error(`No chartSpec for ${blockId}`);
  return snapBlock.chartSpec;
}

interface ExportedChart {
  element: PptxSlideElement;
  data: ChartElementData;
}

let cachedSlides: Array<{ slide: unknown; elements: PptxSlideElement[] }> | undefined;

async function exportedElements(): Promise<Array<{ slide: unknown; elements: PptxSlideElement[] }>> {
  if (cachedSlides) return cachedSlides;
  const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
  cachedSlides = slides;
  return slides;
}

async function allChartElements(): Promise<ExportedChart[]> {
  const slides = await exportedElements();
  const out: ExportedChart[] = [];
  for (const slide of slides) {
    for (const element of slide.elements) {
      if (element.type === "chart") {
        out.push({ element, data: element.data as ChartElementData });
      }
    }
  }
  return out;
}

async function exportedChartFor(blockId: string): Promise<ExportedChart | undefined> {
  const charts = await allChartElements();
  return charts.find((c) => c.element.elementId === blockId);
}

function orientationToBarDir(orientation: ResolvedChartSpec["orientation"]): string {
  return orientation === "horizontal" ? "bar" : "col";
}

function stripHash(colors: string[]): string[] {
  return colors.map((c) => c.replace("#", "").toLowerCase());
}

/** Both Web (resolved spec) and PPTX export the same hex string; compare
 * case-insensitively since case carries no color information. */
function expectSameColors(exported: string[] | undefined, spec: string[]) {
  expect(exported).toBeDefined();
  expect(stripHash(exported ?? [])).toEqual(stripHash(spec));
}

describe("strict Web-vs-PPTX chart parity", () => {
  it("exports exactly the semantic source charts (no templates, no orphans)", async () => {
    const sources = chartSourceBlocks();
    const exported = await allChartElements();
    const sourceIds = new Set(sources.map((s) => s.blockId));

    expect(exported.length).toBe(sources.length);
    for (const { element } of exported) {
      expect(element.elementId).toBeDefined();
      expect(element.elementId && sourceIds.has(element.elementId)).toBe(true); // every exported chart has a sourceBlockId
    }
    expect(sources.some((s) => s.blockId === "b5")).toBe(true);
    expect(sources.some((s) => s.blockId === "b13")).toBe(true);
    expect(sources.some((s) => s.blockId === "b18")).toBe(true);
    expect(sources.length).toBe(3);
  });

  it("matches type/orientation, categories, values, series order, colors, labels and frame for every chart", async () => {
    const sources = chartSourceBlocks();

    for (const { blockId } of sources) {
      const spec = sourceChartSpec(blockId);
      const exported = await exportedChartFor(blockId);
      expect(exported, `no exported chart for ${blockId}`).toBeDefined();
      if (!exported) continue;

      const { element, data } = exported;

      // Orientation: persisted on the canonical spec, mapped deterministically.
      expect(data.options.barDir).toBe(orientationToBarDir(spec.orientation));

      // Data parity: exact web categories, values and series order.
      expect(data.data[0].labels).toEqual(spec.categories);
      expect(data.data[0].values).toEqual(spec.series[0].values);
      expect(data.data.map((d) => d.name)).toEqual(spec.series.map((s) => s.name));

      // Color parity: PPTX receives the exact resolved hex values (no office palette).
      expectSameColors(data.options.chartColors, spec.style.seriesColors);

      // Label parity.
      expect(data.options.showValue).toBe(true);
      expect(data.options.dataLabelPosition).toBe("outEnd");

      // Frame parity: exported geometry equals the resolved web geometry.
      const slide = deck.slides.find((s) => s.blocks.some((b) => b.id === blockId))!;
      const snapshot = resolveSlideSnapshot(slide, deck);
      const snapBlock = snapshot.blocks.find((b) => b.id === blockId)!;
      expect(element.x).toBe(snapBlock.frame.x);
      expect(element.y).toBe(snapBlock.frame.y);
      expect(element.w).toBe(snapBlock.frame.w);
      expect(element.h).toBe(snapBlock.frame.h);
    }
  });

  it("slide 1 (b5): only the intended vertical bar chart, no 'New chart'", async () => {
    const slides = await exportedElements();
    const slide1Elements = slides[0]?.elements ?? [];
    const charts = slide1Elements.filter((e) => e.type === "chart");
    expect(charts.length).toBe(1);
    expect(charts[0].elementId).toBe("b5");
    const spec = sourceChartSpec("b5");
    const data = charts[0].data as ChartElementData;
    expect(spec.orientation).toBe("vertical");
    expect(data.options.barDir).toBe("col");
    expect(data.data[0].labels).toEqual(["2016", "2018", "2020", "2022", "2024"]);
    expect(data.data[0].values).toEqual([1.6, 1.9, 2.1, 2.3, 2.4]);
    expect(data.options.title).not.toMatch(/new chart/i);
    expectSameColors(data.options.chartColors, spec.style.seriesColors);
  });

  it("slide 3 (b13): vertical trend chart stays vertical with identical data/colors", async () => {
    const exported = await exportedChartFor("b13");
    expect(exported).toBeDefined();
    if (!exported) return;

    const spec = sourceChartSpec("b13");
    expect(spec.orientation).toBe("vertical");
    expect(exported.data.options.barDir).toBe("col");
    expect(exported.data.data[0].labels).toEqual(spec.categories);
    expect(exported.data.data[0].values).toEqual(spec.series[0].values);
    expectSameColors(exported.data.options.chartColors, spec.style.seriesColors);
  });

  it("slide 4 (b18): horizontal bar stays horizontal with 50/25/7/4/14 and exact colors", async () => {
    const exported = await exportedChartFor("b18");
    expect(exported).toBeDefined();
    if (!exported) return;

    const spec = sourceChartSpec("b18");
    expect(spec.orientation).toBe("horizontal");
    expect(exported.data.options.barDir).toBe("bar");
    expect(exported.data.data[0].labels).toEqual(["Images", "JavaScript", "Fonts", "CSS", "Video & other"]);
    expect(exported.data.data[0].values).toEqual([50, 25, 7, 4, 14]);
    expectSameColors(exported.data.options.chartColors, spec.style.seriesColors);
  });

  it("never leaves chart data to PowerPoint defaults or embeds a placeholder image", async () => {
    const slides = await exportedElements();
    let placeholderCount = 0;
    for (const slide of slides) {
      for (const element of slide.elements) {
        if (element.type === "image") {
          const uri = (element.data as { dataUri?: string }).dataUri ?? "";
          if (uri.length < 1000) placeholderCount++;
        }
        if (element.type === "chart") {
          const colors = (element.data as ChartElementData).options.chartColors ?? [];
          for (const color of colors) {
            expect(color).toMatch(/^[0-9a-f]{6}$/i); // 6-digit hex, never an empty/automatic color
          }
        }
      }
    }
    expect(placeholderCount).toBe(0);
  });

  it("the Web-rendered chart SVG fills match the PPTX-exported colors bar-for-bar", async () => {
    const charts = await allChartElements();
    const blockIds = new Set(chartSourceBlocks().map((s) => s.blockId));

    for (const slide of deck.slides) {
      for (const block of slide.blocks) {
        if (block.type !== "chart") continue;
        const c = block.content as { isTemplate?: boolean; values?: unknown } | undefined;
        if (c?.isTemplate || !Array.isArray(c?.values) || !c.values.length) continue;
        const blockId = block.id;
        if (!blockIds.has(blockId)) continue;

        // Render the chart EXACTLY as the web presenter does: same ChartRenderer,
        // same deck + block so the canonical ResolvedChartSpec drives the colors.
        const svg = renderToStaticMarkup(
          createElement(ChartRenderer, {
            chart: block.content as never,
            themeId: "editorial-cream",
            deck,
            block,
          }),
        );
        const webBars = [...svg.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
        expect(webBars.length, `no rendered bars for ${blockId}`).toBeGreaterThan(0);

        const exported = await exportedChartFor(blockId);
        expect(exported, `no exported chart for ${blockId}`).toBeDefined();
        if (!exported) continue;
        const pptxColors = (exported.data.options.chartColors ?? []).map((c2) => `#${c2.toLowerCase()}`);

        // Bar-for-bar: the i-th Web <rect> fill == the i-th PPTX series color.
        expect(webBars).toEqual(pptxColors);
      }
    }
  });
});
