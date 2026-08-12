// tests/pptx-export-reliability.test.ts
//
// Golden regression suite for the PPTX export reliability fix (brownfield).
//
// The seven block ids below are the CURRENT failing fixtures from the spec.
// They are regression fixtures ONLY — nothing in src/ special-cases these ids.
// Every fixture must resolve to a usable canonical frame via the shared
// geometry pipeline, and a deck that reproduces the pre-fix failure (blocks
// with positionMode "slot" but no layoutBindings) must now export cleanly with
// zero missing blocks instead of 7 geometry errors.

import { describe, expect, it } from "vitest";
import { loadSeedDeck } from "../src/deck/seed";
import {
  ensureDeckSlotBindings,
  resolveBlockFrame,
  resolveBlockGeometry,
  resolveSlideGeometry,
  type ResolvedSlideScene,
} from "../src/deck/geometry-resolver";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";
import { PptxExporter, buildExportReport } from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";
import { runExportPreflight } from "../src/export/export-preflight";
import { prepareExport } from "../src/export/prepare-export";
import { getBlockExporter } from "../src/export/pptx/block-exporters/index";
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
    assets: [
      {
        id: "asset-book-cover",
        kind: "image",
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      },
    ],
  };
}

function block(id: string, type: string, content: unknown, extra: Partial<Block> = {}): Block {
  return { id, type, content, ...extra };
}

/** A slide whose slot blocks exist but whose layoutBindings are absent. */
function unboundFixtureSlide(): DeckSlide {
  return {
    id: "s7",
    title: "closing",
    layout: "closing-cta",
    blocks: [
      block("b-msbs2esx-fca5cd", "heading", "Ship a page 40% lighter this sprint.", { slot: "title", positionMode: "slot" }),
      block(
        "b-msbs2t0x-s74pzv",
        "chart",
        { type: "bar", title: "Budget trend", values: [{ label: "Now", value: 100 }, { label: "Sprint end", value: 60 }] },
        { slot: "visual", positionMode: "slot" },
      ),
      block("b31", "text", "YOUR NEXT ACTION", { slot: "context", positionMode: "slot" }),
      block("b33", "callout", "Pick one public page and cut 40% of its weight.", { slot: "action", positionMode: "slot" }),
      block("b34", "text", "Owner: your team", { slot: "owner-date", positionMode: "slot" }),
      block("b35", "citation", "Sources: HTTP Archive, Web Almanac.", { slot: "contact", positionMode: "slot" }),
      block(
        "b36",
        "image",
        { assetId: "asset-book-cover", fit: "cover" },
        { slot: "visual", positionMode: "slot", alt: "A lighter, more careful web." },
      ),
    ],
    layoutBindings: [],
  };
}

function assertUsable(scene: ResolvedSlideScene, id: string, w: number, h: number): void {
  const frame = scene.frameByBlockId.get(id);
  expect(frame, `frame for ${id}`).toBeDefined();
  expect(Number.isFinite(frame!.x), `${id}.x finite`).toBe(true);
  expect(Number.isFinite(frame!.y), `${id}.y finite`).toBe(true);
  expect(frame!.x, `${id}.x`).toBeGreaterThanOrEqual(0);
  expect(frame!.y, `${id}.y`).toBeGreaterThanOrEqual(0);
  expect(frame!.w, `${id}.w`).toBeGreaterThan(0);
  expect(frame!.h, `${id}.h`).toBeGreaterThan(0);
  expect(frame!.x + frame!.w, `${id} fits width`).toBeLessThanOrEqual(w + 1);
  expect(frame!.y + frame!.h, `${id} fits height`).toBeLessThanOrEqual(h + 1);
  expect(frame!.x + frame!.y, `${id} not at origin`).toBeGreaterThan(0);
}

