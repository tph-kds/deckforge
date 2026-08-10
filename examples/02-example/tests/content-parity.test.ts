import { describe, expect, it } from "vitest";
import { calculateContentParity } from "../src/export/fidelity/content-parity";
import { FIDELITY_POLICY } from "../src/export/fidelity/fidelity-policy";
import type { FidelityBlockReport } from "../src/export/fidelity/fidelity-types";
import type { DeckProject } from "../src/deck/types";

function textBlock(id: string, text: string, hidden = false): any {
  return { id, type: "text", frame: { x: 0, y: 0, w: 200, h: 40 }, content: { text }, hidden };
}

function deck(blocks: any[], slideId = "s1"): DeckProject {
  return { slides: [{ id: slideId, blocks }] } as unknown as DeckProject;
}

function native(id: string): FidelityBlockReport {
  return { blockId: id, status: "native", issues: [], representation: "native" };
}

function unsupported(id: string): FidelityBlockReport {
  return { blockId: id, status: "unsupported", issues: [], representation: "unsupported", contentPreserved: false };
}

describe("calculateContentParity", () => {
  it("is 1 for an all-native deck", () => {
    const d = deck([textBlock("a", "Hello world")]);
    const parity = calculateContentParity(d, [native("a")], FIDELITY_POLICY);
    expect(parity).toBe(1);
  });

  it("is 0 when every visible block is missing", () => {
    const d = deck([textBlock("a", "Hello world")]);
    const parity = calculateContentParity(d, [unsupported("a")], FIDELITY_POLICY);
    expect(parity).toBe(0);
  });

  it("is 0.5 when one of two blocks is missing", () => {
    const d = deck([textBlock("a", "Hello world"), textBlock("b", "Goodbye world")]);
    const parity = calculateContentParity(d, [native("a"), unsupported("b")], FIDELITY_POLICY);
    expect(parity).toBe(0.5);
  });

  it("excludes hidden blocks from the denominator", () => {
    const d = deck([textBlock("a", "Hello world", true), textBlock("b", "Goodbye world")]);
    const parity = calculateContentParity(d, [unsupported("a"), native("b")], FIDELITY_POLICY);
    expect(parity).toBe(1);
  });

  it("is 1 for an empty visible deck", () => {
    expect(calculateContentParity(deck([]), [], FIDELITY_POLICY)).toBe(1);
  });
});
