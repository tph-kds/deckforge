import type {
  ExportBlockReport,
  ExportIssue,
  ExportReport,
  ExportSlideReport,
  ExportStatus,
  FidelityReport,
  PptxBlockExport,
  PptxExportConfig,
  PptxExportContext,
  PptxExportResult,
  PptxSlideElement,
  PptxTextRun,
} from "../export-types";
import type { DeckProject, DeckSlide, ChartContent } from "../../deck/types";
import { createExportContext } from "./pptx-context";
import { prepareExport, isPreparedExport, type PreparedExport } from "../prepare-export";
import { getBlockExporter } from "./block-exporters/index";
import { resolveSlideGeometry, type ResolvedBlockGeometry } from "../../deck/geometry-resolver";
import { verifyPptxArchive } from "./pptx-verifier";
import { FIDELITY_POLICY } from "../fidelity/fidelity-policy";
import { planBlockRepresentation } from "../fidelity/representation-planner";
import { buildFidelityReport, fidelityStatus } from "../fidelity/fidelity-report";
import type { FidelityBlockReport } from "../fidelity/fidelity-types";
import type PptxGenJS from "pptxgenjs";
import { derivePptxSlideSize, documentUnitToPptxInches } from "../geometry";
import { validateExportScene, type ExportSceneDiagnostic } from "../export-scene";
import { resolveTheme, hexToPptx } from "../resolved-theme";

async function toUint8Array(value: string | Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === "string") return new TextEncoder().encode(value);
  return new Uint8Array(await value.arrayBuffer());
}

/**
 * Normalize intrinsic pixel dimensions to a sub-100-inch representation that
 * preserves the aspect ratio. pptxgenjs reads the element w/h as the source
 * image size for crop math (and treats any value >= 100 as EMU, not inches), so
 * the scale here is arbitrary but must keep both axes below 100. Only the ratio
 * matters: `cover`/`contain` srcRect percentages are derived from it.
 */
function naturalAspectInches(width: number, height: number): { w: number; h: number } {
  const max = Math.max(width, height);
  if (!isFinite(max) || max <= 0) return { w: 0, h: 0 };
  const scale = 4 / max;
  return { w: width * scale, h: height * scale };
}

/**
 * Place one element on a PPTX slide. Element geometry is in DOCUMENT pixels;
 * the slide is sized with the derived PPTX geometry, so each axis maps by pure
 * ratio (Phase 5). No fixed pixels-per-inch constant: the relationship between
 * document space and PPTX inches is established once in the geometry layer.
 */
