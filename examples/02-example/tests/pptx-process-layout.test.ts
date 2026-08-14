import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import { buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import type { PptxSlideElement } from "../src/export/export-types";

const deck = loadSeedDeck();

async function slideElements(slideIndex: number): Promise<PptxSlideElement[]> {
  const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
  return slides[slideIndex]?.elements ?? [];
}

function textOf(el: PptxSlideElement): string {
  const data = el.data as { text?: string | Array<{ text?: string }> };
  if (Array.isArray(data.text)) return data.text.map((r) => r.text ?? "").join(" ");
  return data.text ?? "";
}

function isTwoDigitIndex(text: string): boolean {
  return /^\d{2}$/.test(text.trim());
}

describe("s5 process export matches the web vertical numbered list", () => {
  it("renders stacked rows with 01..05 indexes and step bodies, no arrow connectors", async () => {
    const elements = await slideElements(4);
    const proc = elements.filter((e) => e.elementId === "b22");
    expect(proc.length).toBeGreaterThan(0);

    const arrows = proc.filter(
      (e) => e.type === "shape" && (e.data as { shape?: string }).shape === "rightArrow",
    );
    expect(arrows).toHaveLength(0);

    const numbers = proc.filter((e) => e.type === "text" && isTwoDigitIndex(textOf(e)));
    expect(numbers.map((n) => textOf(n).trim())).toEqual(["01", "02", "03", "04", "05"]);

    const bodies = proc.filter((e) => e.type === "text" && !isTwoDigitIndex(textOf(e)));
    expect(bodies.length).toBe(5);
    const allBodyText = bodies.map((b) => textOf(b)).join(" ");
    for (const expected of ["Measure", "Set the number", "Ship lean", "Verify in CI", "Repeat monthly"]) {
      expect(allBodyText).toContain(expected);
    }
  });

  it("stacks the step bodies vertically, aligned to the same column", async () => {
    const elements = await slideElements(4);
    const proc = elements.filter((e) => e.elementId === "b22");
    const bodies = proc
      .filter((e) => e.type === "text" && !isTwoDigitIndex(textOf(e)))
      .sort((a, b) => a.y - b.y);
    expect(bodies.length).toBe(5);
    for (let i = 1; i < bodies.length; i++) {
      expect(bodies[i].y).toBeGreaterThan(bodies[i - 1].y);
    }
    expect(new Set(bodies.map((b) => b.x)).size).toBe(1);
    expect(new Set(bodies.map((b) => b.w)).size).toBe(1);
  });
});
