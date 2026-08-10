import JSZip from "jszip";
import type { ExportReport, PptxVerificationCheck, PptxVerificationReport } from "../export-types";

export interface VerificationInput {
  report: ExportReport;
  blob: Blob;
  /** Text fragments that must survive somewhere in the archive's slide <a:t> runs. */
  expectedTexts?: string[];
  /** Number of speaker-notes parts expected (slides with notes in this export). */
  expectedNotes?: number;
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
  const { report, blob, expectedTexts = [], expectedNotes } = input;
  const checks: PptxVerificationCheck[] = [];
  const expectedSlides = report.slides.length;

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
    const notesExpected = expectedNotes ?? expectedSlides;
    checks.push({
      name: "speaker-notes",
      passed: notesCount === notesExpected,
      detail: `expected notes for ${notesExpected} slides, found ${notesCount}`,
    });

    const slideTexts: string[] = [];
    for (const name of archiveSlides) {
      const entry = zip.file(name);
      if (!entry) continue;
      const raw = await entry.async("string");
      const texts = raw.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
      slideTexts.push(...texts.map((t) => t.replace(/<\/?a:t>/g, "")));
    }
    const combined = normalizeText(slideTexts.join(" "));

    const missing: string[] = [];
    for (const expected of expectedTexts) {
      const normalized = normalizeText(expected);
      if (normalized && !combined.includes(normalized)) {
        missing.push(`missing text: "${expected}"`);
      }
    }
    checks.push({
      name: "text-survival",
      passed: missing.length === 0,
      detail: missing.length === 0 ? "all expected text found" : missing.join("; "),
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