async function writeElementToSlide(
  pptxSlide: PptxGenJS.Slide,
  element: PptxSlideElement,
  ctx: PptxExportContext,
): Promise<void> {
  if (!element || element.w <= 0 || element.h <= 0) return;

  const opts = {
    x: documentUnitToPptxInches(element.x, ctx.slideWidth, ctx.pptxWidth),
    y: documentUnitToPptxInches(element.y, ctx.slideHeight, ctx.pptxHeight),
    w: documentUnitToPptxInches(element.w, ctx.slideWidth, ctx.pptxWidth),
    h: documentUnitToPptxInches(element.h, ctx.slideHeight, ctx.pptxHeight),
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
      // pptxgenjs computes the cover/contain `srcRect` crop from the element's
      // w/h aspect (its `imgSize`) against the sizing box. The element's final
      // size still comes from `sizing.w/h` (the frame), so we override w/h with
      // the source image's intrinsic aspect — normalized to a sub-100-inch
      // scale — so the crop matches the web `object-fit` instead of stretching.
      const natural =
        element.data.naturalWidth && element.data.naturalHeight
          ? naturalAspectInches(element.data.naturalWidth, element.data.naturalHeight)
          : null;
      pptxSlide.addImage({
        data: element.data.dataUri,
        altText: element.data.alt,
        ...opts,
        w: natural?.w ?? opts.w,
        h: natural?.h ?? opts.h,
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
      // Use resolved theme colors for fallback elements
      const theme = resolveTheme(ctx.deck);
      pptxSlide.addText(element.data.text, {
        ...opts,
        fill: { color: hexToPptx(theme.tokens.surface) },
        color: hexToPptx(theme.tokens.muted),
        fontSize: 12,
        ...element.data.options,
      } as unknown as PptxGenJS.TextPropsOptions);
      break;
    }
    case "svg": {
      // The SVG fallback (charts, diagrams, video posters) must become a PNG.
      // In Node there is no browser `Image`/`canvas` for PptxGenJS's built-in
      // SVG preview, so the SVG is rasterized here with resvg to a crisp 2x PNG.
      // In the browser that preview works, so the SVG data-URI is passed through
      // and PptxGenJS rasterizes it client-side (the native resvg binding cannot
      // run in the browser and is kept out of the browser bundle via a lazy
      // import).
      if (typeof document === "undefined") {
        const { renderSvgToPng } = await import("../fidelity/svg/svg-raster");
        const png = renderSvgToPng(element.data.svg, element.w * 2);
        pptxSlide.addImage({
          data: `data:image/png;base64,${png.toString("base64")}`,
          altText: element.data.alt,
          ...opts,
        } as unknown as PptxGenJS.ImageProps);
      } else {
        // PptxGenJS requires a base64 header; it then keeps the SVG part and
        // rasterizes a PNG preview client-side via canvas.
        const bytes = new TextEncoder().encode(element.data.svg);
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        pptxSlide.addImage({
          data: `data:image/svg+xml;base64,${btoa(binary)}`,
          altText: element.data.alt,
          ...opts,
        } as unknown as PptxGenJS.ImageProps);
      }
      break;
    }
  }
}

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

export async function buildExportReport(
  input: PreparedExport | DeckProject,
  config: PptxExportConfig
): Promise<ExportBuildResult> {
  const prepared: PreparedExport = isPreparedExport(input)
    ? input
    : await prepareExport(input, config);
  const deck = prepared.deck;
  const ctx = createExportContext(deck, config, prepared);
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

    const scene = resolveSlideGeometry(slide, deck.canvas);
    const frameByBlockId = scene.frameByBlockId;

    const slotGroups = new Map<string, ResolvedBlockGeometry[]>();
    for (const entry of scene.blocks) {
      if (!entry.slotId) continue;
      const group = slotGroups.get(entry.slotId) ?? [];
      group.push(entry);
      slotGroups.set(entry.slotId, group);
    }

    const processedBlockIds = new Set<string>();

    for (const block of slide.blocks) {
      if (processedBlockIds.has(block.id)) continue;

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
          const resolvedFrame = frameByBlockId.get(block.id);
          let adjustedFrame = resolvedFrame
            ? { ...resolvedFrame }
            : undefined;

          if (resolvedFrame) {
            const entry = scene.blocks.find((candidate) => candidate.blockId === block.id);
            if (entry?.slotId) {
              const group = slotGroups.get(entry.slotId) ?? [entry];
              const blockIndex = group.indexOf(entry);
              const blocksInSlot = group.length;
              if (blocksInSlot > 1) {
                const gap = 12;
                const availableH = resolvedFrame.h - gap * (blocksInSlot - 1);
                const slotH = Math.max(40, Math.floor(availableH / blocksInSlot));
                adjustedFrame = {
                  x: resolvedFrame.x,
                  y: resolvedFrame.y + blockIndex * (slotH + gap),
                  w: resolvedFrame.w,
                  h: slotH,
                };
              }
            }
          }

          const blockWithFrame = adjustedFrame
            ? { ...block, frame: { ...block.frame, ...adjustedFrame }, resolvedFrame: adjustedFrame }
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
      const emitted = result.elements?.length
        ? result.elements
        : result.element
          ? [result.element]
          : [];
      for (const element of emitted) {
        if (element.w > 0 && element.h > 0) {
          elements.push(element);
        }
      }
    }

    slideReports.push({ slideId: slide.id, blocks: blockReports });
    slides.push({ slide, elements });
  }

  // ── Chart invariants ────────────────────────────────────────────────────────
  // "New chart" templates are NEVER counted: the source set is the visible,
  // non-template chart blocks that carry real data. The exported set is every
  // element (native chart OR SVG fidelity fallback) whose elementId maps back
  // to one of those source blocks. Every exported chart MUST have a
  // sourceBlockId; a chart with no source block is an orphan and is rejected.
  const sourceChartBlockIds = new Set<string>();
  for (const slide of deck.slides) {
    if (!config.includeHiddenSlides && slide.hidden) continue;
    for (const block of slide.blocks) {
      if (block.type !== "chart") continue;
      const content = block.content as ChartContent | undefined;
      if (content?.isTemplate) continue;
      if (!Array.isArray(content?.values) || !content.values.length) continue;
      sourceChartBlockIds.add(block.id);
    }
  }

  const allExportedElements = slides.flatMap(({ elements }) => elements);
  const exportedChartCount = allExportedElements.filter(
    (element) => !!element.elementId && sourceChartBlockIds.has(element.elementId),
  ).length;

  if (sourceChartBlockIds.size !== exportedChartCount) {
    issues.push({
      code: "chart-count-mismatch",
      severity: "error",
      message: `Chart count mismatch: ${sourceChartBlockIds.size} source charts but ${exportedChartCount} exported charts`,
      automaticFixAvailable: false,
    });
  }

  // Every native chart element must originate from a real source chart block.
  const orphanCharts = allExportedElements.filter(
    (element) =>
      element.type === "chart" &&
      !(element.elementId && sourceChartBlockIds.has(element.elementId)),
  );
  if (orphanCharts.length > 0) {
    issues.push({
      code: "chart-count-mismatch",
      severity: "error",
      message: `Exported ${orphanCharts.length} chart element(s) with no matching source chart block`,
      automaticFixAvailable: false,
    });
  }

  const sceneDiagnostics = validateExportScene(
    { slides: slides.map(({ slide, elements }) => ({ slideId: slide.id, elements })) },
    ctx,
  );
  for (const diagnostic of sceneDiagnostics) {
    issues.push({
      code: diagnostic.code,
      severity: diagnostic.severity === "error" ? "error" : "warning",
      slideId: diagnostic.slideId,
      blockId: diagnostic.elementId,
      message: diagnostic.message,
      automaticFixAvailable: false,
    });
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

  async export(input: PreparedExport | DeckProject): Promise<PptxExportResult> {
    // The canonical, single preparation phase. When a PreparedExport is passed
    // (as the dialog always does), no resolution work happens here — the
    // exporter consumes the already-resolved registry. A raw DeckProject is
    // prepared on the fly for programmatic callers.
    const prepared: PreparedExport = isPreparedExport(input)
      ? input
      : await prepareExport(input, this.config);
    const deck = prepared.deck;

    const { report, slides, fidelity } = await buildExportReport(prepared, this.config);

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    // Phase 4: PPTX slide size is DERIVED from the document pixels so the
    // exported aspect ratio always matches the web canvas (no hard-coded
    // 13.333"x7.5" that would distort e.g. a 1920x800 "wide" canvas).
    const canvas = deck.canvas ?? { width: 1600, height: 900 };
    const pptxSize = derivePptxSlideSize(canvas.width ?? 1600, canvas.height ?? 900);
    pptx.defineLayout({ name: "CUSTOM", width: pptxSize.width, height: pptxSize.height });
    pptx.layout = "CUSTOM";

    for (const { slide, elements } of slides) {
      const pptxSlide = pptx.addSlide();

      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }

      const slideCtx = createExportContext(deck, this.config, prepared);
      for (const element of elements) {
        await writeElementToSlide(pptxSlide, element, slideCtx);
      }
    }

    const written = await pptx.write({ outputType: "arraybuffer" });
    const bytes = await toUint8Array(written);

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    // Semantic native-text corpus: the EXACT text the exporter wrote into each
    // native text/fallback/shape element. Verifying this (rather than a rawText
    // reconstruction) is what makes text-survival meaningful — bullets keep
    // their "•" prefixes, process steps their shape text, etc.
    const nativeTextExpected = slides.flatMap(({ elements }) =>
      elements
        .filter((element) => element.type === "text" || element.type === "fallback" || element.type === "shape")
        .map((element) => {
          if (element.type === "shape") {
            const text = (element.data.options as { text?: unknown } | undefined)?.text;
            return typeof text === "string" ? text : "";
          }
          const data = element.data as { text?: string | PptxTextRun[] };
          return Array.isArray(data.text)
            ? data.text.map((run) => run.text ?? "").join(" ")
            : (data.text ?? "");
        })
        .filter((text) => text.length > 0),
    );

    // Semantic visual-fallback corpus: alt/description on SVG/raster elements.
    // These survive as element attributes in the slide XML, not as <a:t> runs.
    const visualFallbackTexts = slides.flatMap(({ elements }) =>
      elements
        .filter((element) => element.type === "svg" || element.type === "image")
        .flatMap((element) => {
          const alt = (element.data as { alt?: string }).alt;
          return alt && alt.length > 0 ? [alt] : [];
        }),
    );

    // pptxgenjs always emits one notesSlide part per exported slide, even when
    // the slide has no speaker notes. The speaker-notes structural check must
    // therefore expect one notes part per slide, not only for slides that
    // happen to carry notes (which would fail every export of a no-notes deck).
    const expectedNotes = this.config.includeSpeakerNotes ? slides.length : 0;

    const verification = await verifyPptxArchive({
      report,
      blob,
      nativeTextExpected,
      visualFallbackTexts,
      expectedNotes,
      includeSpeakerNotes: this.config.includeSpeakerNotes,
    });
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
