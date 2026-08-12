// tests/asset-resolution.test.ts
//
// Regression suite for the unified asset-resolution architecture (P2-004).
//
// The old pipeline had two independent, contradictory asset paths: a
// synchronous, manifest-presence-only preflight that reported "Ready to
// export / Coverage 100% / Missing 0" even when the PPTX exporter's separate
// network-fetching pre-resolution pass failed ("Failed to resolve asset
// inline-image"). The fix centralizes resolution in ONE `prepareExport` phase;
// preflight, fidelity accounting, and the PPTX exporter all consume the same
// frozen `PreparedExport`, and an unresolved required visible image BLOCKS a
// Fidelity First export before READY.
//
// Required coverage (DoD):
//   1. valid image                      → READY, Missing 0, export ok
//   2. unknown block.assetId            → BLOCKED, Missing > 0
//   3. remote fetch fails               → BLOCKED before export
//   4. data: URI                        → READY, export ok
//   5. persistence save/reload          → stays resolvable
//   6. no double resolution             → asset fetched once per preparation
//   7. fidelity accounting              → unresolved image can never be
//                                         "Coverage 100% / Missing 0 / invariants OK"

import { describe, expect, it, vi, afterEach } from "vitest";
import { prepareExport } from "../src/export/prepare-export";
import { runExportPreflight } from "../src/export/export-preflight";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { applyCommandWithResult } from "../src/deck/commands";
import { saveDeck, loadDeck } from "../src/deck/persistence";
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

