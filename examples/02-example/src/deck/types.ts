import type { ReactNode } from 'react';
import type { ScrollbarThemeMapping } from './scrollbars/scrollbarTypes';

export type PositionMode = 'slot' | 'flow' | 'freeform' | 'background';
export type FitPolicy = 'wrap' | 'contain' | 'cover' | 'scroll' | 'change-layout' | 'split-slide';

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;
}

export interface BlockAnimation {
  id: string;
  trigger?: 'on-enter' | 'on-click' | 'with-previous' | 'after-previous';
  order?: number;
  durationMs?: number;
  delayMs?: number;
  easing?: string;
  reducedMotionFallback?: string;
}

export interface BlockStyle {
  variant?: string;
  level?: number;
  align?: string;
  [key: string]: unknown;
}

export interface ChartValue {
  label: string;
  value: number;
}

export interface ChartContent {
  type: 'bar' | 'bar-horizontal' | 'line';
  title?: string;
  unit?: string;
  values: ChartValue[];
  highlightIndex?: number;
  summary?: string;
  /** True when the chart is still a starter "New chart" template from the
   * editor's block palette, not real authored content. Template charts are
   * excluded from export rather than leaking placeholder data. */
  isTemplate?: boolean;
}

export type AssetKind = 'image' | 'video' | 'audio' | 'font' | 'data' | 'document' | 'model' | 'embed-poster';

/** Asset manifest entry (plan §9.1 AssetManifestItem). */
export interface DeckAsset {
  id: string;
  kind: AssetKind;
  src: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  alt?: string;
  credit?: string;
  license?: string;
  integrity?: string;
  posterSrc?: string;
  transcriptSrc?: string;
  focalPoint?: { x: number; y: number };
  status?: 'ready' | 'failed' | 'placeholder';
}

/** Content shape for image blocks (plan §9.2 ImageBlockData). */
export interface ImageBlockContent {
  assetId?: string;
  src?: string;
  fit?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  caption?: string;
  attribution?: string;
  alt?: string;
  decorative?: boolean;
  rounded?: boolean;
}

export interface MetricContent {
  value: string;
  label?: string;
  delta?: string;
}

export interface ProcessStep {
  title: string;
  detail?: string;
}

export interface Block {
  id: string;
  type: string;
  content: unknown;
  frame?: Frame;
  style?: BlockStyle;
  data?: Record<string, unknown>;
  alt?: string;
  ariaLabel?: string;
  sourceIds?: string[];
  animation?: BlockAnimation;
  locked?: boolean;
  hidden?: boolean;
  role?: string;
  slot?: string;
  positionMode?: PositionMode;
  fitPolicy?: FitPolicy;
  resolvedFrame?: Frame;
  decorative?: boolean;
  allowOverlap?: boolean;
}

export interface LayoutBinding {
  slot: string;
  blockIds: string[];
  flow?: 'stack' | 'row' | 'grid' | 'overlay';
  gap?: number;
}

export interface SlideInteraction {
  id: string;
  type: string;
  trigger: string;
  action: string;
  payload?: unknown;
  ariaLabel?: string;
}

export interface DeckSlide {
  id: string;
  title: string;
  layout: string;
  hidden?: boolean;
  section?: string;
  background?: Record<string, unknown>;
  blocks: Block[];
  speakerNotes?: string;
  sources?: string[];
  interactions?: SlideInteraction[];
  transition?: string;
  durationMs?: number;
  tags?: string[];
  layoutVariant?: string;
  layoutBindings?: LayoutBinding[];
  density?: 'low' | 'medium' | 'high';
  focalBlockId?: string;
}

export interface SourceRef {
  id: string;
  title: string;
  url: string;
  authors?: string[];
  publisher?: string;
  publishedAt?: string;
  accessedAt?: string;
  note?: string;
  license?: string;
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  surface: string;
  muted: string;
  surfaceElevated: string;
  border: string;
  focus: string;
}

