import type { Block, DeckProject, SaveState } from "../deck/types";
import type { PreparedAsset } from "./prepare-export";
import type { Command, DispatchResult } from "../deck/commands";

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
  | "no-fallback-produced"
  | "empty-table"
  | "template-chart-skipped"
  | "chart-no-data"
  | "invalid-geometry"
  | "aspect-mismatch"
  | "duplicate-element-id"
  | "unresolved-image"
  | "template-chart-leak"
  | "chart-data-mismatch"
  | "chart-count-mismatch";

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

export type PreflightIssueGroup = "geometry" | "assets" | "content" | "structural";

export interface PreflightGroupSummary {
  group: PreflightIssueGroup;
  label: string;
  count: number;
  issues: ExportIssue[];
}

/** Coverage invariants: expected == native + fallback and missing == 0. */
export interface ExportCoverage {
  expected: number;
  native: number;
  fallback: number;
  missing: number;
  satisfied: boolean;
}

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
  /** True when export may proceed cleanly (no errors, zero missing geometry). */
  ready: boolean;
  /** Visible blocks with no resolvable canonical frame (fail-close gate). */
  geometryMissingCount: number;
  /** Number of visible blocks (the "expected" denominator). */
  visibleBlockCount: number;
  /** Coverage invariants over the resolved scene. */
  coverage: ExportCoverage;
  /** Diagnostics grouped by pipeline stage for the UI. */
  groups: PreflightGroupSummary[];
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

/** A single styled run inside a native text element (pptxgenjs TextProps). */
export interface PptxTextRun {
  text: string;
  options?: Record<string, unknown>;
}

interface PptxTextElement {
  type: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: { text: string | PptxTextRun[]; options?: Record<string, unknown> };
}

interface PptxImageElement {
  type: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: {
    dataUri: string;
    alt?: string;
    /** Intrinsic pixel dimensions of the source image, when known. Used to
     * crop cover/contain from the real aspect ratio instead of stretching. */
    naturalWidth?: number;
    naturalHeight?: number;
    options?: Record<string, unknown>;
  };
}

interface PptxShapeElement {
  type: "shape";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: { shape: string; options?: Record<string, unknown> };
}

interface PptxTableElement {
  type: "table";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: { rows: unknown[][]; options?: Record<string, unknown> };
}

interface PptxChartElement {
  type: "chart";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: { chartType: string; data: unknown[]; options?: Record<string, unknown> };
}

interface PptxFallbackElement {
  type: "fallback";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
  data: { text: string; options?: Record<string, unknown> };
}

interface PptxSvgElement {
  type: "svg";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable identity of the source block (SlideDocument) for validation/diagnostics. */
  elementId?: string;
  /** Stable identity of the owning slide. */
  slideId?: string;
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
  /**
   * The canonical, pre-resolved asset registry produced by the single
   * `prepareExport` phase. Exporters MUST consume resolved bytes from here and
   * must never fetch or re-resolve an asset on their own. Keyed by canonical
   * asset id (manifest id or `inline:<blockId>`).
   */
  assetRegistry: ReadonlyMap<string, PreparedAsset>;
  /** Document pixel width of the slide (from SlideDocument.canvas). */
  slideWidth: number;
  /** Document pixel height of the slide (from SlideDocument.canvas). */
  slideHeight: number;
  /**
   * PowerPoint slide size in inches, DERIVED from the document aspect ratio
   * (Phase 4). webAspect === pptxAspect always. Never a hard-coded 13.333x7.5.
   */
  pptxWidth: number;
  pptxHeight: number;
}

export interface PptxBlockExport {
  element?: PptxSlideElement;
  /**
   * Additional elements produced by one source block (e.g. a process diagram
   * rendered as several editable shapes + connectors). When present, all of
   * them are written to the slide; `element` remains the primary representative
   * used for representation planning.
   */
  elements?: PptxSlideElement[];
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
  commit?: (command: Command) => DispatchResult | undefined;
  saveNow?: (deck: DeckProject) => SaveState;
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
