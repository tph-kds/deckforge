// GENERATED FILE — do not edit by hand.
// Source of truth: schemas/deck-project.schema.json
// Regenerate with: npm run schema:generate (generator: deckforge @ 0.0.0)

/** Type aliases for common JSON Schema defs. */
export namespace $defs {
  export type NonEmptyString = string;
  export type Id = string;
  export type Slug = string;
  export type Meta = {
    audience?: string;
    authors?: Array<string>;
    createdAt?: string;
    description?: string;
    id: $defs.Id;
    language: string;
    objective?: string;
    slug: $defs.Slug;
    tags?: Array<string>;
    templateId?: string;
    title: $defs.NonEmptyString;
    updatedAt?: string;
  };
  export type Canvas = {
    aspectRatio: "16:9" | "4:3" | "custom";
    background?: string;
    grid?: number;
    height: number;
    layoutMode?: "semantic-slots" | "hybrid" | "freeform";
    responsiveMode?: "letterbox" | "reflow" | "hybrid";
    safeMargin?: number;
    width: number;
  };
  export type Theme = {
    designSystemRef?: string;
    id: string;
    mode?: "light" | "dark" | "system" | "fixed";
    overrides?: {
      scrollbar?: $defs.ScrollbarOverride;
    };
  };
  export type Autoplay = {
    enabled: boolean;
    intervalMs?: number;
    loop?: boolean;
    pauseOnInteraction?: boolean;
  };
  export type Presentation = {
    autoplay?: $defs.Autoplay;
    controls?: boolean;
    deepLinks?: boolean;
    defaultBuilds?: boolean;
    keyboard: boolean;
    mode: "horizontal" | "vertical" | "freeform" | "3d-coverflow";
    motionProfileId: "executive-subtle" | "technical-precise" | "education-guided" | "pitch-dynamic" | "seminar-editorial" | "portfolio-showcase" | "self-guided-calm" | "none-accessible";
    overview?: boolean;
    progress?: boolean;
    reducedMotion: "respect-system" | "always" | "never";
    speakerView?: boolean;
    touch?: boolean;
    transition: string;
  };
  export type Editor = {
    allowedBlockTypes?: Array<string>;
    assetLibrary?: boolean;
    autosave?: boolean;
    collaboration?: boolean;
    commandPalette?: boolean;
    comments?: boolean;
    enabled: boolean;
    guides?: boolean;
    history: boolean;
    layoutPicker?: boolean;
    notes?: boolean;
    persistence?: "none" | "local-storage" | "api" | "host-managed";
    requiredZones?: Array<string>;
    routes?: Record<string, unknown>;
    saveStatus?: boolean;
    shortcutHelp?: boolean;
    sidePanel?: boolean;
    snapToGrid?: boolean;
    themePicker?: boolean;
    toolbar: boolean;
  };
  export type Frame = {
    h: number;
    rotation?: number;
    w: number;
    x: number;
    y: number;
    z?: number;
  };
  export type Animation = {
    delayMs?: number;
    durationMs?: number;
    easing?: string;
    id: string;
    order?: number;
    reducedMotionFallback?: string;
    trigger?: "on-enter" | "on-click" | "with-previous" | "after-previous" | "on-hover" | "on-visible";
  };
  export type Block = {
    allowOverlap?: boolean;
    alt?: string;
    animation?: $defs.Animation;
    ariaLabel?: string;
    content?: unknown;
    data?: unknown;
    decorative?: boolean;
    fitPolicy?: "wrap" | "contain" | "cover" | "scroll" | "change-layout" | "split-slide";
    frame?: $defs.Frame;
    groupId?: $defs.Id;
    hidden?: boolean;
    id: $defs.Id;
    locked?: boolean;
    positionMode?: "slot" | "flow" | "freeform" | "background";
    resolvedFrame?: $defs.Frame;
    role?: string;
    slot?: string;
    sourceIds?: Array<$defs.Id>;
    style?: Record<string, unknown>;
    type: string;
  };
  export type Interaction = {
    action: string;
    ariaLabel?: string;
    audienceVisible?: boolean;
    fallback?: string;
    id: $defs.Id;
    payload?: unknown;
    requiresNetwork?: boolean;
    targetId?: string;
    trigger: "click" | "double-click" | "hover" | "focus" | "keyboard" | "submit" | "slide-enter" | "build-step" | "timer";
    type: "navigation" | "reveal" | "toggle" | "tabs" | "accordion" | "tooltip" | "modal" | "zoom" | "pan" | "filter" | "sort" | "poll" | "quiz" | "form" | "q-and-a" | "code-run" | "demo" | "media-control" | "annotation" | "branch" | "external-link" | "download" | "copy" | "custom-event";
  };
  export type Slide = {
    background?: Record<string, unknown>;
    blocks: Array<$defs.Block>;
    density?: "low" | "medium" | "high";
    durationMs?: number;
    focalBlockId?: $defs.Id;
    hidden?: boolean;
    id: $defs.Id;
    interactions?: Array<$defs.Interaction>;
    layout: string;
    layoutBindings?: Array<$defs.LayoutBinding>;
    layoutVariant?: string;
    section?: string;
    sources?: Array<$defs.Id>;
    speakerNotes?: string;
    tags?: Array<string>;
    title: string;
    transition?: string;
  };
  export type Asset = {
    alt?: string;
    credit?: string;
    durationMs?: number;
    focalPoint?: Record<string, unknown>;
    height?: number;
    id: $defs.Id;
    integrity?: string;
    kind: "image" | "video" | "audio" | "font" | "data" | "document" | "model" | "embed-poster";
    license?: string;
    mimeType?: string;
    posterSrc?: string;
    src: string;
    transcriptSrc?: string;
    width?: number;
  };
  export type Source = {
    accessedAt?: string;
    authors?: Array<string>;
    id: $defs.Id;
    license?: string;
    note?: string;
    publishedAt?: string;
    publisher?: string;
    title: $defs.NonEmptyString;
    url: string;
  };
  export type Embed = {
    allow?: Array<string>;
    allowedOrigins?: Array<string>;
    enabled: boolean;
    messageProtocolVersion?: string;
    referrerPolicy?: string;
    responsive?: boolean;
    sandbox?: Array<string>;
    title?: string;
  };
  export type Publish = {
    allowDownload?: boolean;
    analytics?: boolean;
    customDomain?: string;
    embed: $defs.Embed;
    indexing?: "allow" | "disallow";
    slug?: $defs.Slug;
    versionPolicy?: "latest" | "pinned";
    visibility: "private" | "workspace" | "unlisted" | "public";
  };
  export type Experience = {
    capabilities?: Array<string>;
    profile: "editable-deck" | "presentation-runtime" | "published-story" | "embedded-deck";
    routes?: Record<string, unknown>;
    surfaces: Array<"editor" | "presenter" | "viewer" | "embed-viewer">;
  };
  export type Shortcuts = {
    editorPreset?: string;
    helpEnabled?: boolean;
    helpKey?: string;
    overrides?: Record<string, unknown>;
    presenterPreset?: string;
  };
  export type ScrollbarOverride = {
    "app-page"?: string;
    "asset-library"?: string;
    default?: string;
    grid?: string;
    inspector?: string;
    modal?: string;
    presenter?: "none";
    "slide-list"?: string;
    "slide-stage"?: "none";
    "speaker-notes"?: string;
    "theme-library"?: string;
  };
  export type LayoutBinding = {
    blockIds: Array<$defs.Id>;
    flow?: "stack" | "row" | "grid" | "overlay";
    gap?: number;
    slot: string;
  };
}

export interface DeckProject {
  assets?: Array<$defs.Asset>;
  canvas: $defs.Canvas;
  editor: $defs.Editor;
  experience: $defs.Experience;
  meta: $defs.Meta;
  presentation: $defs.Presentation;
  publish: $defs.Publish;
  schemaVersion: "2.1";
  shortcuts?: $defs.Shortcuts;
  slides: Array<$defs.Slide>;
  sources?: Array<$defs.Source>;
  theme: $defs.Theme;
}

export const SCHEMA_VERSION = "2.1";