/**
 * Approved gradient uses (plan §10.3): hero backgrounds, small emphasis
 * surfaces, progress bars, highlight sweeps, and decorative accents.
 * Gradients must never cover body paragraphs, bullet lists, or data tables.
 */
export interface ThemeGradients {
  hero?: string;
  emphasis?: string;
  progress?: string;
  highlight?: string;
  accent?: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  category?: string;
  description?: string;
  tokens: ThemeTokens;
  typography: { headingFont: string; bodyFont: string; codeFont: string };
  mood?: string;
  chartPalette: string[];
  shapeLanguage?: string;
  motionStyle?: string;
  gradients?: ThemeGradients;
  antiPatterns?: string[];
  scrollbar?: ScrollbarThemeMapping;
}

export interface DeckProject {
  schemaVersion: string;
  meta: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    language: string;
    audience?: string;
    objective?: string;
    templateId?: string;
    authors?: string[];
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    seedVersion?: string;
  };
  canvas: {
    aspectRatio: '16:9' | '4:3' | 'custom';
    width: number;
    height: number;
    safeMargin: number;
    grid?: number;
    responsiveMode?: 'letterbox' | 'reflow' | 'hybrid';
    layoutMode?: 'semantic-slots' | 'hybrid' | 'freeform';
    background?: string;
  };
  theme: { id: string; overrides?: Record<string, unknown>; designSystemRef?: string; mode?: string };
  presentation: {
    mode?: string;
    transition?: string;
    motionProfileId?: string;
    defaultBuilds?: boolean;
    keyboard?: boolean;
    touch?: boolean;
    deepLinks?: boolean;
    overview?: boolean;
    speakerView?: boolean;
    progress?: boolean;
    controls?: boolean;
    reducedMotion?: 'respect-system' | 'always' | 'never';
    autoplay?: { enabled: boolean; intervalMs?: number; loop?: boolean; pauseOnInteraction?: boolean };
  };
  editor: {
    enabled: boolean;
    toolbar?: boolean;
    history?: boolean;
    snapToGrid?: boolean;
    guides?: boolean;
    comments?: boolean;
    collaboration?: boolean;
    autosave?: boolean;
    commandPalette?: boolean;
    notes?: boolean;
    allowedBlockTypes?: string[];
    sidePanel?: boolean;
    assetLibrary?: boolean;
    themePicker?: boolean;
    layoutPicker?: boolean;
    shortcutHelp?: boolean;
    saveStatus?: boolean;
    persistence?: 'none' | 'local-storage' | 'api' | 'host-managed';
    routes?: Record<string, string>;
    requiredZones?: string[];
  };
  assets?: DeckAsset[];
  slides: DeckSlide[];
  sources?: SourceRef[];
  publish?: {
    visibility?: string;
    slug?: string;
    embed?: { enabled: boolean; allowedOrigins?: string[]; sandbox?: string[]; responsive?: boolean };
    analytics?: boolean;
    allowDownload?: boolean;
  };
  experience?: {
    profile: string;
    surfaces: string[];
    routes?: Record<string, string>;
    capabilities?: string[];
  };
  shortcuts?: {
    helpEnabled?: boolean;
    helpKey?: string;
    editorPreset?: string;
    presenterPreset?: string;
    overrides?: Record<string, unknown>;
  };
}

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed' | 'offline' | 'conflict';

export interface EditorSelection {
  slideId: string;
  blockIds: string[];
  mode: 'block' | 'slide' | 'none';
}

export type Route = 'editor' | 'present';

export interface PresenterBuildState {
  slideIndex: number;
  step: number;
}

export type RenderBlockProps = {
  block: Block;
  deck: DeckProject;
  slide: DeckSlide;
  editing?: boolean;
  selected?: boolean;
  onSelect?: (id: string, additive: boolean) => void;
  renderNode?: (block: Block) => ReactNode;
};
