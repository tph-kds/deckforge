import { describe, expect, it } from "vitest";
import { makeDeckSelfContained, type EmbedFn } from "../src/export/self-contained";
import { applyCommandWithResult } from "../src/deck/commands";
import { runExportPreflight } from "../src/export/export-preflight";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import type { AssetEmbedResult } from "../src/export/pptx/pptx-assets";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";

const DATA_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function makeDeck(slides: DeckSlide[], assets: DeckProject["assets"] = []): DeckProject {
  return {
    schemaVersion: "2.1",
    meta: { id: "t", slug: "t", title: "T", language: "en" },
    canvas: { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    theme: { id: "editorial-cream" },
    presentation: {},
    editor: { enabled: true },
    slides,
    assets,
  };
}

function slide(id: string, blocks: Block[]): DeckSlide {
  return {
    id,
    title: id,
    layout: "title-hero",
    blocks,
    layoutBindings: blocks.map((b, index) => ({
      slot: index === 0 ? "title" : "visual",
      blockIds: [b.id],
    })),
  };
}

function block(id: string, type: string, content: unknown): Block {
  return { id, type, content };
}

function fakeEmbed(
  mapping: Record<string, { dataUri?: string; error?: string }>,
): EmbedFn {
  return async (assetUrl, cache) => {
    if (cache.has(assetUrl)) return { result: cache.get(assetUrl)! };
    const hit = mapping[assetUrl] ?? { dataUri: `data:image/png;base64,${assetUrl}` };
    const result: AssetEmbedResult = hit.dataUri
      ? { dataUri: hit.dataUri, mimeType: "image/png" }
      : { dataUri: "", mimeType: "image/png" };
    cache.set(assetUrl, result);
    return { result, error: hit.error };
  };
}

describe("makeDeckSelfContained", () => {
  it("rewrites a remote manifest asset to a data URI, preserving id/dimensions", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b1", "image", { assetId: "asset-hero", fit: "cover" })])],
      [{ id: "asset-hero", kind: "image", src: "https://example.com/hero.png", mimeType: "image/png", width: 720, height: 480 }],
    );

    const result = await makeDeckSelfContained(deck, fakeEmbed({}));

    expect(result.embedded).toBe(1);
    expect(result.failures).toHaveLength(0);
    const asset = result.deck.assets?.find((a) => a.id === "asset-hero");
    expect(asset?.src).toMatch(/^data:image\/png;base64,/);
    expect(asset?.width).toBe(720);
    expect(asset?.height).toBe(480);
  });

  it("normalizes an inline-only remote image into a manifest asset", async () => {
    const deck = makeDeck([slide("s1", [block("b1", "image", { src: "https://example.com/inline.png", fit: "cover" })])]);

    const result = await makeDeckSelfContained(deck, fakeEmbed({}));

    expect(result.embedded).toBe(1);
    const content = result.deck.slides[0].blocks[0].content as { assetId?: string; src?: string };
    expect(content.assetId).toBeTruthy();
    expect(content.src).toBeUndefined();
    const asset = result.deck.assets?.find((a) => a.id === content.assetId);
    expect(asset?.src).toMatch(/^data:image\/png;base64,/);
  });

  it("passes data: URIs through unchanged", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b1", "image", { assetId: "asset-data" })])],
      [{ id: "asset-data", kind: "image", src: DATA_PNG }],
    );

    const result = await makeDeckSelfContained(deck, fakeEmbed({}));

    expect(result.embedded).toBe(0);
    expect(result.failures).toHaveLength(0);
    expect(result.deck.assets?.find((a) => a.id === "asset-data")?.src).toBe(DATA_PNG);
  });

  it("records a failure and keeps the original source when a fetch fails", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b1", "image", { assetId: "asset-dead" })])],
      [{ id: "asset-dead", kind: "image", src: "https://example.com/dead.png" }],
    );

    const result = await makeDeckSelfContained(
      deck,
      fakeEmbed({ "https://example.com/dead.png": { error: "HTTP 404" } }),
    );

    expect(result.embedded).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].assetId).toBe("asset-dead");
    expect(result.failures[0].error).toContain("404");
    expect(result.deck.assets?.find((a) => a.id === "asset-dead")?.src).toBe(
      "https://example.com/dead.png",
    );
  });

  it("embeds a shared manifest asset exactly once across slides", async () => {
    const deck = makeDeck(
      [
        slide("s1", [block("b1", "image", { assetId: "asset-shared" })]),
        slide("s2", [block("b2", "image", { assetId: "asset-shared" })]),
      ],
      [{ id: "asset-shared", kind: "image", src: "https://example.com/shared.png" }],
    );

    const result = await makeDeckSelfContained(deck, fakeEmbed({}));

    expect(result.embedded).toBe(1);
    expect(result.deck.assets?.filter((a) => a.id === "asset-shared")).toHaveLength(1);
  });

  it("produces a deck that still exports READY after replaceDeck dispatch", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b1", "image", { src: "https://example.com/hero.png" })])],
    );

    const result = await makeDeckSelfContained(deck, fakeEmbed({}));
    const next = applyCommandWithResult(deck, { type: "replaceDeck", deck: result.deck }).deck;

    const preflight = await runExportPreflight(next, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(true);
    expect(preflight.coverage.missing).toBe(0);
  });
});