/** A fetch stub that resolves to the given status/bytes or records failures. */
function stubFetch(options: { status?: number; bytes?: Uint8Array; failWith?: string }): { fetchMock: ReturnType<typeof vi.fn> } {
  const fetchMock = vi.fn(async (url: string) => {
    if (options.failWith) throw new Error(options.failWith);
    if ((options.status ?? 200) >= 400) return { ok: false, status: options.status } as Response;
    const bytes = options.bytes ?? new Uint8Array([1, 2, 3]);
    return {
      ok: true,
      blob: async () => ({
        type: "image/png",
        arrayBuffer: async () => bytes.buffer as ArrayBuffer,
      }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asset resolution parity: preflight and exporter share ONE prepared result", () => {
  it("1. a valid image reports READY with Missing 0 and exports cleanly", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b-img", "image", { assetId: "asset-hero", fit: "cover" })])],
      [{ id: "asset-hero", kind: "image", src: DATA_PNG }],
    );

    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(true);
    expect(preflight.coverage.missing).toBe(0);
    expect(preflight.coverage.satisfied).toBe(true);

    const report = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const image = report.report.slides[0].blocks.find((b) => b.blockId === "b-img");
    expect(image?.status).toBe("native");
  });

  it("2. an unknown block.assetId BLOCKS with Missing > 0 (fidelity-first)", async () => {
    const deck = makeDeck([
      slide("s1", [block("b-img", "image", { assetId: "asset-that-does-not-exist" })]),
    ]);

    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(false);
    expect(preflight.coverage.missing).toBe(1);
    expect(preflight.coverage.satisfied).toBe(false);
    const imageIssue = preflight.issues.find((i) => i.code === "unresolved-image" && i.blockId === "b-img");
    expect(imageIssue?.severity).toBe("error");
    expect(imageIssue?.message).toContain("asset-that-does-not-exist");
  });

  it("3. a remote URL that fails to fetch BLOCKS before any export happens", async () => {
    stubFetch({ status: 404 });
    const deck = makeDeck([
      slide("s1", [block("b-img", "image", { src: "https://images.example/dead.png" })]),
    ]);

    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(false);
    expect(preflight.coverage.missing).toBe(1);
    const imageIssue = preflight.issues.find((i) => i.code === "unresolved-image" && i.blockId === "b-img");
    expect(imageIssue?.severity).toBe("error");
    expect(imageIssue?.message).toContain("HTTP 404");

    // And the exporter produces a failed report for the same deck — never a
    // successful export with a placeholder silently swapped in.
    const report = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    expect(report.report.status).toBe("failed");
    const image = report.report.slides[0].blocks.find((b) => b.blockId === "b-img");
    expect(image?.status).toBe("unsupported");
  });

  it("4. a data: URI is READY and exports natively", async () => {
    const deck = makeDeck([
      slide("s1", [block("b-img", "image", { src: DATA_PNG })]),
    ]);

    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(true);
    expect(preflight.coverage.missing).toBe(0);

    const report = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const image = report.report.slides[0].blocks.find((b) => b.blockId === "b-img");
    expect(image?.status).toBe("native");
  });

  it("5. an edited image source survives save/reload and stays resolvable", async () => {
    const deck = makeDeck(
      [slide("s1", [block("b-img", "image", { assetId: "asset-hero" })])],
      [{ id: "asset-hero", kind: "image", src: DATA_PNG }],
    );

    // The inspector writes through the atomic updateImageSource command, which
    // keeps the manifest and the block binding consistent in one mutation.
    const edited = applyCommandWithResult(deck, {
      type: "updateImageSource",
      slideId: "s1",
      blockId: "b-img",
      src: DATA_PNG,
    }).deck;
    const editedContent = edited.slides[0].blocks[0].content as { assetId?: string; src?: string };
    expect(editedContent.assetId).toBe("asset-hero");
    expect(editedContent.src).toBeUndefined();
    expect(edited.assets?.find((a) => a.id === "asset-hero")?.src).toBe(DATA_PNG);

    // Persist and reload (exactly what saveDeck/loadDeck do).
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    });
    expect(saveDeck(edited).ok).toBe(true);
    const reloaded = loadDeck();
    expect(reloaded).not.toBeNull();

    const preflight = await runExportPreflight(reloaded!, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(true);
    expect(preflight.coverage.missing).toBe(0);
  });

  it("6. each source is fetched exactly once per preparation, and the exporter consumes the prepared asset", async () => {
    const { fetchMock } = stubFetch({ bytes: new Uint8Array([9, 9, 9, 9]) });
    const deck = makeDeck([
      slide("s1", [block("b-img", "image", { src: "https://images.example/once.png" })]),
    ]);

    const prepared = await prepareExport(deck, DEFAULT_PPTX_CONFIG);
    expect(prepared.assets.get("inline:b-img")?.status).toBe("ready");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Preflight + exporter consume the SAME prepared result; no re-fetch.
    const preflight = await runExportPreflight(prepared);
    expect(preflight.ready).toBe(true);

    const { report, slides } = await buildExportReport(prepared, DEFAULT_PPTX_CONFIG);
    const image = report.slides[0].blocks.find((b) => b.blockId === "b-img");
    expect(image?.status).toBe("native");

    // The exported image element carries the prepared data URI verbatim.
    const element = slides[0].elements.find((e) => e.type === "image" && e.elementId === "b-img");
    expect((element?.data as { dataUri?: string }).dataUri).toBe(
      prepared.assets.get("inline:b-img")?.resolvedDataUri,
    );

    // Still exactly one fetch — the exporter never resolved anything itself.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("7. an unresolved image can never report Coverage 100% / Missing 0 / invariants OK", async () => {
    stubFetch({ status: 404 });
    const deck = makeDeck([
      slide("s1", [
        block("b-heading", "heading", "Title"),
        block("b-img", "image", { src: "https://images.example/dead.png" }),
      ]),
    ]);

    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(false);
    expect(preflight.coverage.missing).toBe(1);
    expect(preflight.coverage.satisfied).toBe(false);
    expect(preflight.blockCoverage).not.toBe(1);

    // The contradiction this regression prevented can no longer be produced:
    // a failed image is never counted toward the satisfied/native totals.
    expect(
      preflight.coverage.expected,
    ).toBe(preflight.coverage.native + preflight.coverage.fallback + preflight.coverage.missing);
  });
});