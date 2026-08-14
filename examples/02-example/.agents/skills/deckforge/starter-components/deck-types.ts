export type DeckId = string;
export type SlideId = string;
export type BlockId = string;
export type InteractionId = string;

export type BuildAnimation = {
  id: string;
  trigger?: 'on-enter' | 'on-click' | 'with-previous' | 'after-previous' | 'on-hover' | 'on-visible';
  order?: number;
  durationMs?: number;
  delayMs?: number;
  easing?: string;
  reducedMotionFallback?: string;
};

export type DeckBlock = Block;

export type DeckInteraction = SlideInteraction & {
  audienceVisible?: boolean;
  requiresNetwork?: boolean;
  fallback?: string;
};

export type EditorSelection = { slideId: SlideId; blockIds: BlockId[]; mode?: 'block' | 'text' | 'canvas' };

export type {
  PositionMode,
  FitPolicy,
  Frame,
  BlockAnimation,
  BlockStyle,
  ChartValue,
  ChartContent,
  AssetKind,
  DeckAsset,
  ImageBlockContent,
  MetricContent,
  ProcessStep,
  Block,
  LayoutBinding,
  SlideInteraction,
  DeckSlide,
  SourceRef,
  ThemeTokens,
  ThemeGradients,
  ThemeDef,
  DeckProject,
  SaveState,
  Route,
  PresenterBuildState,
  RenderBlockProps,
} from './deck/types';

export type {
  ExportIssueSeverity,
  PptxExportability,
  ExportIssue,
  ExportPreflightResult,
  ExportReport,
  ExportStatus,
  PptxExportMode,
  PptxExportConfig,
  FontWarning,
  PptxSlideElement,
  PptxExportContext,
  PptxBlockExporter,
  ExportDialogProps,
  BlockRepresentation,
  PptxVerificationCheck,
  PptxVerificationReport,
  FidelityReport,
} from './export/export-types';

export { DEFAULT_PPTX_CONFIG } from './export/export-types';
