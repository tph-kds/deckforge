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
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportResult,
  FontWarning,
  ExportDialogProps,
  BlockRepresentation,
  PptxVerificationCheck,
  PptxVerificationReport,
  FidelityReport,
} from "./export-types";

export { DEFAULT_PPTX_CONFIG } from "./export-types";

export { PptxExporter, buildExportReport, deriveExportStatus } from "./pptx/pptx-exporter";
export { verifyPptxArchive } from "./pptx/pptx-verifier";
export { createExportContext } from "./pptx/pptx-context";
export { mapThemeColors, mapThemeFonts, applyThemeToPptx } from "./pptx/pptx-theme";
export { checkFontCompatibility, collectFontWarnings } from "./pptx/pptx-fonts";
export { embedAsset, embedAssetSync } from "./pptx/pptx-assets";
export { renderFallback } from "./pptx/pptx-fallback-renderer";

export {
  blockExporters,
  getBlockExporter,
  getExportability,
} from "./pptx/block-exporters/index";

export { textBlockExporter, headingBlockExporter, bulletsBlockExporter, calloutBlockExporter, citationBlockExporter, metricBlockExporter, processBlockExporter } from "./pptx/block-exporters/text";
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
export { buildFidelityReport, fidelityStatus } from "./fidelity/fidelity-report";
export { renderDiagramSvg, normalizeDiagram } from "./fidelity/svg/svg-diagram";
export { renderSnapshotSvg } from "./fidelity/svg/svg-snapshot";

export type {
  FidelityStatus,
  FidelityBlockReport,
  FidelityHardRules,
  PptxFidelityPolicy,
} from "./fidelity/fidelity-types";
export type { PlannerInput } from "./fidelity/representation-planner";
export type { BuildFidelityReportInput } from "./fidelity/fidelity-report";

export { runExportPreflight } from "./export-preflight";
export { ExportDialog } from "./export-dialog";