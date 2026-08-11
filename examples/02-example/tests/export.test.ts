import { describe, expect, it, vi } from "vitest";
import type { Block, DeckProject, DeckSlide } from "../src/deck/types";
import {
  buildExportReport,
  deriveExportStatus,
  PptxExporter,
} from "../src/export/pptx/pptx-exporter";
import { DEFAULT_PPTX_CONFIG } from "../src/export/export-types";

vi.mock("pptxgenjs", async () => {
  const JSZip = (await import("jszip")).default;
  const mockSlides: Array<{ texts: string[]; hasNotes: boolean }> = [];

  const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const NS_R = "http://schemas.openxmlformats.org/package/2006/relationships";

  class MockSlide {
    texts: string[];
    hasNotes: boolean;
    constructor() {
      this.texts = [];
      this.hasNotes = false;
      mockSlides.push(this);
    }
    addNotes() {
      this.hasNotes = true;
    }
    addText(text: unknown) {
      if (typeof text === "string") this.texts.push(text);
      else if (Array.isArray(text)) this.texts.push(...text.map(String));
    }
    addImage() {}
    addShape() {}
    addTable() {}
    addChart() {}
  }

  class MockPptx {
    layout = "";
    constructor() {
      mockSlides.length = 0;
    }
    defineLayout() {}
    addSlide() {
      return new MockSlide();
    }
    async write() {
      const zip = new JSZip();
      zip.file(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      );
      zip.file(
        "ppt/presentation.xml",
        `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="${NS_P}"/>`,
      );
      zip.file(
        "ppt/_rels/presentation.xml.rels",
        `<?xml version="1.0"?><Relationships xmlns="${NS_R}"/>`,
      );
      mockSlides.forEach((slide, index) => {
        const n = index + 1;
        const runs = slide.texts
          .map((text) => `<a:r><a:t>${text}</a:t></a:r>`)
          .join("");
        zip.file(
          `ppt/slides/slide${n}.xml`,
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="${NS_A}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:sp><p:txBody><a:p>${runs}</a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
        );
        zip.file(
          `ppt/slides/_rels/slide${n}.xml.rels`,
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_R}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
        );
        // Real pptxgenjs emits a notesSlide part per slide even when the slide
        // carries no speaker notes; the mock mirrors that so the speaker-notes
        // structural check matches production behavior.
        zip.file(
          `ppt/notesSlides/notesSlide${n}.xml`,
          `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="${NS_A}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${slide.hasNotes ? "note" : ""}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`,
        );
      });
      return zip.generateAsync({ type: "arraybuffer" });
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
  return { id, title: id, layout: "title-hero", blocks, layoutBindings: bindBlocks(blocks), ...extra };
}

/** Bind each block to a title-hero slot so export resolves real geometry. */
function bindBlocks(blocks: Block[]): DeckSlide["layoutBindings"] {
  const slotForType: Record<string, string> = {
    heading: "title",
    text: "subtitle",
    bullets: "subtitle",
    caption: "meta",
    image: "visual",
    video: "visual",
    diagram: "visual",
    chart: "visual",
    shape: "visual",
  };
  const bySlot = new Map<string, string[]>();
  blocks.forEach((block, index) => {
    const slot = slotForType[block.type] ?? (index === 0 ? "title" : "subtitle");
    const ids = bySlot.get(slot) ?? [];
    ids.push(block.id);
    bySlot.set(slot, ids);
  });
  return Array.from(bySlot.entries()).map(([slot, blockIds]) => ({ slot, blockIds }));
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

  it("exports a video block as a preserved snapshot (never a silent omission)", async () => {
    const deck = makeDeck([
      slide("slide-1", [
        block("block-body", "text", "Body text"),
        block("block-video", "video", { url: "clip.mp4", chapter: { title: "Live demo" } }),
      ]),
    ]);

    const { report } = await buildExportReport(deck, DEFAULT_PPTX_CONFIG);

    expect(report.status).toBe("complete-with-fallbacks");
    const video = report.slides[0].blocks.find((item) => item.blockId === "block-video");
    expect(video?.status).toBe("rasterized");
    expect(video?.representation).toBe("svg");
    expect(video?.contentPreserved).toBe(true);
  });

  it("exports a diagram as a preserved SVG (never a text summary)", async () => {
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

    expect(report.status).toBe("complete-with-fallbacks");
    const diagram = report.slides[0].blocks.find((item) => item.blockId === "block-diagram");
    expect(diagram?.status).toBe("rasterized");
    expect(diagram?.representation).toBe("svg");
    expect(diagram?.contentPreserved).toBe(true);
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

  it("is complete only when every block is native, there are no warnings, and fidelity passed", () => {
    expect(deriveExportStatus([], nativeSlides, "complete")).toBe("complete");
  });

  it("is complete-with-fallbacks when a block uses a fallback and content is preserved", () => {
    const slides = [
      { slideId: "s", blocks: [{ blockId: "b", status: "rasterized" as const, issues: [] }] },
    ];
    expect(deriveExportStatus([], slides, "complete-with-fallbacks")).toBe("complete-with-fallbacks");
  });

  it("is partial when a warning-severity issue exists even if all blocks are native", () => {
    const warning = {
      code: "oversized-content" as const,
      severity: "warning" as const,
      message: "too long",
      automaticFixAvailable: false,
    };
    expect(deriveExportStatus([warning], nativeSlides, "complete")).toBe("partial");
  });

  it("is failed when an error-severity issue exists", () => {
    const error = {
      code: "block-export-failed" as const,
      severity: "error" as const,
      message: "boom",
      automaticFixAvailable: false,
    };
    expect(deriveExportStatus([error], nativeSlides, "complete")).toBe("failed");
  });

  it("is failed when archive verification fails", () => {
    expect(deriveExportStatus([], nativeSlides, "complete", false)).toBe("failed");
  });

  it("is failed when the content-parity gate fails", () => {
    expect(deriveExportStatus([], nativeSlides, "failed")).toBe("failed");
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
    expect(result.fidelity).toBeDefined();
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
    expect(parsed.slides[1].blocks[1].status).toBe("rasterized");
    expect(typeof parsed.status).toBe("string");
    expect(typeof parsed.issues.length).toBe("number");
  });
});