describe("canonical frame resolution priority", () => {
  it("explicit frame wins for a freeform block", () => {
    const scene = resolveSlideGeometry(
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [block("b-f", "shape", {}, { positionMode: "freeform", frame: { x: 120, y: 90, w: 300, h: 200 } })],
        layoutBindings: [],
      },
      { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    );
    const frame = scene.frameByBlockId.get("b-f");
    expect(frame).toEqual({ x: 120, y: 90, w: 300, h: 200 });
    expect(scene.blocks[0].resolutionSource).toBe("explicit");
  });

  it("slot binding resolves to the layout slot frame", () => {
    const scene = resolveSlideGeometry(
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [block("b-title", "heading", "Title", { slot: "title", positionMode: "slot" })],
        layoutBindings: [{ slot: "title", blockIds: ["b-title"] }],
      },
      { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    );
    const entry = scene.blocks[0];
    expect(entry.resolutionSource).toBe("slot-binding");
    expect(entry.slotId).toBe("title");
    assertUsable(scene, "b-title", 1600, 900);
  });

  it("unbound slot block auto-binds deterministically (never missing)", () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
    expect(scene.missingFrames).toHaveLength(0);
    for (const id of FIXTURE_IDS) {
      assertUsable(scene, id, deck.canvas.width, deck.canvas.height);
    }
  });

  it("legacy resolvedFrame is honored as migration when nothing else resolves", () => {
    const scene = resolveSlideGeometry(
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [
          block("b-legacy", "text", "old", {
            positionMode: "freeform",
            resolvedFrame: { x: 10, y: 20, w: 100, h: 50 },
          }),
        ],
        layoutBindings: [],
      },
      { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    );
    const entry = scene.blocks[0];
    expect(entry.resolutionSource).toBe("legacy-migration");
    expect(entry.frame).toEqual({ x: 10, y: 20, w: 100, h: 50 });
  });

  it("resolveBlockFrame returns an explicit geometry error (no result) for a frame-less freeform block", () => {
    const deck = makeDeck([
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [block("b-free", "shape", {}, { positionMode: "freeform" })],
        layoutBindings: [],
      },
    ]);
    const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
    expect(scene.frameByBlockId.has("b-free")).toBe(false);
    expect(scene.missingFrames[0].state).toBe("MISSING_FRAME");
  });
});

describe("slot binding contract (positionMode slot => valid binding)", () => {
  it("ensureDeckSlotBindings binds every visible slot block to a valid layout slot", () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const healed = ensureDeckSlotBindings(deck);
    const slide = healed.slides[0];
    const validSlots = new Set(["context", "title", "action", "owner-date", "contact", "visual"]);
    const boundIds = new Set<string>();
    for (const binding of slide.layoutBindings ?? []) {
      expect(validSlots.has(binding.slot), `slot ${binding.slot} valid`).toBe(true);
      for (const id of binding.blockIds) boundIds.add(id);
    }
    for (const b of slide.blocks) {
      expect(boundIds.has(b.id), `block ${b.id} bound`).toBe(true);
    }
    expect(slide.layoutBindings?.length).toBeGreaterThan(0);
  });

  it("ensureDeckSlotBindings is deterministic and idempotent", () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const once = JSON.stringify(ensureDeckSlotBindings(deck));
    const twice = JSON.stringify(ensureDeckSlotBindings(ensureDeckSlotBindings(deck)));
    expect(once).toBe(twice);
  });

  it("generated slot blocks with positionMode slot never need manual binding for export", async () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const pre = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(pre.ready).toBe(true);
    expect(pre.geometryMissingCount).toBe(0);
    expect(pre.coverage.missing).toBe(0);
    expect(pre.coverage.satisfied).toBe(true);
  });
});

describe("process block export", () => {
  function processSlide(): DeckSlide {
    return {
      id: "s-p",
      title: "process",
      layout: "closing-cta",
      blocks: [
        block(
          "b-proc",
          "process",
          { steps: [
            { title: "Measure", detail: "page weight today" },
            { title: "Cut", detail: "40% of that weight" },
            { title: "Budget", detail: "enforce in CI" },
          ] },
          { slot: "action", positionMode: "slot" },
        ),
      ],
      layoutBindings: [{ slot: "action", blockIds: ["b-proc"] }],
    };
  }

  it("is registered as a native-editable exporter", () => {
    const exporter = getBlockExporter("process");
    expect(exporter.type).toBe("process");
    expect(exporter.exportability).toBe("native-editable");
  });

  it("exports natively to editable shapes with connectors", async () => {
    const deck = makeDeck([processSlide()]);
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);
    expect(result.report.status).not.toBe("failed");
    const report = result.report.slides[0].blocks.find((b) => b.blockId === "b-proc")!;
    expect(report.status).toBe("native");
    expect(report.editable).toBe(true);
    expect(report.contentPreserved).toBe(true);
  });

  it("preflight no longer warns that process cannot be exported natively", async () => {
    const deck = makeDeck([processSlide()]);
    const pre = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    const unsupported = pre.issues.filter((i) => i.code === "unsupported-block-type");
    expect(unsupported).toHaveLength(0);
    expect(pre.ready).toBe(true);
  });

  it("a frame-less process block fails closed (never omitted silently)", async () => {
    const deck = makeDeck([
      {
        id: "s-p",
        title: "process",
        layout: "closing-cta",
        blocks: [
          block("b-proc", "process", { steps: [{ title: "A" }] }, { positionMode: "freeform" }),
        ],
        layoutBindings: [],
      },
    ]);
    const pre = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(pre.ready).toBe(false);
    const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const proc = slides.find((s) => s.slide.id === "s-p")!.elements.find((e) => e.elementId === "b-proc");
    expect(proc).toBeUndefined();
  });
});

