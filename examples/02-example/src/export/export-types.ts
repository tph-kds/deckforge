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
  representation?: BlockRepresentation;
  contentPreserved?: boolean;
  editable?: boolean;
  visualParity?: number;
}

export interface ExportSlideReport {
  slideId: string;
  blocks: ExportBlockReport[];
}

export type ExportStatus = "complete" | "complete-with-fallbacks" | "partial" | "failed";

export type PptxExportMode = "fidelity-first" | "editability-first";

export type BlockRepresentation = "native" | "svg" | "raster" | "expanded-build" | "unsupported";

export type FidelityStatus = ExportStatus;

export interface PptxVerificationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PptxVerificationReport {
  checks: PptxVerificationCheck[];
  passed: boolean;
}

export interface FidelityReport {
  status: FidelityStatus;
  contentRecall: number;
  missingVisibleBlocks: number;
  blocks: ExportBlockReport[];
  verification?: PptxVerificationReport;
}

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
  fidelity?: FidelityReport;
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
  estimatedFallbacks: number;
  estimatedRecall: number;
  estimatedMissing: number;
  missingBlockCount: number;
  unsupportedBlockCount: number;
  chartBlockCount: number;
}

export interface PptxExportConfig {
  mode: PptxExportMode;
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

interface PptxSvgElement {
  type: "svg";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { svg: string; alt?: string; options?: Record<string, unknown> };
}

export type PptxSlideElementType =
  | "text"
  | "image"
  | "shape"
  | "table"
  | "chart"
  | "fallback"
  | "svg";

export type PptxSlideElement =
  | PptxTextElement
  | PptxImageElement
  | PptxShapeElement
  | PptxTableElement
  | PptxChartElement
  | PptxFallbackElement
  | PptxSvgElement;

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
  mode: "fidelity-first",
  includeSpeakerNotes: true,
  includeHiddenSlides: false,
  compatibilityTargets: ["powerpoint", "keynote", "libreoffice"],
  fontPolicy: "warn-and-substitute",
  filenameTemplate: "{title}-{date}.pptx",
};

export type { Block };
