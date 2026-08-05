import type { Block, DeckProject } from "../deck/types";
import type { AssetEmbedResult } from "./pptx/pptx-assets";

export type ExportIssueSeverity = "info" | "warning" | "error";

export type ExportIssueCode =
  | "missing-font"
  | "font-substitution"
  | "image-load-failed"
  | "unsupported-block"
  | "unsupported-block-type"
  | "unsupported-css-effect"
  | "oversized-content"
  | "fallback-rasterized"
  | "archive-verification-failed"
  | "block-export-failed"
  | "block-hidden-skipped"
  | "hidden-slide-skipped"
  | "missing-speaker-notes"
  | "external-asset"
  | "no-fallback-produced";

export interface ExportIssue {
  code: ExportIssueCode;
  severity: ExportIssueSeverity;
  slideId?: string;
  blockId?: string;
  message: string;
  note?: string;
  suggestedFix?: string;
  automaticFixAvailable: boolean;
}

export type BlockExportStatus = "native" | "rasterized" | "substituted" | "skipped" | "unsupported";

export interface ExportBlockReport {
  blockId: string;
  status: BlockExportStatus;
  issues: ExportIssue[];
}

export interface ExportSlideReport {
  slideId: string;
  blocks: ExportBlockReport[];
}

export type ExportStatus = "complete" | "partial" | "failed";

export interface ExportReport {
  status: ExportStatus;
  slides: ExportSlideReport[];
  issues: ExportIssue[];
  outputPath?: string;
}

export interface PptxExportResult {
  report: ExportReport;
  blob: Blob;
  archiveVerified: boolean;
}

export type PptxExportability =
  | "native-editable"
  | "native-with-reduction"
  | "hybrid-rasterized"
  | "image-only"
  | "poster-with-link"
  | "unsupported";

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

interface PptxTextElement {
  type: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { text: string; options?: Record<string, unknown> };
}

interface PptxImageElement {
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { dataUri: string; alt?: string; options?: Record<string, unknown> };
}

interface PptxShapeElement {
  type: "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { shape: string; options?: Record<string, unknown> };
}

interface PptxTableElement {
  type: "table";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { rows: unknown[][]; options?: Record<string, unknown> };
}

interface PptxChartElement {
  type: "chart";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { chartType: string; data: unknown[]; options?: Record<string, unknown> };
}

interface PptxFallbackElement {
  type: "fallback";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { text: string; options?: Record<string, unknown> };
}

export type PptxSlideElement =
  | PptxTextElement
  | PptxImageElement
  | PptxShapeElement
  | PptxTableElement
  | PptxChartElement
  | PptxFallbackElement;

export interface PptxExportContext {
  deck: DeckProject;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, AssetEmbedResult>;
  slideWidth: number;
  slideHeight: number;
}

export interface PptxBlockExport {
  element?: PptxSlideElement;
  status: BlockExportStatus;
  issues: ExportIssue[];
}

export interface PptxBlockExporter {
  type: string;
  export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport>;
  exportability: PptxExportability;
}

export interface ExportDialogProps {
  deck: DeckProject;
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

export type { Block };
