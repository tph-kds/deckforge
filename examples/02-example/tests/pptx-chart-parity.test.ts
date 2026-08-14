import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSeedDeck } from "../src/deck/seed";
import { resolveSlideSnapshot, type ResolvedChartSpec } from "../src/export/snapshot";
import { buildExportReport, PptxExporter } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import type { PptxSlideElement } from "../src/export/export-types";
import { ChartRenderer } from "../src/render/Chart";

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

function sourceFrame(blockId: string): { x: number; y: number; w: number; h: number } {
  const slide = deck.slides.find((s) => s.blocks.some((b) => b.id === blockId));
  if (!slide) throw new Error(`Block ${blockId} not found`);
  const snapshot = resolveSlideSnapshot(slide, deck);
  const snapBlock = snapshot.blocks.find((b) => b.id === blockId);
  if (!snapBlock) throw new Error(`No snapshot block for ${blockId}`);
  return snapBlock.frame;
}

interface ExportedChart {
  element: PptxSlideElement;
  svg: string;
  alt: string;
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
      if (element.type !== "svg") continue;
      const data = element.data as { svg?: string; alt?: string };
      if (!data.svg?.includes("<svg")) continue;
      out.push({ element, svg: data.svg, alt: data.alt ?? "" });
    }
  }
  return out;
}

async function exportedChartFor(blockId: string): Promise<ExportedChart | undefined> {
  const charts = await allChartElements();
  return charts.find((c) => c.element.elementId === blockId);
}

function stripHash(colors: string[]): string[] {
  return colors.map((c) => c.replace("#", "").toLowerCase());
}

function textContents(svg: string): string[] {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => unescapeXml(m[1]));
}

