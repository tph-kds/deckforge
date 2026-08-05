import { describe, expect, it, vi } from "vitest";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";
import {
  buildExportReport,
  deriveExportStatus,
  verifyPptxArchive,
  PptxExporter,
} from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

vi.mock("pptxgenjs", () => {
  class MockSlide {
    addNotes() {}
    addText() {}
    addImage() {}
    addShape() {}
    addTable() {}
    addChart() {}
  }
  class MockPptx {
    layout = "";
    defineLayout() {}
    addSlide() {
      return new MockSlide();
    }
    async write() {
      const marker = new TextEncoder().encode("ppt/presentation.xml");
      return new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, ...marker]);
    }
  }
  return { default: MockPptx };
});

function makeDeck(slides: DeckSlide[]): DeckProject {
  return {
    schemaVersion: "2.1",
    meta: { id: "test", slug: "test", title: "Test deck", language: "en" },
    canvas: { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 80 },
    theme: { id: "editorial-cream" },
    presentation: {},
    editor: { enabled: true },
    slides,
  };
}

function slide(id: string, blocks: Block[], extra: Partial<DeckSlide> = {}): DeckSlide {
  return { id, title: id, layout: "title-hero", blocks, ...extra };
}

function block(id: string, type: string, content: unknown, extra: Partial<Block> = {}): Block {
  return { id, type, content, ...extra };
}

describe("buildExportReport", () => {
  it("reports complete with every block native for an all-native deck", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-title", "heading", "The title"),
        block("block-body", "text", "Some body text"),
        block("block-bullets", "bullets", ["First point", "Second point"]),
        block("block-chart", "chart", {
          type: "bar",
          title: "Weights",
          values: [
            { label: "A", value: 1 },
            { label: "B", value: 2 },
          ],
        }),
        block("block-image", "image", { src: "data:image/png;base64,iVBORw0KGgo=" }),
        block("block-shape", "shape", { shapeType: "rectangle" }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).toBe("complete");
    expect(report.slides).toHaveLength(1);
    expect(report.slides[0].slideId).toBe("slide-1");
    for (const blockReport of report.slides[0].blocks) {
      expect(blockReport.status).toBe("native");
    }
  });

  it("marks an unsupported block and downgrades the status", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-body", "text", "Body text"),
        block("block-video", "video", { src: "clip.mp4" }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(["partial", "failed"]).toContain(report.status);
    const video = report.slides[0].blocks.find((item) => item.blockId === "block-video");
    expect(video).toBeDefined();
    expect(video?.status).toBe("unsupported");
    expect(video?.issues.some((issue) => issue.code === "unsupported-block")).toBe(true);
  });

  it("marks a diagram as substituted with a simplified representation", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-title", "heading", "Title"),
        block("block-diagram", "diagram", {
          nodes: [
            { id: "n1", label: "A" },
            { id: "n2", label: "B" },
          ],
          edges: [{ from: "n1", to: "n2" }],
        }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).toBe("partial");
    const diagram = report.slides[0].blocks.find((item) => item.blockId === "block-diagram");
    expect(diagram?.status).toBe("substituted");
  });

  it("skips an image with no resolvable source and never reports complete", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-title", "heading", "Title"),
        block("block-image", "image", { assetId: "missing-asset" }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).not.toBe("complete");
    const image = report.slides[0].blocks.find((item) => item.blockId === "block-image");
    expect(image?.status).toBe("skipped");
    expect(image?.issues.some((issue) => issue.code === "image-load-failed")).toBe(true);
  });

  it("forces status != complete when required body content is skipped", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-title", "heading", "Title"),
        block("block-body", "text", "This body never ships", { hidden: true }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).not.toBe("complete");
    const body = report.slides[0].blocks.find((item) => item.blockId === "block-body");
    expect(body?.status).toBe("skipped");
    expect(body?.issues.some((issue) => issue.code === "block-hidden-skipped")).toBe(true);
  });

  it("marks a failing block unsupported with an error issue", async () => {
    const deck = makeDeck([
      slide("slide-1", [block("block-malformed", "chart", { type: "bar", values: 42 })]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).toBe("failed");
    const malformed = report.slides[0].blocks.find((item) => item.blockId === "block-malformed");
    expect(malformed?.status).toBe("unsupported");
    expect(malformed?.issues.some((issue) => issue.severity === "error")).toBe(true);
  });

  it("skips hidden slides when includeHiddenSlides is disabled", async () => {
    const deck = makeDeck([
      slide("slide-1", [block("block-a", "text", "visible")]),
      slide("slide-2", [block("block-b", "text", "secret")], { hidden: true }),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.slides).toHaveLength(1);
    expect(report.issues.some((issue) => issue.code === "hidden-slide-skipped" && issue.slideId === "slide-2")).toBe(true);
  });
});

describe("deriveExportStatus", () => {
  const nativeSlides = [
    { slideId: "s", blocks: [{ blockId: "b", status: "native" as const, issues: [] }] },
  ];

  it("is complete only when every block is native and there are no warnings", () => {
    expect(deriveExportStatus([], nativeSlides)).toBe("complete");
  });

  it("is partial when a block is not native", () => {
    const slides = [
      { slideId: "s", blocks: [{ blockId: "b", status: "substituted" as const, issues: [] }] },
    ];
    expect(deriveExportStatus([], slides)).toBe("partial");
  });

  it("is partial when a warning-severity issue exists even if all blocks are native", () => {
    const warning = {
      code: "oversized-content" as const,
      severity: "warning" as const,
      message: "too long",
      automaticFixAvailable: false,
    };
    expect(deriveExportStatus([warning], nativeSlides)).toBe("partial");
  });

  it("is failed when an error-severity issue exists", () => {
    const error = {
      code: "block-export-failed" as const,
      severity: "error" as const,
      message: "boom",
      automaticFixAvailable: false,
    };
    expect(deriveExportStatus([error], nativeSlides)).toBe("failed");
  });

  it("is failed when archive verification fails", () => {
    expect(deriveExportStatus([], nativeSlides, false)).toBe("failed");
  });
});

describe("verifyPptxArchive", () => {
  it("accepts a ZIP payload that contains the presentation part", () => {
    const marker = new TextEncoder().encode("ppt/presentation.xml");
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...marker]);
    expect(verifyPptxArchive(bytes)).toBe(true);
  });

  it("rejects non-ZIP payloads", () => {
    expect(verifyPptxArchive(new Uint8Array([1, 2, 3, 4]))).toBe(false);
    expect(verifyPptxArchive(new Uint8Array())).toBe(false);
  });
});

