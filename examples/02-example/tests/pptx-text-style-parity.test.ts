import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { browserFontSizeToPptPt, derivePptxSlideSize } from "../src/export/geometry";
import { resolvePptxFont } from "../src/export/pptx/pptx-fonts";
import type { PptxSlideElement } from "../src/export/export-types";
import type { Block, DeckProject } from "../src/deck/types";

function block(id: string, type: string, content: unknown, extra: Partial<Block> = {}): Block {
  return { id, type, content, ...extra };
}

const deck = loadSeedDeck();
const canvas = deck.canvas ?? { width: 1600, height: 900 };
const pptxSize = derivePptxSlideSize(canvas.width, canvas.height);
const pt = (px: number) => browserFontSizeToPptPt(px, canvas.height, pptxSize.height);

interface TextLike {
  text?: string | Array<{ text?: string }>;
  options?: Record<string, unknown>;
}

function asText(el: PptxSlideElement): TextLike {
  return el.data as TextLike;
}

function runsOf(el: PptxSlideElement): Array<{ text: string; options?: Record<string, unknown> }> {
  const data = el.data as { text?: string | Array<{ text?: string; options?: Record<string, unknown> }> };
  return Array.isArray(data.text) ? (data.text as Array<{ text: string; options?: Record<string, unknown> }>) : [];
}

async function elementFor(blockId: string): Promise<PptxSlideElement | undefined> {
  const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
  for (const s of slides) {
    // A block can emit several elements (e.g. a callout = accent shape + text);
    // the semantic text content lives in text elements, so prefer those.
    const el =
      s.elements.find((e) => e.elementId === blockId && e.type !== "shape") ??
      s.elements.find((e) => e.elementId === blockId);
    if (el) return el;
  }
  return undefined;
}

const HEADINGS = ["b2", "b8", "b12", "b17", "b21", "b25", "b32"];

