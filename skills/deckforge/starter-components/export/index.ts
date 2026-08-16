export type {
  ExportIssue,
  ExportIssueSeverity,
  ExportIssueCode,
  ExportPreflightResult,
  ExportReport,
  ExportBlockReport,
  ExportSlideReport,
  ExportStatus,
  BlockExportStatus,
  PptxExportConfig,
  PptxExportMode,
  PptxExportContext,
  PptxExportability,
  PptxSlideElement,
  PptxSlideElementType,
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportResult,
  PptxTextRun,
  FontWarning,
  ExportDialogProps,
  BlockRepresentation,
  PptxVerificationCheck,
  PptxVerificationReport,
  FidelityReport,
  ExportCoverage,
  PreflightGroupSummary,
  PreflightIssueGroup,
} from "./export-types";

export { DEFAULT_PPTX_CONFIG } from "./export-types";

export {
  isUsableFrame,
  aspectOf,
  aspectMatches,
  derivePptxSlideSize,
  documentRectToPptxRect,
  documentUnitToPptxInches,
  browserFontSizeToPptPt,
  fontSizeFromCqw,
  validateFrame,
  validateRectWithinSlide,
} from "./geometry";
export type { Rect, Size } from "./geometry";

export {
  resolveSlideSnapshot,
  resolveChartSpecForBlock,
  createDeckSnapshot,
  validateSnapshot,
  hashSlideSemanticContent,
} from "./snapshot";
export type {
  ImmutableSlideSnapshot,
  ResolvedAssetSnapshot,
  ResolvedBlockSnapshot,
  ResolvedChartSpec,
  ResolvedChartStyle,
  ResolvedPaint,
  ResolvedTextStyle,
  ResolvedThemeSnapshot,
} from "./snapshot";

export { prepareExport, isPreparedExport } from "./prepare-export";
export type { PreparedExport, PreparedAsset, PreparedAssetStatus } from "./prepare-export";

export { makeDeckSelfContained } from "./self-contained";
export type { EmbedFn, SelfContainedFailure, SelfContainedResult } from "./self-contained";

export {
  resolveTheme,
  normalizeColor,
  hexToRgb,
  hexToPptx,
  resolvePptxFont,
  isPptxSafeFont,
  resolveChartColors,
  resolveTextColor,
} from "./resolved-theme";
export type { ResolvedTheme } from "./resolved-theme";

export { readImageSizeFromDataUri } from "./image-dimensions";
export type { IntrinsicImageSize } from "./image-dimensions";

export { validateExportScene, sceneHasErrors } from "./export-scene";
export type { ExportScene, ExportSceneDiagnostic, SceneSeverity } from "./export-scene";

export { renderChartToSvg } from "./fidelity/svg/svg-chart";
export { renderSvgToPng } from "./fidelity/svg/svg-raster";
export { renderDiagramSvg, normalizeDiagram } from "./fidelity/svg/svg-diagram";
export type { DiagramInput, DiagramNodeInput, DiagramEdgeInput, DiagramSvgOptions } from "./fidelity/svg/svg-diagram";
export { renderSnapshotSvg } from "./fidelity/svg/svg-snapshot";
export type { SnapshotSvgOptions } from "./fidelity/svg/svg-snapshot";

export { PLACEHOLDER_IMAGE_DATA_URI } from "./pptx/pptx-placeholder";

export {
  exportFrameOf,
  frameErrorIssue,
  frameValidation,
  browserTypographyFor,
  fontSizeToPpt,
  pptFontFor,
  textFrameOptions,
  estimateTextHeightPx,
} from "./pptx/export-utils";
export type { BrowserTypography } from "./pptx/export-utils";

export { PptxExporter, buildExportReport, deriveExportStatus } from "./pptx/pptx-exporter";
export type { ExportBuildResult } from "./pptx/pptx-exporter";
export { verifyPptxArchive } from "./pptx/pptx-verifier";
export type { VerificationInput } from "./pptx/pptx-verifier";
export { createExportContext } from "./pptx/pptx-context";
export { mapThemeColors, mapThemeFonts } from "./pptx/pptx-theme";
export { checkFontCompatibility, collectFontWarnings } from "./pptx/pptx-fonts";
export { embedAsset, embedAssetDetailed, embedAssetSync } from "./pptx/pptx-assets";
export type { AssetEmbedResult, EmbedOutcome } from "./pptx/pptx-assets";
export { renderFallback } from "./pptx/pptx-fallback-renderer";

export { blockExporters, getBlockExporter, getExportability } from "./pptx/block-exporters/index";

export {
  textBlockExporter,
  headingBlockExporter,
  bulletsBlockExporter,
  calloutBlockExporter,
  citationBlockExporter,
  metricBlockExporter,
} from "./pptx/block-exporters/text";
export { processBlockExporter } from "./pptx/block-exporters/process";
export { imageBlockExporter } from "./pptx/block-exporters/image";
export { shapeBlockExporter } from "./pptx/block-exporters/shape";
export { tableBlockExporter } from "./pptx/block-exporters/table";
export { chartBlockExporter } from "./pptx/block-exporters/chart";
export { diagramBlockExporter } from "./pptx/block-exporters/diagram";
export { videoBlockExporter } from "./pptx/block-exporters/video";
export { fallbackBlockExporter } from "./pptx/block-exporters/fallback";

export { FIDELITY_POLICY } from "./fidelity/fidelity-policy";
export { calculateContentParity, rawText } from "./fidelity/content-parity";
export { planBlockRepresentation, countRepresentation } from "./fidelity/representation-planner";
export type { PlannerInput } from "./fidelity/representation-planner";
export { buildFidelityReport, fidelityStatus } from "./fidelity/fidelity-report";
export type { BuildFidelityReportInput } from "./fidelity/fidelity-report";
export type {
  FidelityBlockReport,
  FidelityHardRules,
  FidelityStatus,
  PptxFidelityPolicy,
} from "./fidelity/fidelity-types";

export { runExportPreflight, compareSnapshots } from "./export-preflight";
export { ExportDialog } from "./export-dialog";