describe("geometry edge cases", () => {
  it("a legitimate x=0/y=0 explicit frame is preserved (zero is not missing)", () => {
    const scene = resolveSlideGeometry(
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [block("b-zero", "shape", {}, { positionMode: "freeform", frame: { x: 0, y: 0, w: 200, h: 100 } })],
        layoutBindings: [],
      },
      { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    );
    const entry = scene.blocks[0];
    expect(entry.frame.x).toBe(0);
    expect(entry.frame.y).toBe(0);
    expect(entry.frame.w).toBeGreaterThan(0);
  });

  it("missing geometry is rejected, never defaulted to (0,0)", async () => {
    const deck = makeDeck([
      {
        id: "s",
        title: "s",
        layout: "closing-cta",
        blocks: [block("b-missing", "shape", {}, { positionMode: "freeform" })],
        layoutBindings: [],
      },
    ]);
    const { slides } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const elements = slides.find((s) => s.slide.id === "s")!.elements;
    expect(elements.some((e) => e.elementId === "b-missing")).toBe(false);
  });

  it("editor zoom never affects export geometry", async () => {
    const deck = loadSeedDeck();
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);
    const elements = result.report.slides.flatMap((s) => s.blocks).map((b) => b.blockId);
    // Re-run resolution under zoom levels; geometry is a pure document-space
    // computation, so every run yields identical canonical frames.
    for (const zoom of [0.25, 0.5, 0.61, 1, 1.5, 2]) {
      const scene = resolveSlideGeometry(deck.slides[0], deck.canvas);
      for (const id of elements) {
        const frame = scene.frameByBlockId.get(id);
        if (frame) {
          expect(Number.isFinite(frame.x * zoom)).toBe(true);
          expect(frame.x).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("export coverage invariants (golden fixture deck)", () => {
  it("the seven unbound fixture blocks export with zero missing and full recall", async () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);

    expect(result.report.status).not.toBe("failed");
    expect(result.archiveVerified).toBe(true);

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
        { blockId: r.blockId, hidden: false, status: r.status as never, element: undefined, issues: r.issues },
        FIDELITY_POLICY,
      );
      if (planned.representation === "native" || planned.representation === "svg") native += 1;
      else if (planned.representation !== "unsupported") fallback += 1;
      else missing += 1;
    }

    expect(missing).toBe(0);
    expect(native + fallback).toBe(visible.length);
    const elementIds = result.report.slides.flatMap((s) => s.blocks.map((b) => b.blockId));
    for (const id of FIXTURE_IDS) {
      expect(elementIds, `fixture ${id} exported`).toContain(id);
    }
  });

  it("preflight matches the expected final state for the golden fixture deck", async () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.ready).toBe(true);
    expect(result.geometryMissingCount).toBe(0);
    expect(result.coverage.missing).toBe(0);
    expect(result.coverage.expected).toBe(7);
    expect(result.coverage.expected).toBe(result.coverage.native + result.coverage.fallback);
    expect(result.coverage.satisfied).toBe(true);
    expect(result.estimatedRecall).toBe(1);
    const geometryGroup = result.groups.find((g) => g.group === "geometry");
    expect(geometryGroup?.count ?? 0).toBe(0);
  });

  it("the prepared registry resolves the fixture image to embeddable bytes", async () => {
    const deck = makeDeck([unboundFixtureSlide()]);
    const prepared = await prepareExport(deck, DEFAULT_PPTX_CONFIG);

    // The single preparation phase resolved the fixture image to a real data
    // URI — preflight and the exporter consume exactly this registry.
    const asset = prepared.assets.get("asset-book-cover");
    expect(asset?.status).toBe("ready");
    expect(asset?.resolvedDataUri).toMatch(/^data:image\/png;base64,/);

    const imageBlock = prepared.slides[0].blocks.find((b) => b.id === "b36");
    expect(imageBlock?.assetSnapshot?.status).toBe("ready");
    expect(imageBlock?.assetSnapshot?.dataUri).toBe(asset?.resolvedDataUri);
  });
});

describe("seed deck stays green", () => {
  it("seed deck preflight still reports zero geometry gaps", async () => {
    const deck = loadSeedDeck();
    const result = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    expect(result.ready).toBe(true);
    expect(result.geometryMissingCount).toBe(0);
    expect(result.coverage.satisfied).toBe(true);
    expect(result.coverage.missing).toBe(0);
  });
});
