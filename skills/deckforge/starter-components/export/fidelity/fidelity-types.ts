import type {
  BlockRepresentation,
  ExportBlockReport,
  ExportStatus,
  FidelityReport,
  PptxExportMode,
  PptxVerificationReport,
} from "../export-types";

export type { BlockRepresentation, FidelityReport, PptxExportMode, PptxVerificationReport };

export type FidelityStatus = ExportStatus;

export type FidelityBlockReport = ExportBlockReport;

export interface FidelityHardRules {
  meaningfulContentRecall: number;
  maxMissingVisibleBlocks: number;
  silentOmissionAllowed: boolean;
  diagramSummaryFallbackAllowed: boolean;
}

export interface PptxFidelityPolicy {
  version: string;
  defaultMode: PptxExportMode;
  priorities: Array<"content" | "visual" | "geometry" | "editability" | "file-size">;
  hardRules: FidelityHardRules;
  representations: Array<"native" | "svg" | "raster" | "expanded-build">;
}
