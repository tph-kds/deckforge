// starter-components/export/index.ts

export type {
  ExportIssue,
  ExportIssueSeverity,
  ExportPreflightResult,
  PptxExportConfig,
  PptxExportContext,
  PptxExportability,
  PptxSlideElement,
  PptxBlockExporter,
  FontWarning,
  ExportDialogProps,
} from "./export-types";

export { DEFAULT_PPTX_CONFIG } from "./export-types";

export { PptxExporter } from "./pptx/pptx-exporter";
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

export { textBlockExporter } from "./pptx/block-exporters/text";
export { imageBlockExporter } from "./pptx/block-exporters/image";
export { shapeBlockExporter } from "./pptx/block-exporters/shape";
export { tableBlockExporter } from "./pptx/block-exporters/table";
export { chartBlockExporter } from "./pptx/block-exporters/chart";
export { diagramBlockExporter } from "./pptx/block-exporters/diagram";
export { fallbackBlockExporter } from "./pptx/block-exporters/fallback";

export { runExportPreflight } from "./export-preflight";
export { ExportDialog } from "./export-dialog";
