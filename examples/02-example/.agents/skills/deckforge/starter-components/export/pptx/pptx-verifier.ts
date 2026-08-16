import JSZip from "jszip";
import type { ExportReport, PptxVerificationCheck, PptxVerificationReport } from "../export-types";

export interface VerificationInput {
  report: ExportReport;
  blob: Blob;
  /** Legacy alias for native text that must survive in slide <a:t> runs. */
  expectedTexts?: string[];
  /**
   * Semantic native-text corpus: text fragments from blocks exported as
   * native text elements. EVERY fragment must survive in <a:t> runs.
   */
  nativeTextExpected?: string[];
  /**
   * Semantic visual-fallback corpus: alt/description fragments from blocks
   * exported as SVG/raster elements. These must survive in the slide XML
   * (as element attributes such as `descr`), not necessarily in <a:t> runs.
   */
  visualFallbackTexts?: string[];
  /** Number of speaker-notes parts expected (slides with notes in this export). */
  expectedNotes?: number;
  /** When false the speaker-notes check is NOT APPLICABLE and always passes. */
  includeSpeakerNotes?: boolean;
}

function decode(entryText: string): string {
  return entryText
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function normalizeText(text: string): string {
  return decode(text).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Collapse whitespace over the DECODED XML including attribute values, so a
 * phrase stored in an attribute (e.g. `descr="..."` alt text on an image or
 * SVG element) can be located without needing to parse the XML.
 */
function normalizeXmlCollapsed(text: string): string {
  return decode(text).replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function slidePartName(name: string): boolean {
  return /^ppt\/slides\/slide\d+\.xml$/.test(name);
}

function notesPartName(name: string): boolean {
  return /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name);
}

function relsPartName(slidePart: string): string {
  return slidePart.replace("ppt/slides/", "ppt/slides/_rels/").replace(/\.xml$/, ".xml.rels");
}

export async function verifyPptxArchive(input: VerificationInput): Promise<{
  passed: boolean;
  report: PptxVerificationReport;
}> {
  const {
    report,
    blob,
    expectedTexts = [],
    nativeTextExpected = [],
    visualFallbackTexts = [],
    expectedNotes,
    includeSpeakerNotes = true,
  } = input;
  const checks: PptxVerificationCheck[] = [];
  const expectedSlides = report.slides.length;
  const nativeCorpus = [...expectedTexts, ...nativeTextExpected].filter((text) => text && text.length > 0);

  try {
    const zipData =
      typeof Blob !== "undefined" && blob instanceof Blob ? await blob.arrayBuffer() : blob;
    const zip = await JSZip.loadAsync(zipData);

    const archiveSlides = Object.keys(zip.files).filter(slidePartName).sort();
    checks.push({
      name: "slide-count",
      passed: archiveSlides.length === expectedSlides,
      detail: `expected ${expectedSlides} slides, found ${archiveSlides.length}`,
    });

    const notesCount = Object.keys(zip.files).filter(notesPartName).length;
    if (includeSpeakerNotes === false) {
      // Regression (P2-002): speaker-notes is NOT APPLICABLE when the user
      // disabled notes; it must not be compared against an expectation.
      checks.push({
        name: "speaker-notes",
        passed: true,
        detail: "not-applicable: speaker notes disabled",
      });
    } else {
      const notesExpected = expectedNotes ?? expectedSlides;
      checks.push({
        name: "speaker-notes",
        passed: notesCount === notesExpected,
        detail: `expected notes for ${notesExpected} slides, found ${notesCount}`,
      });
    }

    const slideTexts: string[] = [];
    const slideXmlCollapsed: string[] = [];
    for (const name of archiveSlides) {
      const entry = zip.file(name);
      if (!entry) continue;
      const raw = await entry.async("string");
      const texts = raw.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
      slideTexts.push(...texts.map((t) => t.replace(/<\/?a:t>/g, "")));
      slideXmlCollapsed.push(normalizeXmlCollapsed(raw));
    }
    const combined = normalizeText(slideTexts.join(" "));

    const missingNative: string[] = [];
    for (const expected of nativeCorpus) {
      const normalized = normalizeText(expected);
      if (normalized && !combined.includes(normalized)) {
        missingNative.push(`missing text: "${expected}"`);
      }
    }
    checks.push({
      name: "text-survival",
      passed: missingNative.length === 0,
      detail: missingNative.length === 0 ? "all expected text found" : missingNative.join("; "),
    });

    const collapsed = slideXmlCollapsed.join(" ");
    const missingFallback: string[] = [];
    for (const expected of visualFallbackTexts) {
      const normalized = normalizeXmlCollapsed(expected);
      if (normalized && !collapsed.includes(normalized)) {
        missingFallback.push(`missing alt/description: "${expected}"`);
      }
    }
    checks.push({
      name: "visual-fallback-alt",
      passed: missingFallback.length === 0,
      detail:
        missingFallback.length === 0
          ? "all fallback alt/description text found"
          : missingFallback.join("; "),
    });

    const missingRels = archiveSlides.filter((name) => !zip.file(relsPartName(name)));
    checks.push({
      name: "relationship-integrity",
      passed: missingRels.length === 0,
      detail: missingRels.length === 0 ? "every slide has a rels part" : `slides missing rels: ${missingRels.join(", ")}`,
    });

    return {
      passed: checks.every((c) => c.passed),
      report: { checks, passed: checks.every((c) => c.passed) },
    };
  } catch (error) {
    checks.push({
      name: "archive-open",
      passed: false,
      detail: error instanceof Error ? error.message : "failed to open archive",
    });
    return { passed: false, report: { checks, passed: false } };
  }
}
