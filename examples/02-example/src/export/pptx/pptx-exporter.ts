import type {
  ExportBlockReport,
  ExportIssue,
  ExportReport,
  ExportSlideReport,
  ExportStatus,
  FidelityReport,
  PptxBlockExport,
  PptxExportConfig,
  PptxExportResult,
  PptxSlideElement,
} from "../export-types";
import type { DeckProject, DeckSlide } from "../../deck/types";
import { createExportContext } from "./pptx-context";
import { getBlockExporter } from "./block-exporters/index";
import { resolveSlidePlacements } from "../../deck/layout";
import { verifyPptxArchive } from "./pptx-verifier";
import { rawText } from "../fidelity/content-parity";
import { FIDELITY_POLICY } from "../fidelity/fidelity-policy";
import { planBlockRepresentation } from "../fidelity/representation-planner";
import { buildFidelityReport, fidelityStatus } from "../fidelity/fidelity-report";
import type { FidelityBlockReport } from "../fidelity/fidelity-types";
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
  // PptxGenJS uses inches; our deck model uses pixels (96 DPI).
  const opts = {
    x: pixelsToInches(element.x),
    y: pixelsToInches(element.y),
    w: pixelsToInches(element.w),
    h: pixelsToInches(element.h),
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
    case "svg": {
      pptxSlide.addImage({
        data: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(element.data.svg)}`,
        ...opts,
      } as unknown as PptxGenJS.ImageProps);
      break;
    }
  }
}

/**
 * Derive the overall export status from the accumulated issues, per-block
 * statuses, and the fidelity-level status. A report can only be `complete`
 * when every block exported natively, no warning/error-severity issue was
 * recorded, and the content-parity gate passed.
 */
export function deriveExportStatus(
  issues: ExportIssue[],
  slideReports: ExportSlideReport[],
  fidelity: ExportStatus,
  archiveVerified = true
): ExportStatus {
  if (!archiveVerified) return "failed";
  if (issues.some((issue) => issue.severity === "error")) return "failed";
  if (fidelity === "failed") return "failed";
  const hasWarning = issues.some((issue) => issue.severity === "warning");
  const allNative = slideReports.every((slide) =>
    slide.blocks.every((block) => block.status === "native")
  );
  if (allNative && !hasWarning) return "complete";
  if (allNative) return "partial";
  if (!hasWarning) return "complete-with-fallbacks";
  return "partial";
}

export interface ExportBuildResult {
  report: ExportReport;
  slides: Array<{ slide: DeckSlide; elements: PptxSlideElement[] }>;
  parity: number;
  fidelityBlocks: FidelityBlockReport[];
  fidelity: FidelityReport;
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

    // Resolve semantic slot frames so slot-positioned blocks get real coordinates.
    const placements = resolveSlidePlacements(slide, deck.canvas);
    const frameByBlockId = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const placement of placements) {
      frameByBlockId.set(placement.blockId, placement.frame);
    }

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
          // Attach the resolved slot frame to the block so exporters use real coordinates.
          const resolvedFrame = frameByBlockId.get(block.id);
          const blockWithFrame = resolvedFrame
            ? { ...block, frame: { ...block.frame, ...resolvedFrame } }
            : block;
          result = await exporter.export(blockWithFrame, ctx);
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

      const planned = planBlockRepresentation(
        {
          blockId: block.id,
          hidden: !!block.hidden,
          status: result.status,
          element: result.element,
          issues: stampedIssues,
        },
        FIDELITY_POLICY,
      );
      blockReports.push(planned);
      issues.push(...stampedIssues);
      if (result.element) elements.push(result.element);
    }

    slideReports.push({ slideId: slide.id, blocks: blockReports });
    slides.push({ slide, elements });
  }

  const exportedSlides = deck.slides.filter(
    (slide) => config.includeHiddenSlides || !slide.hidden,
  );
  const fidelityBlocks = slideReports.flatMap((slide) => slide.blocks);
  const fidelity = buildFidelityReport({
    deck: { ...deck, slides: exportedSlides },
    blocks: fidelityBlocks,
    policy: FIDELITY_POLICY,
  });

  return {
    report: {
      status: deriveExportStatus(issues, slideReports, fidelity.status),
      slides: slideReports,
      issues,
    },
    slides,
    parity: fidelity.contentRecall,
    fidelityBlocks,
    fidelity,
  };
}

export class PptxExporter {
  private config: PptxExportConfig;

  constructor(config: PptxExportConfig) {
    this.config = config;
  }

  async export(deck: DeckProject): Promise<PptxExportResult> {
    const { report, slides, fidelity } = await buildExportReport(deck, this.config);

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

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const expectedTexts = slides
      .flatMap(({ slide }) => slide.blocks.filter((block) => !block.hidden).map((block) => rawText(block)))
      .filter((text) => text.length > 0);
    const expectedNotes = slides.filter(
      ({ slide }) => this.config.includeSpeakerNotes && !!slide.speakerNotes,
    ).length;

    const verification = await verifyPptxArchive({ report, blob, expectedTexts, expectedNotes });
    const archiveVerified = verification.passed;

    const allIssues: ExportIssue[] = [...report.issues];
    if (!archiveVerified) {
      const failed = verification.report.checks.filter((check) => !check.passed);
      allIssues.push({
        code: "archive-verification-failed",
        severity: "error",
        message: `Generated PPTX archive failed structural verification: ${failed.map((c) => c.name).join(", ")}`,
        suggestedFix: "Retry the export; if it persists, report a bug",
        automaticFixAvailable: false,
      });
    }

    report.issues = allIssues;
    report.status = deriveExportStatus(allIssues, report.slides, fidelity.status, archiveVerified);
    fidelity.status = report.status;

    return { report, blob, archiveVerified, fidelity };
  }
}
