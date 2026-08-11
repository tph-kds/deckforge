// Regression tests for the canonical geometry + coverage invariants.
// The seven fixture block ids below are NOT special-cased anywhere in src/;
// they are regression fixtures from the spec and must all resolve to usable,
// in-bounds frames via the shared geometry pipeline.

import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import {
  hydrateDeckGeometry,
  resolveBlockGeometry,
  resolveSlideGeometry,
  type ResolvedSlideScene,
} from "../src/deck/geometry-resolver";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";
import { PptxExporter, buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { runExportPreflight } from "../src/export/export-preflight";
import { planBlockRepresentation } from "../src/export/fidelity/representation-planner";
import { FIDELITY_POLICY } from "../src/export/fidelity/fidelity-policy";

const FIXTURE_IDS = [
  "b31",
  "b33",
  "b34",
  "b35",
  "b36",
  "b-msbs2esx-fca5cd",
  "b-msbs2t0x-s74pzv",
];

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

function block(id: string, type: string, content: unknown, extra: Partial<Block> = {}): Block {
  return { id, type, content, ...extra };
}

function assertUsable(scene: ResolvedSlideScene, id: string, w: number, h: number): void {
  const frame = scene.frameByBlockId.get(id);
  expect(frame, `frame for ${id}`).toBeDefined();
  expect(frame!.x, `${id}.x`).toBeGreaterThanOrEqual(0);
  expect(frame!.y, `${id}.y`).toBeGreaterThanOrEqual(0);
  expect(frame!.w, `${id}.w`).toBeGreaterThan(0);
  expect(frame!.h, `${id}.h`).toBeGreaterThan(0);
  expect(frame!.x + frame!.w, `${id} fits width`).toBeLessThanOrEqual(w + 1);
  expect(frame!.y + frame!.h, `${id} fits height`).toBeLessThanOrEqual(h + 1);
  // P0-002: never the 0,0 origin export bug.
  expect(frame!.x + frame!.y, `${id} not at origin`).toBeGreaterThan(0);
}

describe("canonical geometry resolution — seven fixture ids", () => {
  it("resolves the five closing-cta fixtures (b31,b33,b34,b35,b36) to usable frames", () => {
    const deck = loadSeedDeck();
    const slide = deck.slides.find((s) => s.id === "s7")!;
    const scene = resolveSlideGeometry(slide, deck.canvas);
    for (const id of ["b31", "b33", "b34", "b35", "b36"]) {
      assertUsable(scene, id, deck.canvas.width, deck.canvas.height);
    }
    expect(scene.missingFrames).toHaveLength(0);
  });

  it("resolves the two editor-generated fixtures bound to closing-cta slots", () => {
    // b-msbs2esx-fca5cd (text) and b-msbs2t0x-s74pzv (chart) are NOT in
    // deck.json — they are editor-generated (localStorage msbs ids). When the
    // editor binds them to free slots they must resolve like any other block.
    const deck = makeDeck([
      {
        id: "s-editor",
        title: "Editor slide",
        layout: "closing-cta",
        blocks: [
          block("b-msbs2esx-fca5cd", "text", "Editor-generated kicker", { slot: "context" }),
          block(
            "b-msbs2t0x-s74pzv",
            "chart",
            { type: "bar", title: "Editor chart", values: [{ label: "A", value: 1 }] },
            { slot: "visual" },
          ),
        ],
        layoutBindings: [
          { slot: "context", blockIds: ["b-msbs2esx-fca5cd"] },
          { slot: "visual", blockIds: ["b-msbs2t0x-s74pzv"] },
        ],
      },
    ]);
    const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
    for (const id of ["b-msbs2esx-fca5cd", "b-msbs2t0x-s74pzv"]) {
      assertUsable(scene, id, deck.canvas.width, deck.canvas.height);
    }
    expect(scene.missingFrames).toHaveLength(0);
  });

  it("hydrateDeckGeometry attaches resolvedFrame without mutating the input deck", () => {
    const deck = loadSeedDeck();
    const before = JSON.stringify(deck);
    const hydrated = hydrateDeckGeometry(deck);
    expect(JSON.stringify(deck)).toBe(before);
    const slide = hydrated.slides.find((s) => s.id === "s7")!;
    for (const id of ["b31", "b33", "b34", "b35", "b36"]) {
      const block = slide.blocks.find((b) => b.id === id);
      expect(block?.resolvedFrame, `${id} resolvedFrame`).toBeDefined();
      expect(block!.resolvedFrame!.w).toBeGreaterThan(0);
    }
  });

  it("resolveBlockGeometry auto-binds an unbound slot block instead of dropping it", () => {
    // Slot-positioned blocks are bound deterministically at resolve time: a
    // generated/template block must never go unbound, and the user must never
    // have to hand-bind generated blocks.
    const deck = makeDeck([
      {
        id: "s-unbound",
        title: "Unbound",
        layout: "closing-cta",
        blocks: [block("b-orphan", "text", "orphan", { slot: undefined })],
        layoutBindings: [],
      },
    ]);
    const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
    const frame = scene.frameByBlockId.get("b-orphan");
    expect(frame).toBeDefined();
    expect(frame!.x + frame!.y, "not at origin").toBeGreaterThan(0);
    expect(scene.missingFrames).toHaveLength(0);
  });

  it("resolveBlockGeometry returns undefined for a freeform block with no frame (fail-closed)", () => {
    const deck = makeDeck([
      {
        id: "s-unbound",
        title: "Unbound",
        layout: "closing-cta",
        blocks: [block("b-orphan", "text", "orphan", { positionMode: "freeform" })],
        layoutBindings: [],
      },
    ]);
    const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
    expect(scene.frameByBlockId.has("b-orphan")).toBe(false);
    expect(scene.missingFrames.map((m) => m.blockId)).toContain("b-orphan");
    expect(resolveBlockGeometry(deck.slides[0].blocks[0], undefined)).toBeUndefined();
  });

  it("never resolves any fixture to the (0,0) origin", () => {
    const deck = loadSeedDeck();
    for (const slide of deck.slides) {
      const scene = resolveSlideGeometry(slide, deck.canvas);
      for (const id of FIXTURE_IDS) {
        const frame = scene.frameByBlockId.get(id);
        if (frame) {
          expect(frame.x + frame.y, `${id} at (0,0)`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("coverage invariants (expected == native + fallback, missing == 0)", () => {
  it("seed deck exports every visible block: expected == native + fallback", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);

    const visible = deck.slides
      .filter((s) => !s.hidden)
      .flatMap((s) => s.blocks)
      .filter((b) => !b.hidden);
    const reports = result.report.slides.flatMap((s) => s.blocks);

    let native = 0;
    let fallback = 0;
    let missing = 0;
    for (const r of reports) {
      if (r.status === "skipped" || r.status === "unsupported") {
        missing += 1;
        continue;
      }
      const planned = planBlockRepresentation(
        {
          blockId: r.blockId,
          hidden: false,
          status: r.status as never,
          element: undefined,
          issues: r.issues,
        },
        FIDELITY_POLICY,
      );
      if (planned.representation === "native" || planned.representation === "svg") native += 1;
      else if (planned.representation !== "unsupported") fallback += 1;
      else missing += 1;
    }

    expect(missing).toBe(0);
    expect(native + fallback).toBe(visible.length);
    expect(result.report.status).not.toBe("failed");
    expect(result.archiveVerified).toBe(true);
  });

  it("preflight reports zero geometry gaps and full coverage for the seed deck", async () => {
    const deck = loadSeedDeck();
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.ready).toBe(true);
    expect(result.geometryMissingCount).toBe(0);
    expect(result.coverage.satisfied).toBe(true);
    expect(result.coverage.missing).toBe(0);
    expect(result.coverage.expected).toBe(
      result.coverage.native + result.coverage.fallback,
    );
    expect(result.coverage.native + result.coverage.fallback).toBe(
      result.coverage.expected,
    );
    expect(result.coverage.native).toBeGreaterThan(0);
    expect(result.estimatedRecall).toBe(1);
  });

  it("preflight fails closed when a visible freeform block has no frame", async () => {
    const deck = makeDeck([
      {
        id: "s-broken",
        title: "Broken",
        layout: "closing-cta",
        blocks: [block("b-orphan", "text", "orphan", { positionMode: "freeform" })],
        layoutBindings: [],
      },
    ]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.ready).toBe(false);
    expect(result.geometryMissingCount).toBe(1);
    expect(result.coverage.satisfied).toBe(false);
    const geometryGroup = result.groups.find((g) => g.group === "geometry");
    expect(geometryGroup?.count).toBeGreaterThan(0);
  });

  it("preflight auto-heals an unbound slot block to full coverage", async () => {
    const deck = makeDeck([
      {
        id: "s-unbound",
        title: "Unbound",
        layout: "closing-cta",
        blocks: [block("b-orphan", "text", "orphan", { slot: undefined })],
        layoutBindings: [],
      },
    ]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.ready).toBe(true);
    expect(result.geometryMissingCount).toBe(0);
    expect(result.coverage.missing).toBe(0);
    expect(result.coverage.expected).toBe(1);
  });

  it("buildExportReport resolves the closing-cta fixtures for the seed deck", async () => {
    const deck = loadSeedDeck();
    const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const closing = slides.find((s) => s.slide.id === "s7");
    const elements = closing?.elements ?? [];
    const seen = new Set(elements.map((e) => e.elementId));
    for (const id of ["b31", "b33", "b34", "b35", "b36"]) {
      expect(seen.has(id), `${id} element`).toBe(true);
    }
    for (const element of elements) {
      expect(element.x + element.y, `${element.elementId} at origin`).toBeGreaterThan(0);
      expect(element.w).toBeGreaterThan(0);
      expect(element.h).toBeGreaterThan(0);
    }
  });
});
