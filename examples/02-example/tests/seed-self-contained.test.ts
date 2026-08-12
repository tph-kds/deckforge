import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { runExportPreflight } from "../src/export/export-preflight";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

describe("seed deck is self-contained", () => {
  it("book-cover asset is an embedded data URI", () => {
    const deck = loadSeedDeck();
    const asset = deck.assets?.find((a) => a.id === "asset-book-cover");
    expect(asset?.src).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("exports READY with Missing 0 using no network", async () => {
    const deck = loadSeedDeck();
    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(preflight.ready).toBe(true);
    expect(preflight.coverage.missing).toBe(0);
  });
});
