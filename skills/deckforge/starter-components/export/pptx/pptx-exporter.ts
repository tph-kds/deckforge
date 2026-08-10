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
import type { DeckProject, DeckSlide } from "../../deck-types";
import { createExportContext } from "./pptx-context";
import { getBlockExporter } from "./block-exporters/index";
import { verifyPptxArchive } from "./pptx-verifier";
import { rawText } from "../fidelity/content-parity";
import { FIDELITY_POLICY } from "../fidelity/fidelity-policy";
import { planBlockRepresentation } from "../fidelity/representation-planner";
import { buildFidelityReport, fidelityStatus } from "../fidelity/fidelity-report";
import type { FidelityBlockReport } from "../fidelity/fidelity-types";

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

interface PptxAddCallable {
  addText?: (...args: unknown[]) => void;
  addImage?: (...args: unknown[]) => void;
  addShape?: (...args: unknown[]) => void;
  addTable?: (...args: unknown[]) => void;
  addChart?: (...args: unknown[]) => void;
  addNotes?: (...args: unknown[]) => void;
}

function writeElementToSlide(pptxSlide: PptxAddCallable, element: PptxSlideElement): void {
  // PptxGenJS uses inches; our deck model uses pixels (96 DPI).
  const opts = {
    x: pixelsToInches(element.x),
    y: pixelsToInches(element.y),
    w: pixelsToInches(element.w),
    h: pixelsToInches(element.h),
  };

  switch (element.type) {
    case "text": {
      const data = element.data as { text: string; options?: Record<string, unknown> };
      pptxSlide.addText?.(data.text, { ...opts, ...data.options });
      break;
    }
    case "image": {
      const data = element.data as { dataUri: string; options?: Record<string, unknown> };
      pptxSlide.addImage?.({ data: data.dataUri }, { ...opts, ...data.options });
      break;
    }
    case "shape": {
      const data = element.data as { shape: string; options?: Record<string, unknown> };
      pptxSlide.addShape?.(data.shape, { ...opts, ...data.options });
      break;
    }
    case "table": {
      const data = element.data as { rows: unknown[][]; options?: Record<string, unknown> };
      pptxSlide.addTable?.(data.rows, { ...opts, ...data.options });
      break;
    }
    case "chart": {
      const data = element.data as { chartType: string; data: unknown; options?: Record<string, unknown> };
      pptxSlide.addChart?.(data.chartType, data.data, { ...opts, ...data.options });
      break;
    }
    case "fallback": {
      const data = element.data as { text: string; options?: Record<string, unknown> };
      pptxSlide.addText?.(data.text, { ...opts, fill: { color: "FFF3CD" }, color: "856404", fontSize: 12 });
      break;
    }
    case "svg": {
      const data = element.data as { svg: string; options?: Record<string, unknown> };
      pptxSlide.addImage?.(
        { data: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg)}` },
        { ...opts, ...data.options },
      );
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
 * Resolve semantic slot frames for a slide so slot-positioned blocks get real
 * coordinates. Falls back to the block's own frame or defaults.
 */
function resolveBlockFrames(
  slide: DeckSlide,
  canvas: DeckProject["canvas"]
): Map<string, { x: number; y: number; w: number; h: number }> {
  const frameByBlockId = new Map<string, { x: number; y: number; w: number; h: number }>();

  // Use layoutBindings to map blocks to their slot frames.
  const bindings = slide.layoutBindings ?? [];
  const safe = canvas.safeMargin ?? 64;
  const w = canvas.width ?? 1600;
  const h = canvas.height ?? 900;
  const innerW = w - 2 * safe;
  const innerH = h - 2 * safe;

  // Simple deterministic slot layout: distribute bound blocks vertically.
  const slotCount = Math.max(1, bindings.length);
  const slotHeight = innerH / slotCount;
  const slotWidth = innerW;

  bindings.forEach((binding, index) => {
    const frame = {
      x: safe,
      y: safe + index * slotHeight,
      w: slotWidth,
      h: slotHeight,
    };
    for (const blockId of binding.blockIds) {
      frameByBlockId.set(blockId, frame);
    }
  });

  return frameByBlockId;
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

  for (const slide of deck.slides ?? []) {
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
    const frameByBlockId = resolveBlockFrames(slide, deck.canvas);

    for (const block of slide.blocks ?? []) {
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
            ? { ...block, frame: { ...(block.frame ?? {}), ...resolvedFrame } }
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

  const exportedSlides = (deck.slides ?? []).filter(
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
      const pptxSlide = pptx.addSlide() as PptxAddCallable;

      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes?.(slide.speakerNotes);
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

    const expectedTexts = (slides ?? [])
      .flatMap(({ slide }) => (slide.blocks ?? []).filter((block) => !block.hidden).map((block) => rawText(block)))
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