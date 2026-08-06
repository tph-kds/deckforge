// starter-components/export/index.ts
// Re-exports from skills/deckforge/starter-components/export/

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
  PptxExportContext,
  PptxExportability,
  PptxSlideElement,
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportResult,
  FontWarning,
  ExportDialogProps,
} from "../../skills/deckforge/starter-components/export/export-types";

export { DEFAULT_PPTX_CONFIG } from "../../skills/deckforge/starter-components/export/export-types";

export { PptxExporter, buildExportReport, deriveExportStatus, verifyPptxArchive } from "../../skills/deckforge/starter-components/export/pptx/pptx-exporter";
export { createExportContext } from "../../skills/deckforge/starter-components/export/pptx/pptx-context";
export { mapThemeColors, mapThemeFonts, applyThemeToPptx } from "../../skills/deckforge/starter-components/export/pptx/pptx-theme";
export { checkFontCompatibility, collectFontWarnings } from "../../skills/deckforge/starter-components/export/pptx/pptx-fonts";
export { embedAsset, embedAssetSync } from "../../skills/deckforge/starter-components/export/pptx/pptx-assets";
export { renderFallback } from "../../skills/deckforge/starter-components/export/pptx/pptx-fallback-renderer";

export {
  blockExporters,
  getBlockExporter,
  getExportability,
} from "../../skills/deckforge/starter-components/export/pptx/block-exporters/index";

export { textBlockExporter, headingBlockExporter, bulletsBlockExporter, calloutBlockExporter, citationBlockExporter, metricBlockExporter, processBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/text";
export { imageBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/image";
export { shapeBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/shape";
export { tableBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/table";
export { chartBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/chart";
export { diagramBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/diagram";
export { fallbackBlockExporter } from "../../skills/deckforge/starter-components/export/pptx/block-exporters/fallback";

export { runExportPreflight } from "../../skills/deckforge/starter-components/export/export-preflight";
export { ExportDialog } from "../../skills/deckforge/starter-components/export/export-dialog";