describe("PptxExporter top-level result", () => {
  it("returns a serializable report, verified archive and blob", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-a", "heading", "Hi"),
        block("block-b", "text", "Bye"),
      ]),
    ]);

    const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
    const result = await exporter.export(deck);

    expect(result.archiveVerified).toBe(true);
    expect(result.report.status).toBe("complete");
    expect(result.report.slides[0].slideId).toBe("slide-1");
    expect(result.report.slides[0].blocks[0].blockId).toBe("block-a");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(() => JSON.stringify(result.report)).not.toThrow();
  });
});

describe("report serialization", () => {
  it("round-trips through JSON and references real slide/block ids", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-a", "heading", "One"),
        block("block-b", "text", "Two"),
      ]),
      slide("slide-2", [
        block("block-c", "chart", { type: "line", values: [{ label: "X", value: 1 }] }),
        block("block-d", "video", {}),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);
    const parsed = JSON.parse(JSON.stringify(report)) as typeof report;

    expect(parsed.slides).toHaveLength(2);
    expect(parsed.slides[0].slideId).toBe("slide-1");
    expect(parsed.slides[0].blocks[0].blockId).toBe("block-a");
    expect(parsed.slides[1].slideId).toBe("slide-2");
    expect(parsed.slides[1].blocks[0].blockId).toBe("block-c");
    expect(parsed.slides[1].blocks[1].status).toBe("unsupported");
    expect(typeof parsed.status).toBe("string");
    expect(typeof parsed.issues.length).toBe("number");
  });
});
