import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { verifyPptxArchive } from "../src/export/pptx/pptx-verifier";
import type { ExportReport } from "../src/export/export-types";

const SLIDE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Hello world</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

const SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const NOTES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker note</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`;

async function buildZip(overrides: Record<string, unknown> = {}): Promise<Blob> {
  const zip = new JSZip();
  const base: Record<string, unknown> = {
    "[Content_Types].xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Types/>",
    "ppt/presentation.xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><p:presentation/>",
    "ppt/slides/slide1.xml": SLIDE_XML,
    "ppt/slides/_rels/slide1.xml.rels": SLIDE_RELS,
    "ppt/notesSlides/notesSlide1.xml": NOTES_XML,
  };
  const files = { ...base, ...overrides };
  for (const [name, content] of Object.entries(files)) {
    if (content == null) continue;
    zip.file(name, content as string);
  }
  return zip.generateAsync({ type: "blob" });
}

const BASE_REPORT: ExportReport = {
  status: "complete",
  slides: [
    {
      slideId: "slide1",
      blocks: [
        { blockId: "text-a", status: "native", issues: [], representation: "native", contentPreserved: true },
      ],
    },
  ],
  issues: [],
};

describe("verifyPptxArchive", () => {
  it("passes a well-formed archive with all expected content", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedTexts: ["Hello world"],
      expectedNotes: 1,
    });
    expect(result.passed).toBe(true);
    expect(result.report.checks.map((c) => c.name)).toContain("text-survival");
  });

  it("fails when a slide part is missing", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: { ...BASE_REPORT, slides: [BASE_REPORT.slides[0], { slideId: "slide2", blocks: [] }] },
      blob,
    });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "slide-count")?.passed).toBe(false);
  });

  it("reports missing expected text", async () => {
    const blob = await buildZip({
      "ppt/slides/slide1.xml": SLIDE_XML.replace("Hello world", "Goodbye world"),
    });
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedTexts: ["Hello world"],
      expectedNotes: 1,
    });
    expect(result.passed).toBe(false);
    const textCheck = result.report.checks.find((c) => c.name === "text-survival");
    expect(textCheck?.passed).toBe(false);
  });

  it("fails when speaker notes are missing", async () => {
    const blob = await buildZip({
      "ppt/notesSlides/notesSlide1.xml": undefined,
    });
    const result = await verifyPptxArchive({ report: BASE_REPORT, blob, expectedNotes: 1 });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "speaker-notes")?.passed).toBe(false);
  });

  it("passes when no notes are expected and none are present", async () => {
    const blob = await buildZip({ "ppt/notesSlides/notesSlide1.xml": undefined });
    const result = await verifyPptxArchive({ report: BASE_REPORT, blob, expectedNotes: 0 });
    expect(result.passed).toBe(true);
  });

  it("marks speaker-notes NOT APPLICABLE and passes when notes are disabled", async () => {
    // Even when a notes part exists, a disabled export must not be judged.
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedNotes: 0,
      includeSpeakerNotes: false,
    });
    const notes = result.report.checks.find((c) => c.name === "speaker-notes");
    expect(notes?.passed).toBe(true);
    expect(notes?.detail).toContain("not-applicable");
  });

  it("fails speaker-notes when enabled but a notes part is missing", async () => {
    const blob = await buildZip({ "ppt/notesSlides/notesSlide1.xml": undefined });
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedNotes: 1,
      includeSpeakerNotes: true,
    });
    expect(result.report.checks.find((c) => c.name === "speaker-notes")?.passed).toBe(false);
  });

  it("passes speaker-notes when enabled and the notes part is present", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedNotes: 1,
      includeSpeakerNotes: true,
    });
    expect(result.report.checks.find((c) => c.name === "speaker-notes")?.passed).toBe(true);
  });

  it("verifies native text strictly against <a:t> runs", async () => {
    const blob = await buildZip({
      "ppt/slides/slide1.xml": SLIDE_XML.replace("Hello world", "Something else entirely"),
    });
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      nativeTextExpected: ["Hello world"],
    });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "text-survival")?.passed).toBe(false);
  });

  it("verifies visual-fallback text against XML attributes (e.g. descr alt)", async () => {
    const xmlWithDescr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:pic>
      <p:nvPicPr><p:cNvPr id="2" name="img" descr="A page of a book photographed at close range"/></p:nvPicPr>
    </p:pic>
  </p:spTree></p:cSld>
</p:sld>`;
    const blob = await buildZip({ "ppt/slides/slide1.xml": xmlWithDescr });
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      visualFallbackTexts: ["A page of a book photographed at close range"],
    });
    const fallback = result.report.checks.find((c) => c.name === "visual-fallback-alt");
    expect(fallback?.passed).toBe(true);
    expect(result.passed).toBe(true);
  });

  it("fails visual-fallback-alt when the attribute text is missing", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      visualFallbackTexts: ["a page of a book that is not present"],
    });
    expect(result.report.checks.find((c) => c.name === "visual-fallback-alt")?.passed).toBe(false);
  });

  it("distinguishes native (a:t) from visual-fallback (attribute) corpora", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Visible heading</a:t></a:r></a:p></p:txBody></p:sp>
    <p:pic><p:nvPicPr><p:cNvPr id="2" name="img" descr="Alt text only in attribute"/></p:nvPicPr></p:pic>
  </p:spTree></p:cSld>
</p:sld>`;
    const blob = await buildZip({ "ppt/slides/slide1.xml": xml });

    const nativeFails = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      nativeTextExpected: ["Alt text only in attribute"],
    });
    expect(nativeFails.report.checks.find((c) => c.name === "text-survival")?.passed).toBe(false);

    const fallbackPasses = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      visualFallbackTexts: ["Alt text only in attribute"],
    });
    expect(fallbackPasses.report.checks.find((c) => c.name === "visual-fallback-alt")?.passed).toBe(true);
  });

  it("fails to open a non-archive blob", async () => {
    const result = await verifyPptxArchive({ report: BASE_REPORT, blob: new Blob(["not a zip"]) });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "archive-open")?.passed).toBe(false);
  });
});