describe("strict web-vs-PPTX text style parity", () => {
  it("headings export in the theme heading font, not the body font", async () => {
    const headingFont = resolvePptxFont("Libre Baskerville"); // Georgia
    for (const id of HEADINGS) {
      const el = await elementFor(id);
      expect(el, `no element for ${id}`).toBeDefined();
      const opts = asText(el!).options ?? {};
      expect(opts.fontFace, `heading ${id} uses heading font`).toBe(headingFont);
    }
  });

  it("heading level 1 carries the web letter-spacing (-0.02em -> negative charSpacing)", async () => {
    const el = await elementFor("b2");
    expect(el).toBeDefined();
    expect(asText(el!).options?.charSpacing).toBeLessThan(0);
  });

  it("kicker text is uppercased and carries letter-spacing (0.14em -> positive charSpacing)", async () => {
    const el = await elementFor("b1");
    expect(el).toBeDefined();
    const opts = asText(el!).options ?? {};
    expect(opts.charSpacing).toBeGreaterThan(0);
    expect(opts.bold).toBe(true);
    expect(asText(el!).text).toBe(String(asText(el!).text).toUpperCase());
  });

  it("a lowercase kicker is uppercased in the export like the web text-transform", async () => {
    const lowercaseDeck: DeckProject = {
      schemaVersion: "2.1",
      meta: { id: "k", slug: "k", title: "K", language: "en" },
      canvas: { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
      theme: { id: "editorial-cream" },
      presentation: {},
      editor: { enabled: true },
      slides: [
        {
          id: "s-k",
          title: "kicker",
          layout: "title-hero",
          blocks: [
            block("bk-1", "text", "web performance · a data story", {
              style: { variant: "kicker" },
              slot: "kicker",
              positionMode: "slot",
            }),
            block("bk-2", "heading", "Title", {
              style: { level: 1 },
              slot: "title",
              positionMode: "slot",
            }),
          ],
          layoutBindings: [
            { slot: "kicker", blockIds: ["bk-1"] },
            { slot: "title", blockIds: ["bk-2"] },
          ],
        },
      ],
      assets: [],
    };
    const { slides } = await buildExportReport(lowercaseDeck, DEFAULT_PPTX_CONFIG);
    const el = slides[0].elements.find((e) => e.elementId === "bk-1");
    expect(el).toBeDefined();
    expect(asText(el!).text).toBe("WEB PERFORMANCE · A DATA STORY");
  });

  it("callout blocks export in the foreground color, italic", async () => {
    for (const id of ["b23", "b30", "b33"]) {
      const el = await elementFor(id);
      expect(el, `no element for ${id}`).toBeDefined();
      const opts = asText(el!).options ?? {};
      expect(opts.color, `callout ${id} is foreground, not muted`).toBe("0F172A");
      expect(opts.italic).toBe(true);
      expect(opts.bold, `callout ${id} is italic weight 400 on the web, not bold`).not.toBe(true);
    }
  });

  it("callout blocks get the 3px secondary accent bar and inset top-aligned text", async () => {
    const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const slide5 = slides.find((s) => (s.slide as { id?: string }).id === "s5");
    expect(slide5).toBeDefined();
    const elements = slide5?.elements ?? [];
    const accent = elements.find((e) => e.elementId === "b23" && e.type === "shape");
    expect(accent).toBeDefined();
    const accentOpts = (accent!.data as { options?: Record<string, unknown> }).options ?? {};
    expect(accent!.w).toBe(3);
    expect(accentOpts.fill).toEqual({ color: "B45309" }); // theme secondary
    const textEl = elements.find((e) => e.elementId === "b23" && e.type === "text");
    expect(textEl).toBeDefined();
    const frame = { x: 188, y: 655, w: 1224, h: 83 };
    expect(textEl!.x).toBeCloseTo(frame.x + 3 + 0.8 * 19, 1); // border + 0.8em at 19px
    expect(textEl!.y).toBeCloseTo(frame.y + 0.4 * 19, 1); // 0.4em at 19px
    expect((asText(textEl!).options ?? {}).valign).toBe("top");
  });

  it("heading level 3 is bold (web <h2> default weight), level 1 stays 400", async () => {
    const el8 = await elementFor("b8");
    expect(el8).toBeDefined();
    expect((asText(el8!).options ?? {}).bold).toBe(true);
    const el2 = await elementFor("b2");
    expect((asText(el2!).options ?? {}).bold).toBe(false);
  });

  it("metric text flows from the top with the web margin-top spacing between runs", async () => {
    const el = await elementFor("b7");
    expect(el).toBeDefined();
    const opts = asText(el!).options ?? {};
    expect(opts.valign).toBe("top");
    const runs = runsOf(el!);
    const valueAfter = Number(runs[0]?.options?.paraSpaceAfter ?? 0);
    const labelAfter = Number(runs[1]?.options?.paraSpaceAfter ?? 0);
    expect(valueAfter).toBeGreaterThan(0); // 0.4em label margin-top
    expect(labelAfter).toBeGreaterThan(0); // 0.5em delta margin-top
  });

  it("bullets are 16px, inset by the web 1.1em padding, with a 0.4em inter-item gap", async () => {
    const el = await elementFor("b26");
    expect(el).toBeDefined();
    const runs = runsOf(el!);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]?.options?.fontSize).toBe(pt(16)); // inherited body font-size
    expect(el!.x).toBeCloseTo(64 + 17.6, 1); // padding-left 1.1em at 16px
    const firstLineAfter = Number(runs[1]?.options?.paraSpaceAfter ?? 0);
    const lastLineAfter = Number(runs[runs.length - 1]?.options?.paraSpaceAfter ?? 0);
    expect(firstLineAfter).toBeGreaterThan(0); // 0.4em gap between items
    expect(lastLineAfter).toBe(0); // no trailing gap after the last item
  });

  it("a text block with the callout variant uses the fixed 15px size the web applies", async () => {
    const el = await elementFor("b14");
    expect(el).toBeDefined();
    expect(asText(el!).options?.fontSize).toBe(pt(15));
  });

  it("metric exports value/label/delta as distinct styled runs matching the web", async () => {
    const el = await elementFor("b7");
    expect(el).toBeDefined();
    const runs = runsOf(el!);
    expect(runs.length).toBeGreaterThanOrEqual(3);

    const [valueRun, labelRun, deltaRun] = runs;
    expect(valueRun.options?.color).toBe("2B2118"); // theme primary
    expect(valueRun.options?.fontFace).toBe(resolvePptxFont("Libre Baskerville"));
    expect(Number(valueRun.options?.fontSize)).toBeGreaterThanOrEqual(pt(60)); // huge value number
    expect(valueRun.options?.bold).toBe(false); // web .metric-value is weight 400

    expect(labelRun.options?.color).toBe("64748B"); // theme muted
    expect(labelRun.options?.bold).toBe(false);

    expect(deltaRun.options?.color).toBe("B45309"); // theme secondary
    expect(deltaRun.options?.bold).toBe(true);
  });

  it("bullets render a secondary-colored bullet marker before each line", async () => {
    for (const id of ["b26", "b27"]) {
      const el = await elementFor(id);
      expect(el).toBeDefined();
      const runs = runsOf(el!);
      expect(runs.length).toBeGreaterThan(1);
      const markerRun = runs[0];
      expect(markerRun.text.includes("•")).toBe(true);
      expect(markerRun.options?.color).toBe("B45309"); // theme secondary
    }
  });

  it("chart exports as a web-identical SVG with the unit-bearing data labels", async () => {
    const el = await elementFor("b5");
    expect(el).toBeDefined();
    expect(el!.type).toBe("svg");
    const svg = (el!.data as { svg?: string }).svg ?? "";
    expect(svg).toContain("Median desktop page weight");
    // Web data label is `${value}${unit}` with no separator and no axis title.
    expect(svg).toContain("1.6MB");
    expect(svg).toContain("2.4MB");
    expect(svg).toContain('stroke-dasharray="3 4"'); // dashed gridlines like the web
  });
});
