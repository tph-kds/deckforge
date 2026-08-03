export type DeckId = string;
export type SlideId = string;
export type BlockId = string;
export type InteractionId = string;

export type Frame = { x: number; y: number; w: number; h: number; rotation?: number; z?: number };
export type PositionMode = 'slot' | 'flow' | 'freeform' | 'background';

export type BuildAnimation = {
  id: string;
  trigger?: 'on-enter' | 'on-click' | 'with-previous' | 'after-previous' | 'on-hover' | 'on-visible';
  order?: number;
  durationMs?: number;
  delayMs?: number;
  easing?: string;
  reducedMotionFallback?: string;
};

export type DeckBlock = {
  id: BlockId;
  type: string;
  content?: unknown;
  slot?: string;
  positionMode?: PositionMode;
  frame?: Frame;
  resolvedFrame?: Frame;
  fitPolicy?: 'wrap' | 'contain' | 'cover' | 'scroll' | 'change-layout' | 'split-slide';
  style?: Record<string, unknown>;
  data?: unknown;
  alt?: string;
  ariaLabel?: string;
  sourceIds?: string[];
  animation?: BuildAnimation;
  locked?: boolean;
  hidden?: boolean;
  decorative?: boolean;
  allowOverlap?: boolean;
  groupId?: string;
  role?: string;
};

export type LayoutBinding = { slot: string; blockIds: BlockId[]; flow?: 'stack' | 'row' | 'grid' | 'overlay'; gap?: number };

export type DeckInteraction = {
  id: InteractionId;
  type: string;
  trigger: string;
  targetId?: string;
  action: string;
  payload?: unknown;
  audienceVisible?: boolean;
  requiresNetwork?: boolean;
  fallback?: string;
  ariaLabel?: string;
};

export type DeckSlide = {
  id: SlideId;
  title: string;
  layout: string;
  layoutVariant?: string;
  layoutBindings?: LayoutBinding[];
  density?: 'low' | 'medium' | 'high';
  focalBlockId?: BlockId;
  blocks: DeckBlock[];
  speakerNotes?: string;
  sources?: string[];
  interactions?: DeckInteraction[];
  hidden?: boolean;
  section?: string;
  transition?: string;
  durationMs?: number;
};

export type DeckProject = {
  schemaVersion: '2.1';
  experience: {
    profile: 'editable-deck' | 'presentation-runtime' | 'published-story' | 'embedded-deck';
    surfaces: Array<'editor' | 'presenter' | 'viewer' | 'embed-viewer'>;
    routes?: Record<string, string>;
    capabilities?: string[];
  };
  meta: {
    id: DeckId;
    slug: string;
    title: string;
    language: string;
    description?: string;
    audience?: string;
    objective?: string;
    templateId?: string;
  };
  canvas: {
    aspectRatio: '16:9' | '4:3' | 'custom';
    width: number;
    height: number;
    safeMargin?: number;
    grid?: number;
    responsiveMode?: 'letterbox' | 'reflow' | 'hybrid';
    layoutMode?: 'semantic-slots' | 'hybrid' | 'freeform';
  };
  theme: { id: string; overrides?: Record<string, unknown>; designSystemRef?: string };
  presentation: {
    mode: 'horizontal' | 'vertical' | 'freeform' | '3d-coverflow';
    transition: string;
    keyboard: boolean;
    touch?: boolean;
    deepLinks?: boolean;
    overview?: boolean;
    speakerView?: boolean;
    progress?: boolean;
    controls?: boolean;
    reducedMotion: 'respect-system' | 'always' | 'never';
    motionProfileId?: string;
    defaultBuilds?: boolean;
  };
  editor: {
    enabled: boolean;
    toolbar: boolean;
    history: boolean;
    sidePanel?: boolean;
    assetLibrary?: boolean;
    themePicker?: boolean;
    layoutPicker?: boolean;
    shortcutHelp?: boolean;
    saveStatus?: boolean;
    persistence?: 'none' | 'local-storage' | 'api' | 'host-managed';
    snapToGrid?: boolean;
    guides?: boolean;
    comments?: boolean;
    collaboration?: boolean;
    autosave?: boolean;
    commandPalette?: boolean;
    notes?: boolean;
    allowedBlockTypes?: string[];
    requiredZones?: string[];
  };
  shortcuts?: { helpEnabled?: boolean; helpKey?: string; editorPreset?: string; presenterPreset?: string };
  slides: DeckSlide[];
  sources?: Array<{ id: string; title: string; url: string }>;
  publish: { visibility: 'private' | 'workspace' | 'unlisted' | 'public'; embed: { enabled: boolean; allowedOrigins?: string[]; sandbox?: string[]; responsive?: boolean } };
};

export type EditorSelection = { slideId: SlideId; blockIds: BlockId[]; mode?: 'block' | 'text' | 'canvas' };
export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed' | 'offline' | 'conflict';

export type {
  ExportIssueSeverity,
  PptxExportability,
  ExportIssue,
  ExportPreflightResult,
  PptxExportConfig,
  FontWarning,
  PptxSlideElement,
  PptxExportContext,
  PptxBlockExporter,
  ExportDialogProps,
} from './export/export-types';

export { DEFAULT_PPTX_CONFIG } from './export/export-types';
