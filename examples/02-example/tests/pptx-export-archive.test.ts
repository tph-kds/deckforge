import { describe, expect, it } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import { rmSync, writeFileSync } from "node:fs";
import { loadSeedDeck } from "../src/deck/seed";
import { PptxExporter } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

describe("PPTX export archive integrity (regression)", () => {
  it("produces a real PPTX archive that satisfies the result contract", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);

    expect(result).toMatchObject({
      archiveVerified: true,
    });
    expect(result.report.status).toBeDefined();
    expect(result.report.slides.length).toBe(deck.slides.length);

    expect(result.blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    expect(result.blob.size).toBeGreaterThan(10_000);

    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("writes a deck where every relationship target exists inside the archive", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());

    const tmp = path.join(os.tmpdir(), `deckforge-export-${Date.now()}.pptx`);
    writeFileSync(tmp, bytes);
    try {
      // Full parse + cross-check of package relationships using JSZip, which is
      // present in the pptxgenjs dependency tree.
      const jszip = (await import("jszip")).default;
      const zip = await jszip.loadAsync(bytes);
      const names = new Set(Object.keys(zip.files));
      const missing: string[] = [];

      const parts = [...names].filter((name) => name.endsWith(".rels"));
      for (const part of parts) {
        const xml = await zip.files[part].async("string");
        const targets = xml.match(/Target="([^"]+)"/g) ?? [];
        for (const attr of targets) {
          const target = attr.slice(8, -1);
          if (target.startsWith("#")) continue;
          let fromDir: string;
          if (part === "_rels/.rels") {
            fromDir = "";
          } else {
            // ppt/slides/_rels/slide1.xml.rels -> source part ppt/slides/slide1.xml
            const source = part.replace(/_rels\/[^/]+\.rels$/, "");
            fromDir = source.includes("/") ? source.slice(0, source.lastIndexOf("/")) : "";
          }
          let resolved: string;
          if (target.startsWith("/")) {
            resolved = target.slice(1);
          } else {
            const segs: string[] = [];
            for (const seg of (fromDir ? fromDir + "/" + target : target).split("/")) {
              if (seg === "..") segs.pop();
              else if (seg !== "." && seg !== "") segs.push(seg);
            }
            resolved = segs.join("/");
          }
          if (resolved && !names.has(resolved)) {
            missing.push(`${part} -> ${target} (${resolved})`);
          }
        }
      }

      expect(missing).toEqual([]);
    } finally {
      rmSync(tmp, { force: true });
    }
  }, 60000);
});
