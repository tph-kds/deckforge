import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { suggestSlotForBlock } from "../src/deck/layout";
import { applyCommandWithResult } from "../src/deck/commands";
import { prepareExport } from "../src/export/prepare-export";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { derivePptxSlideSize, documentUnitToPptxInches } from "../src/export/geometry";
import type { Block } from "../src/deck/types";

const DATA_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function newImageBlock(id = "b-new-img"): Block {
  return {
    id,
    type: "image",
    content: { assetId: "", fit: "cover", focalPoint: { x: 0.5, y: 0.5 } },
    style: {},
    sourceIds: [],
    positionMode: "slot",
    alt: "A test image",
  };
}

describe("image block slot suggestion", () => {
  it("prefers the image-capable visual slot even when it is at capacity", () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const slot = suggestSlotForBlock(slide, newImageBlock());
    expect(slot).toBe("visual");
  });
});

describe("updateImageSource stores embedded dimensions", () => {
  it("persists the image's pixel dimensions on the manifest asset", () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const added = applyCommandWithResult(deck, {
      type: "addBlock",
      slideId: slide.id,
      block: newImageBlock(),
      slot: "visual",
    }).deck;

    const edited = applyCommandWithResult(added, {
      type: "updateImageSource",
      slideId: slide.id,
      blockId: "b-new-img",
      src: DATA_PNG,
      width: 1,
      height: 1,
    }).deck;

    const block = edited.slides[0].blocks.find((b) => b.id === "b-new-img");
    const assetId = (block?.content as { assetId?: string }).assetId;
    const asset = edited.assets?.find((a) => a.id === assetId);
    expect(asset?.width).toBe(1);
    expect(asset?.height).toBe(1);
  });
});

describe("uploaded image export sizing", () => {
  it("places the image at the frame in PPTX inches with a natural-aspect crop", async () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const added = applyCommandWithResult(deck, {
      type: "addBlock",
      slideId: slide.id,
      block: newImageBlock(),
      slot: "visual",
    }).deck;
    const edited = applyCommandWithResult(added, {
      type: "updateImageSource",
      slideId: slide.id,
      blockId: "b-new-img",
      src: DATA_PNG,
      width: 1,
      height: 1,
    }).deck;

    const prepared = await prepareExport(edited, DEFAULT_PPTX_CONFIG);
    const { slides, report } = await buildExportReport(prepared, DEFAULT_PPTX_CONFIG);
    expect(report.status).not.toBe("failed");

    const element = slides[0].elements.find(
      (e) => e.type === "image" && e.elementId === "b-new-img",
    );
    expect(element).toBeTruthy();
    if (!element || element.type !== "image") return;

    // The frame that the exporter resolved for the block.
    const canvas = edited.canvas;
    const pptxSize = derivePptxSlideSize(canvas.width ?? 1600, canvas.height ?? 900);
    const expectedW = documentUnitToPptxInches(element.w, canvas.width ?? 1600, pptxSize.width);
    const expectedH = documentUnitToPptxInches(element.h, canvas.height ?? 900, pptxSize.height);

    const sizing = element.data.options?.sizing as { w?: number; h?: number } | undefined;
    expect(sizing).toBeTruthy();
    if (!sizing) return;

    // Regression: sizing was fed DOCUMENT PIXELS (frame.w, e.g. 852) which
    // pptxgenjs interprets as EMU when >= 100 and inches when < 100, producing
    // an invisible 0.001"-wide picture. Sizing must now be in PPTX inches.
    expect(sizing.w).toBeLessThan(100);
    expect(sizing.h).toBeLessThan(100);
    expect(sizing.w).toBeCloseTo(expectedW, 4);
    expect(sizing.h).toBeCloseTo(expectedH, 4);

    // Natural dimensions ride along so pptxgenjs can crop cover/contain from
    // the real image aspect instead of stretching the frame.
    expect(element.data.naturalWidth).toBe(1);
    expect(element.data.naturalHeight).toBe(1);

    // The frame itself must be a non-degenerate, in-bounds rectangle.
    expect(element.w).toBeGreaterThan(40);
    expect(element.h).toBeGreaterThan(40);
    expect(element.x + element.w).toBeLessThanOrEqual(canvas.width + 1);
    expect(element.y + element.h).toBeLessThanOrEqual(canvas.height + 1);
  });
});

describe("URL-pasted image without recorded dimensions", () => {
  it("still crops by the embedded bytes' intrinsic aspect ratio", async () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const added = applyCommandWithResult(deck, {
      type: "addBlock",
      slideId: slide.id,
      block: newImageBlock(),
      slot: "visual",
    }).deck;

    // Pasting a URL (or fixing an existing source) replaces the source WITHOUT
    // recorded dimensions — simulating that, no width/height are passed.
    const edited = applyCommandWithResult(added, {
      type: "updateImageSource",
      slideId: slide.id,
      blockId: "b-new-img",
      src: DATA_PNG,
    }).deck;

    const block = edited.slides[0].blocks.find((b) => b.id === "b-new-img");
    const assetId = (block?.content as { assetId?: string }).assetId;
    const asset = edited.assets?.find((a) => a.id === assetId);
    expect(asset?.width).toBeUndefined();
    expect(asset?.height).toBeUndefined();

    const prepared = await prepareExport(edited, DEFAULT_PPTX_CONFIG);
    const { slides, report } = await buildExportReport(prepared, DEFAULT_PPTX_CONFIG);
    expect(report.status).not.toBe("failed");

    const element = slides[0].elements.find(
      (e) => e.type === "image" && e.elementId === "b-new-img",
    );
    expect(element).toBeTruthy();
    if (!element || element.type !== "image") return;

    // Regression: without recorded dims the exporter used to emit NO natural
    // dimensions, so pptxgenjs stretched the source to the frame (aspect
    // distortion). The intrinsic size must now be decoded from the embedded
    // bytes regardless of how the source was provided.
    expect(element.data.naturalWidth).toBe(1);
    expect(element.data.naturalHeight).toBe(1);
  });
});