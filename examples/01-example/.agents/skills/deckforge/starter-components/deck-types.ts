export type DeckId = string;
export type SlideId = string;
export type BlockId = string;
export type InteractionId = string;

export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;
};

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
  frame?: Frame;
  style?: Record<string, unknown>;
  data?: unknown;
  alt?: string;
  ariaLabel?: string;
  sourceIds?: string[];
  animation?: BuildAnimation;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  role?: string;
};

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
  schemaVersion: '2.0';
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
  };
  editor: {
    enabled: boolean;
    toolbar: boolean;
    history: boolean;
    snapToGrid?: boolean;
    guides?: boolean;
    comments?: boolean;
    collaboration?: boolean;
    autosave?: boolean;
    commandPalette?: boolean;
    notes?: boolean;
    allowedBlockTypes?: string[];
  };
  slides: DeckSlide[];
  sources?: Array<{ id: string; title: string; url: string }>;
  publish: {
    visibility: 'private' | 'workspace' | 'unlisted' | 'public';
    embed: { enabled: boolean; allowedOrigins?: string[]; sandbox?: string[]; responsive?: boolean };
  };
};

export type EditorSelection = {
  slideId: SlideId;
  blockIds: BlockId[];
  mode?: 'block' | 'text' | 'canvas';
};
