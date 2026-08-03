export type ExportIssueSeverity = "info" | "warning" | "error";

export type PptxExportability =
  | "native-editable"
  | "native-with-reduction"
  | "hybrid-rasterized"
  | "image-only"
  | "poster-with-link"
  | "unsupported";

export interface ExportIssue {
  severity: ExportIssueSeverity;
  code: string;
  slideId?: string;
  blockId?: string;
  message: string;
  suggestedFix?: string;
  automaticFixAvailable: boolean;
}

export interface ExportPreflightResult {
  issues: ExportIssue[];
  score: number;
  blockCoverage: number;
}

export interface PptxExportConfig {
  mode: "hybrid";
  includeSpeakerNotes: boolean;
  includeHiddenSlides: boolean;
  compatibilityTargets: string[];
  fontPolicy: "warn-and-substitute" | "embed-when-licensed";
  filenameTemplate: string;
}

export interface FontWarning {
  fontFamily: string;
  slideId?: string;
  blockId?: string;
  substituteFont?: string;
}

export interface PptxSlideElement {
  type: "text" | "image" | "shape" | "table" | "chart" | "fallback";
  x: number;
  y: number;
  w: number;
  h: number;
  data: unknown;
}

export interface PptxExportContext {
  pptx: unknown;
  deck: unknown;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, string>;
  slideWidth: number;
  slideHeight: number;
}

export interface PptxBlockExporter {
  type: string;
  export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement>;
  exportability: PptxExportability;
}

export interface ExportDialogProps {
  deck: unknown;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (result: Blob) => void;
  onError?: (error: Error) => void;
}

export const DEFAULT_PPTX_CONFIG: PptxExportConfig = {
  mode: "hybrid",
  includeSpeakerNotes: true,
  includeHiddenSlides: false,
  compatibilityTargets: ["powerpoint", "keynote", "libreoffice"],
  fontPolicy: "warn-and-substitute",
  filenameTemplate: "{title}-{date}.pptx",
};
