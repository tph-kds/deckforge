import type {
  ExportBlockReport,
  ExportIssue,
  ExportReport,
  ExportSlideReport,
  ExportStatus,
  PptxBlockExport,
  PptxExportConfig,
  PptxExportResult,
  PptxSlideElement,
} from "../export-types";
import type { DeckProject, DeckSlide } from "../../deck/types";
import { createExportContext } from "./pptx-context";
import { getBlockExporter } from "./block-exporters/index";
import type PptxGenJS from "pptxgenjs";

const PIXELS_PER_INCH = 96;

function pixelsToInches(px: number): number {
  return px / PIXELS_PER_INCH;
}

async function toUint8Array(value: string | Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === "string") return new TextEncoder().encode(value);
  return new Uint8Array(await value.arrayBuffer());
}

function writeElementToSlide(pptxSlide: PptxGenJS.Slide, element: PptxSlideElement): void {
  const opts = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
  };

  switch (element.type) {
    case "text": {
      pptxSlide.addText(element.data.text, {
        ...opts,
        ...element.data.options,
      } as unknown as PptxGenJS.TextPropsOptions);
      break;
    }
    case "image": {
      pptxSlide.addImage({
        data: element.data.dataUri,
        ...opts,
        ...element.data.options,
      } as unknown as PptxGenJS.ImageProps);
      break;
    }
    case "shape": {
      pptxSlide.addShape(element.data.shape as PptxGenJS.SHAPE_NAME, {
        ...opts,
        ...element.data.options,
      } as unknown as PptxGenJS.ShapeProps);
      break;
    }
    case "table": {
      pptxSlide.addTable(element.data.rows as unknown as PptxGenJS.TableRow[], {
        ...opts,
        ...element.data.options,
      } as unknown as PptxGenJS.TableProps);
      break;
    }
    case "chart": {
      pptxSlide.addChart(element.data.chartType as PptxGenJS.CHART_NAME, element.data.data as never, {
        ...opts,
        ...element.data.options,
      } as unknown as PptxGenJS.IChartOpts);
      break;
    }
    case "fallback": {
      pptxSlide.addText(element.data.text, {
        ...opts,
        fill: { color: "FFF3CD" },
        color: "856404",
        fontSize: 12,
        ...element.data.options,
      } as unknown as PptxGenJS.TextPropsOptions);
      break;
    }
  }
}

/**
 * Derive the overall export status from the accumulated issues and per-block
 * statuses. A report can only be `complete` when every block exported
 * natively and no warning/error-severity issues were recorded.
 */
export function deriveExportStatus(
  issues: ExportIssue[],
  slideReports: ExportSlideReport[],
  archiveVerified = true
): ExportStatus {
  if (!archiveVerified) return "failed";
  if (issues.some((issue) => issue.severity === "error")) return "failed";
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const allNative = slideReports.every((slide) =>
    slide.blocks.every((block) => block.status === "native")
  );
  if (!allNative || hasWarning) return "partial";
  return "complete";
}

/**
 * Lightweight structural verification of the generated PPTX archive: it must
 * be a ZIP file (PK magic bytes) that contains the mandatory presentation
 * part.
 */
export function verifyPptxArchive(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 4) return false;
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const marker = new TextEncoder().encode("ppt/presentation.xml");
  for (let i = 0; i <= bytes.length - marker.length; i++) {
    let matches = true;
    for (let j = 0; j < marker.length; j++) {
      if (bytes[i + j] !== marker[j]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

export interface ExportBuildResult {
  report: ExportReport;
  slides: Array<{ slide: DeckSlide; elements: PptxSlideElement[] }>;
}

/**
 * Convert every slide/block into PPTX elements while recording per-block
 * status and typed issues. Pure relative to the artifact generation so it can
 * be exercised without a PPTX library.
 */
export async function buildExportReport(
  deck: DeckProject,
  config: PptxExportConfig
): Promise<ExportBuildResult> {
  const ctx = createExportContext(deck, config);
  const issues: ExportIssue[] = [];
  const slideReports: ExportSlideReport[] = [];
  const slides: ExportBuildResult["slides"] = [];

  for (const slide of deck.slides) {
    if (!config.includeHiddenSlides && slide.hidden) {
      issues.push({
        code: "hidden-slide-skipped",
        severity: "info",
        slideId: slide.id,
        message: `Hidden slide "${slide.title}" was not exported`,
        suggestedFix: "Enable 'Include hidden slides' to export it",
        automaticFixAvailable: true,
      });
      continue;
    }

    const blockReports: ExportBlockReport[] = [];
    const elements: PptxSlideElement[] = [];

    for (const block of slide.blocks) {
      let result: PptxBlockExport;

      if (block.hidden) {
        result = {
          status: "skipped",
          issues: [
            {
              code: "block-hidden-skipped",
              severity: "warning",
              message: `Hidden block "${block.id}" was skipped and not exported`,
              suggestedFix: "Unhide the block to include it in the export",
              automaticFixAvailable: true,
            },
          ],
        };
      } else {
        const exporter = getBlockExporter(block.type);
        try {
          result = await exporter.export(block, ctx);
        } catch (err) {
          result = {
            status: "unsupported",
            issues: [
              {
                code: "block-export-failed",
                severity: "error",
                message: `Block "${block.id}" (${block.type}) failed to export: ${
                  err instanceof Error ? err.message : String(err)
                }`,
                suggestedFix: "Replace this block with a supported block type",
                automaticFixAvailable: false,
              },
            ],
          };
        }
      }

      const stampedIssues: ExportIssue[] = result.issues.map((issue) => ({
        ...issue,
        slideId: issue.slideId ?? slide.id,
        blockId: issue.blockId ?? block.id,
      }));

      blockReports.push({ blockId: block.id, status: result.status, issues: stampedIssues });
      issues.push(...stampedIssues);
      if (result.element) elements.push(result.element);
    }

    slideReports.push({ slideId: slide.id, blocks: blockReports });
    slides.push({ slide, elements });
  }

  return {
    report: {
      status: deriveExportStatus(issues, slideReports),
      slides: slideReports,
      issues,
    },
    slides,
  };
}

export class PptxExporter {
  private config: PptxExportConfig;

  constructor(config: PptxExportConfig) {
    this.config = config;
  }

  async export(deck: DeckProject): Promise<PptxExportResult> {
    const { report, slides } = await buildExportReport(deck, this.config);

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    const canvas = deck.canvas ?? { width: 13.333, height: 7.5 };
    const slideWidthInches = pixelsToInches(canvas.width ?? 13.333);
    const slideHeightInches = pixelsToInches(canvas.height ?? 7.5);
    pptx.defineLayout({ name: "CUSTOM", width: slideWidthInches, height: slideHeightInches });
    pptx.layout = "CUSTOM";

    for (const { slide, elements } of slides) {
      const pptxSlide = pptx.addSlide();

      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }

      for (const element of elements) {
        writeElementToSlide(pptxSlide, element);
      }
    }

    const written = await pptx.write({ outputType: "arraybuffer" });
    const bytes = await toUint8Array(written);
    const archiveVerified = verifyPptxArchive(bytes);

    const allIssues: ExportIssue[] = [...report.issues];
    if (!archiveVerified) {
      allIssues.push({
        code: "archive-verification-failed",
        severity: "error",
        message: "Generated PPTX archive failed structural verification (missing presentation part)",
        suggestedFix: "Retry the export; if it persists, report a bug",
        automaticFixAvailable: false,
      });
    }

    report.issues = allIssues;
    report.status = deriveExportStatus(allIssues, report.slides, archiveVerified);

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    return { report, blob, archiveVerified };
  }
}