function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function rectFills(svg: string): string[] {
  return [...svg.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
}

function rectYs(svg: string): number[] {
  return [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(
    (m) => Number(m[2]),
  );
}

/** Assert document-order positions of <text> contents are strictly increasing
 * (order preserved). Searches only the visible text nodes, never the root SVG
 * aria-label/summary attribute which can contain the same strings. */
function expectInOrder(svg: string, values: string[]) {
  const body = textContents(svg).join("\n");
  let last = -1;
  for (const value of values) {
    const pos = body.indexOf(value, last + 1);
    expect(pos, `"${value}" must appear as a visible label`).toBeGreaterThan(last);
    last = pos;
  }
}

describe("strict Web-vs-PPTX chart parity (SVG-raster)", () => {
  it("exports exactly the semantic source charts as SVG images (no templates, no orphans)", async () => {
    const sources = chartSourceBlocks();
    const exported = await allChartElements();
    const sourceIds = new Set(sources.map((s) => s.blockId));

    expect(exported.length).toBe(sources.length);
    for (const { element, svg } of exported) {
      expect(element.type).toBe("svg");
      expect(element.elementId && sourceIds.has(element.elementId)).toBe(true);
      expect(svg.length).toBeGreaterThan(200); // real rendered chart, not a placeholder
    }
    expect(sources.some((s) => s.blockId === "b5")).toBe(true);
    expect(sources.some((s) => s.blockId === "b13")).toBe(true);
    expect(sources.some((s) => s.blockId === "b18")).toBe(true);
    expect(sources.length).toBe(3);
  });

  it("places every chart at its contained 560:300 box (the web's visible drawing region)", async () => {
    for (const { blockId } of chartSourceBlocks()) {
      const exported = await exportedChartFor(blockId);
      expect(exported, `no exported chart for ${blockId}`).toBeDefined();
      if (!exported) continue;
      const frame = sourceFrame(blockId);
      const CHART_ASPECT = 560 / 300;
      const frameAspect = frame.w / frame.h;
      let cw = frame.w;
      let ch = frame.h;
      if (frameAspect > CHART_ASPECT) {
        cw = frame.h * CHART_ASPECT;
      } else {
        ch = frame.w / CHART_ASPECT;
      }
      const cx = frame.x + (frame.w - cw) / 2;
      const cy = frame.y + (frame.h - ch) / 2;
      expect(exported.element.x).toBeCloseTo(cx, 4);
      expect(exported.element.y).toBeCloseTo(cy, 4);
      expect(exported.element.w).toBeCloseTo(cw, 4);
      expect(exported.element.h).toBeCloseTo(ch, 4);
    }
  });

  it("vertical charts keep web order, exact decimals + unit data labels, dashed gridlines", async () => {
    for (const blockId of ["b5", "b13"]) {
      const spec = sourceChartSpec(blockId);
      const exported = await exportedChartFor(blockId);
      expect(exported, `no exported chart for ${blockId}`).toBeDefined();
      if (!exported) continue;

      // Title, in web order of categories, exact data labels with unit.
      expect(exported.svg).toContain(spec.title ?? "");
      expectInOrder(exported.svg, spec.categories);
      expectInOrder(
        exported.svg,
        spec.series[0].values.map((value) => `${value}${spec.unit}`),
      );

      // 5 gridline rows: solid baseline (fraction 0) + 4 dashed gridlines.
      const dashed = [...exported.svg.matchAll(/stroke-dasharray="3 4"/g)];
      expect(dashed.length, `${blockId} four dashed gridlines`).toBe(4);
      const labels = textContents(exported.svg);
      const max = Math.max(...spec.series[0].values);
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        const raw = Math.round(fraction * max * 10) / 10;
        expect(labels, `${blockId} tick label ${raw}`).toContain(String(raw));
      }

      // Per-bar fill: seriesColors already carries the highlight color at the
      // highlight index; data labels use highlight/foreground.
      const fills = rectFills(exported.svg);
      expect(fills.length).toBe(spec.series[0].values.length);
      expect(fills).toEqual(spec.style.seriesColors.map((c) => c.toLowerCase()));
      const highlightIndex = spec.highlightIndex ?? -1;
      if (highlightIndex >= 0) {
        const labelText = `${spec.series[0].values[highlightIndex]}${spec.unit}`;
        const labelEls = [...exported.svg.matchAll(new RegExp(`<text[^>]*>${labelText}</text>`, "gi"))].map(
          (m) => m[0],
        );
        expect(labelEls.length, `at least one label "${labelText}" must exist`).toBeGreaterThan(0);
        const highlightEls = labelEls.filter((el) => {
          const fill = /<text[^>]*fill="([^"]*)"/i.exec(el)?.[1];
          return fill?.toLowerCase() === spec.style.highlightColor.toLowerCase();
        });
        expect(highlightEls, `highlight label "${labelText}" uses the highlight color`).toHaveLength(1);
      }
    }
  });

  it("horizontal chart keeps web top-down category order with 50/25/7/4/14 labels", async () => {
    const exported = await exportedChartFor("b18");
    expect(exported).toBeDefined();
    if (!exported) return;

    const spec = sourceChartSpec("b18");
    expect(spec.orientation).toBe("horizontal");

    // Category order preserved (Images first, top-down) AND no gridline rows.
    expectInOrder(exported.svg, ["Images", "JavaScript", "Fonts", "CSS", "Video & other"]);
    expectInOrder(exported.svg, ["50%", "25%", "7%", "4%", "14%"]);
    expect(exported.svg.match(/stroke-dasharray="3 4"/g) ?? []).toHaveLength(0);

    // Rows render top-down: the first bar's rect y is the smallest.
    const ys = rectYs(exported.svg);
    expect(ys.length).toBe(5);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i], `row ${i} is below row ${i - 1}`).toBeGreaterThan(ys[i - 1]);
    }

    // Highlight (Images) is the first bar, in the highlight color.
    const fills = rectFills(exported.svg);
    expect(fills[0]).toBe(spec.style.highlightColor.toLowerCase());
  });

  it("the PPTX-embedded SVG matches the Web-rendered chart SVG bar-for-bar", async () => {
    for (const { blockId } of chartSourceBlocks()) {
      const block = deck.slides
        .flatMap((s) => s.blocks)
        .find((b) => b.id === blockId && b.type === "chart");
      expect(block).toBeDefined();
      if (!block) continue;

      const webSvg = renderToStaticMarkup(
        createElement(ChartRenderer, {
          chart: block.content as never,
          themeId: "editorial-cream",
          deck,
          block,
        }),
      );
      const webBars = [...webSvg.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
      expect(webBars.length, `no rendered bars for ${blockId}`).toBeGreaterThan(0);

      const exported = await exportedChartFor(blockId);
      expect(exported, `no exported chart for ${blockId}`).toBeDefined();
      if (!exported) continue;

      const pptxBars = rectFills(exported.svg);
      expect(pptxBars, `${blockId} web and PPTX bar fills identical`).toEqual(webBars);

      const webLabels = [...webSvg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => unescapeXml(m[1]));
      const pptxLabels = textContents(exported.svg);
      for (const label of webLabels) {
        expect(pptxLabels, `${blockId} web label "${label}" present`).toContain(label);
      }
    }
  });

  it("never emits a native chart part or a placeholder image (regression: 1.6 rounds to 2)", async () => {
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);
    expect(result.report.status).not.toBe("failed");
    const zip = await JSZipLoad(result);

    // Native charts are gone; charts are rasterized PNGs, so the exact decimal
    // data labels ("2.4MB") can never be rounded by a number format.
    const chartParts = Object.keys(zip.files).filter((n) => /ppt\/charts\/chart\d+\.xml/.test(n));
    expect(chartParts).toHaveLength(0);

    const mediaPng = Object.keys(zip.files).filter((n) => /ppt\/media\/.*\.png/.test(n));
    expect(mediaPng.length).toBeGreaterThanOrEqual(3);
    // No empty placeholder images.
    for (const name of mediaPng) {
      const bytes = await zip.file(name)!.async("uint8array");
      expect(bytes.length).toBeGreaterThan(100);
    }
  });
});

import JSZip from "jszip";
async function JSZipLoad(result: { blob: Blob }): Promise<ReturnType<typeof JSZip.loadAsync>> {
  return JSZip.loadAsync(await result.blob.arrayBuffer());
}