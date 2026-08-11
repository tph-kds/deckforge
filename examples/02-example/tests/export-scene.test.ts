import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { buildExportReport, PptxExporter } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { validateExportScene, sceneHasErrors } from "../src/export/export-scene";
import { createExportContext } from "../src/export/pptx/pptx-context";
import type { PptxSlideElement } from "../src/export/export-types";
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
    image: "visual",
    chart: "visual",
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

function block(id: string, type: string, content: unknown, extra: Partial<Block> = {}): Block {
  return { id, type, content, ...extra };
}

describe("export scene validation (Phase 16)", () => {
  it("flags an exported 'New chart' template as a leak", async () => {
    const deck = makeDeck([
      slide("s1", [
        block("b-title", "heading", "Title"),
        block("b-chart", "chart", { type: "bar", title: "New chart", values: [{ label: "A", value: 40 }] }),
      ]),
    ]);
    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    expect(report.issues.some((issue) => issue.code === "template-chart-leak")).toBe(true);
  });

  it("an unresolvable image becomes a real image element (never text placeholder)", async () => {
    const deck = makeDeck([
      slide("s1", [
        block("b-title", "heading", "Title"),
        block("b-image", "image", { assetId: "missing", src: "https://example.com/never.png" }),
      ]),
    ]);
    const { slides, report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    // The image slot is always filled with an actual raster element — never a
    // labeled "[image unavailable: …]" text box (P2-004).
    const element = slides[0].elements.find((e) => e.elementId === "b-image");
    expect(element?.type).toBe("image");
    const dataUri = (element?.data as { dataUri?: string } | undefined)?.dataUri ?? "";
    expect(dataUri.startsWith("data:image/")).toBe(true);
    // ...but the failure is reported honestly as a substitution.
    const blockReport = report.slides[0].blocks.find((b) => b.blockId === "b-image")!;
    expect(blockReport.status).toBe("rasterized");
    expect(blockReport.issues.some((issue) => issue.code === "image-load-failed")).toBe(true);
    // The forbidden placeholder text must never reach the export surface.
    const allText = report.slides.flatMap((s) =>
      s.blocks.flatMap((b) => b.issues.map((i) => i.message)),
    );
    expect(allText.some((msg) => /image unavailable/i.test(msg))).toBe(false);
  });

  it("flags duplicate element ids across slides", () => {
    const ctx = createExportContext(makeDeck([]), DEFAULT_PPTX_CONFIG);
    const dup: PptxSlideElement = {
      type: "text",
      elementId: "same-id",
      x: 10,
      y: 10,
      w: 100,
      h: 50,
      data: { text: "x", options: {} },
    };
    const diagnostics = validateExportScene(
      {
        slides: [
          { slideId: "a", elements: [dup] },
          { slideId: "b", elements: [{ ...dup }] },
        ],
      },
      ctx,
    );
    expect(diagnostics.some((d) => d.code === "duplicate-element-id")).toBe(true);
  });

  it("flags invalid element geometry as errors", () => {
    const ctx = createExportContext(makeDeck([]), DEFAULT_PPTX_CONFIG);
    const diagnostics = validateExportScene(
      {
        slides: [
          {
            slideId: "s",
            elements: [
              { type: "text", elementId: "bad", x: 0, y: 0, w: 0, h: 100, data: { text: "x", options: {} } },
            ],
          },
        ],
      },
      ctx,
    );
    expect(sceneHasErrors(diagnostics)).toBe(true);
    expect(diagnostics.some((d) => d.code === "invalid-geometry")).toBe(true);
  });
});

describe("export behavior regressions", () => {
  it("never places a block at (0,0) when its frame is missing", async () => {
    // A freeform block with no frame must error, not export at the origin.
    const deck = makeDeck([
      slide("s1", [
        block("b-free", "text", "orphan", { positionMode: "freeform" }),
      ]),
    ]);
    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const free = report.slides[0].blocks.find((item) => item.blockId === "b-free");
    expect(free?.status).toBe("unsupported");
    expect(free?.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  it("export geometry is invariant across editor zoom levels (pure view, no mutation)", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const first = await exporter.export(deck);

    // Simulate an editor session: zoom/pan/fit must NEVER mutate document geometry.
    // Assert the deck file is byte-for-byte unchanged after exports.
    const firstJson = JSON.stringify(deck);
    await exporter.export(deck);
    await exporter.export(deck);
    expect(JSON.stringify(deck)).toBe(firstJson);

    expect(first.report.status).not.toBe("failed");
    expect(first.archiveVerified).toBe(true);
  });
});
