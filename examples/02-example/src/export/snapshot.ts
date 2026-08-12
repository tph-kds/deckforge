// export/snapshot.ts
//
// THE single source of truth for the immutable export snapshot.
// This module defines the canonical snapshot types and the resolver that
// creates an immutable representation of the slide at export time.
//
// Architecture:
//   DeckProject
//       ↓
//   Canonical SlideDocument
//       ↓
//   resolveSlideSnapshot()
//       ↓
//   ImmutableSlideSnapshot
//       │
//       ├── Web Renderer
//       ├── Present Renderer
//       └── PPTX Exporter
//
// The Web Renderer and PPTX Exporter MUST NOT independently invent:
//   - geometry
//   - colors
//   - font choices
//   - default chart data
//   - fallback text
//   - default styling
//   - missing objects
//   - additional objects

import type {
  Block,
  ChartContent,
  ChartValue,
  DeckProject,
  DeckSlide,
  ThemeDef,
  ThemeTokens,
} from "../deck/types";
import { getTheme } from "../deck/themes";
import { resolveSlideGeometry, type ResolvedBlockGeometry } from "../deck/geometry-resolver";

// ─── Canonical Style Types ───────────────────────────────────────────────────

export interface ResolvedTextStyle {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  color: string;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  opacity: number;
}

export interface ResolvedPaint {
  type: "solid" | "gradient";
  color?: string;
  gradient?: string;
}

export interface ResolvedChartStyle {
  seriesColors: string[];
  axisColor: string;
  gridColor: string;
  labelColor: string;
  fontFamily: string;
  fontSize: number;
  background: string;
  highlightColor: string;
}

// ─── Canonical Block Snapshot ────────────────────────────────────────────────

export interface ResolvedBlockSnapshot {
  id: string;
  type: string;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  zIndex: number;
  visibility: "visible" | "hidden";
  content: unknown;
  style: ResolvedTextStyle;
  chartSpec?: ResolvedChartSpec;
  assetSnapshot?: ResolvedAssetSnapshot;
  editorOnly: boolean;
  deleted: boolean;
  temporary: boolean;
  placeholder: boolean;
}

// ─── Canonical Chart Spec ────────────────────────────────────────────────────

export interface ResolvedChartSpec {
  type: "bar" | "bar-horizontal" | "line";
  orientation: "horizontal" | "vertical";
  title: string;
  unit: string;
  categories: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  highlightIndex?: number;
  summary: string;
  style: ResolvedChartStyle;
}

// ─── Canonical Asset Snapshot ────────────────────────────────────────────────

export interface ResolvedAssetSnapshot {
  assetId: string;
  resolvedSrc: string;
  mimeType: string;
  width: number;
  height: number;
  alt: string;
  fit: "cover" | "contain";
  focalPoint: { x: number; y: number };
  caption?: string;
  attribution?: string;
}

// ─── Canonical Theme Snapshot ────────────────────────────────────────────────

export interface ResolvedThemeSnapshot {
  id: string;
  tokens: ThemeTokens;
  typography: {
    headingFont: string;
    bodyFont: string;
    codeFont: string;
  };
  chartPalette: string[];
  gradients: Record<string, string>;
}

// ─── Canonical Slide Snapshot ────────────────────────────────────────────────

export interface ImmutableSlideSnapshot {
  slideId: string;
  title: string;
  width: number;
  height: number;
  background: ResolvedPaint;
  blocks: ResolvedBlockSnapshot[];
  theme: ResolvedThemeSnapshot;
  assets: ResolvedAssetSnapshot[];
  notes?: string;
  layout: string;
  layoutBindings: Array<{
    slot: string;
    blockIds: string[];
    flow?: "stack" | "row" | "grid" | "overlay";
    gap?: number;
  }>;
}

// ─── Style Resolution Helpers ────────────────────────────────────────────────

function normalizeColor(color: string): string {
  if (!color) return "#000000";
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    return `#${hex.slice(0, 6)}`;
  }
  if (color.startsWith("rgb")) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
      const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
      const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  return color;
}

function resolveBlockTextStyle(
  block: Block,
  theme: ThemeDef,
  containerWidth: number
): ResolvedTextStyle {
  const style = block.style ?? {};
  const variant = typeof style.variant === "string" ? style.variant : "";
  const level = typeof style.level === "number" ? style.level : 3;

  let fontFamily = theme.typography.bodyFont;
  let fontSizePx = 16;
  let fontWeight = 400;
  let fontStyle: "normal" | "italic" = "normal";
  let lineHeight = 1.5;
  let letterSpacing = 0;
  let align: "left" | "center" | "right" = "left";
  let verticalAlign: "top" | "middle" | "bottom" = "top";
  let opacity = 1;

  // Resolve font family
  if (block.type === "heading" || level === 1 || level === 3) {
    fontFamily = theme.typography.headingFont;
  }

  // Resolve typography based on block type and variant
  switch (block.type) {
    case "heading":
      if (level === 1) {
        fontSizePx = Math.min(52, Math.max(34, containerWidth * 0.042));
        lineHeight = 1.05;
        letterSpacing = -0.02;
      } else if (level === 3) {
        fontSizePx = 24;
        lineHeight = 1.25;
      }
      break;
    case "metric":
      fontSizePx = Math.min(128, Math.max(64, containerWidth * 0.09));
      lineHeight = 1.0;
      fontWeight = 700;
      verticalAlign = "middle";
      break;
    case "callout":
      fontSizePx = Math.min(19, Math.max(14, containerWidth * 0.017));
      fontStyle = "italic";
      break;
    case "citation":
      fontSizePx = Math.min(13, Math.max(10, containerWidth * 0.012));
      fontStyle = "italic";
      break;
    case "process":
      fontSizePx = Math.min(18, Math.max(13, containerWidth * 0.016));
      fontWeight = 600;
      break;
    default:
      if (variant === "kicker") {
        fontSizePx = 12;
        fontWeight = 600;
        letterSpacing = 0.14;
      } else if (variant === "meta") {
        fontSizePx = 13;
        opacity = 0.75;
      } else if (variant === "caption") {
        fontSizePx = 13;
        fontWeight = 600;
      }
      break;
  }

  return {
    fontFamily,
    fontSizePx,
    fontWeight,
    fontStyle,
    color: normalizeColor(theme.tokens.foreground),
    lineHeight,
    letterSpacing,
    align,
    verticalAlign,
    opacity,
  };
}

function resolveChartStyle(theme: ThemeDef): ResolvedChartStyle {
  return {
    seriesColors: theme.chartPalette.map(normalizeColor),
    axisColor: normalizeColor(theme.tokens.border),
    gridColor: normalizeColor(theme.tokens.border),
    labelColor: normalizeColor(theme.tokens.muted),
    fontFamily: theme.typography.bodyFont,
    fontSize: 10,
    background: "transparent",
    highlightColor: normalizeColor(theme.tokens.secondary),
  };
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

/**
 * Resolve a slide into an immutable snapshot.
 * This is the single source of truth for all renderers.
 */
export function resolveSlideSnapshot(
  slide: DeckSlide,
  deck: DeckProject
): ImmutableSlideSnapshot {
  const theme = getTheme(deck.theme?.id ?? "editorial-cream");
  const canvas = deck.canvas ?? { width: 1600, height: 900 };
  const width = canvas.width ?? 1600;
  const height = canvas.height ?? 900;

  // Resolve geometry for all blocks
  const geometryScene = resolveSlideGeometry(slide, canvas);
  const frameByBlockId = geometryScene.frameByBlockId;

  // Build block snapshots
  const blocks: ResolvedBlockSnapshot[] = [];
  let zIndex = 0;

  for (const block of slide.blocks) {
    // Skip hidden/deleted blocks
    if (block.hidden) continue;

    // Get resolved frame
    const resolvedFrame = frameByBlockId.get(block.id);
    if (!resolvedFrame) continue;

    // Resolve style
    const containerWidth = resolvedFrame.w;
    const style = resolveBlockTextStyle(block, theme, containerWidth);

    // Resolve chart spec if applicable
    let chartSpec: ResolvedChartSpec | undefined;
    if (block.type === "chart") {
      const content = block.content as ChartContent | undefined;
      if (content && !content.isTemplate && Array.isArray(content.values) && content.values.length > 0) {
        chartSpec = {
          type: content.type ?? "bar",
          orientation: content.type === "bar-horizontal" ? "horizontal" : "vertical",
          title: content.title ?? "",
          unit: content.unit ?? "",
          categories: content.values.map((v: ChartValue) => v.label),
          series: [
            {
              name: content.title ?? "Data",
              values: content.values.map((v: ChartValue) => v.value),
            },
          ],
          highlightIndex: content.highlightIndex,
          summary: content.summary ?? "",
          style: resolveChartStyle(theme),
        };
      }
    }

    // Resolve asset snapshot if applicable
    let assetSnapshot: ResolvedAssetSnapshot | undefined;
    if (block.type === "image") {
      const content = block.content as { assetId?: string; fit?: string; focalPoint?: { x: number; y: number }; caption?: string; attribution?: string } | undefined;
      if (content?.assetId) {
        const asset = (deck.assets ?? []).find((a) => a.id === content.assetId);
        if (asset && asset.status !== "failed") {
          assetSnapshot = {
            assetId: asset.id,
            resolvedSrc: asset.src,
            mimeType: asset.mimeType ?? "image/jpeg",
            width: asset.width ?? 720,
            height: asset.height ?? 480,
            alt: asset.alt ?? block.alt ?? "",
            fit: (content.fit as "cover" | "contain") ?? "cover",
            focalPoint: content.focalPoint ?? asset.focalPoint ?? { x: 0.5, y: 0.5 },
            caption: content.caption,
            attribution: content.attribution ?? asset.credit,
          };
        }
      }
    }

    blocks.push({
      id: block.id,
      type: block.type,
      frame: {
        x: resolvedFrame.x,
        y: resolvedFrame.y,
        w: resolvedFrame.w,
        h: resolvedFrame.h,
      },
      zIndex: zIndex++,
      visibility: "visible",
      content: block.content,
      style,
      chartSpec,
      assetSnapshot,
      editorOnly: false,
      deleted: false,
      temporary: false,
      placeholder: false,
    });
  }

  // Resolve theme snapshot
  const themeSnapshot: ResolvedThemeSnapshot = {
    id: theme.id,
    tokens: { ...theme.tokens },
    typography: { ...theme.typography },
    chartPalette: [...theme.chartPalette],
    gradients: { ...(theme.gradients ?? {}) },
  };

  // Resolve asset snapshots
  const assets: ResolvedAssetSnapshot[] = (deck.assets ?? [])
    .filter((asset) => asset.status !== "failed")
    .map((asset) => ({
      assetId: asset.id,
      resolvedSrc: asset.src,
      mimeType: asset.mimeType ?? "image/jpeg",
      width: asset.width ?? 720,
      height: asset.height ?? 480,
      alt: asset.alt ?? "",
      fit: "cover" as const,
      focalPoint: asset.focalPoint ?? { x: 0.5, y: 0.5 },
    }));

  return {
    slideId: slide.id,
    title: slide.title,
    width,
    height,
    background: {
      type: "solid",
      color: normalizeColor(theme.tokens.background),
    },
    blocks,
    theme: themeSnapshot,
    assets,
    notes: slide.speakerNotes,
    layout: slide.layout,
    layoutBindings: slide.layoutBindings ?? [],
  };
}

/**
 * Create immutable snapshots for all slides in a deck.
 * This is called once at export time and provides the snapshot for all renderers.
 */
export function createDeckSnapshot(deck: DeckProject): ImmutableSlideSnapshot[] {
  return deck.slides.map((slide) => resolveSlideSnapshot(slide, deck));
}

/**
 * Validate that a snapshot contains no hidden/stale/template blocks.
 */
export function validateSnapshot(snapshot: ImmutableSlideSnapshot): string[] {
  const issues: string[] = [];

  for (const block of snapshot.blocks) {
    if (block.visibility === "hidden") {
      issues.push(`Block ${block.id} is hidden but included in snapshot`);
    }
    if (block.editorOnly) {
      issues.push(`Block ${block.id} is editor-only but included in snapshot`);
    }
    if (block.deleted) {
      issues.push(`Block ${block.id} is deleted but included in snapshot`);
    }
    if (block.temporary) {
      issues.push(`Block ${block.id} is temporary but included in snapshot`);
    }
    if (block.placeholder) {
      issues.push(`Block ${block.id} is placeholder but included in snapshot`);
    }

    // Validate chart blocks have required data
    if (block.type === "chart") {
      if (!block.chartSpec) {
        issues.push(`Chart block ${block.id} has no resolved chart spec`);
      } else if (block.chartSpec.categories.length === 0) {
        issues.push(`Chart block ${block.id} has no categories`);
      }
    }

    // Validate image blocks have resolved assets
    if (block.type === "image") {
      if (!block.assetSnapshot) {
        issues.push(`Image block ${block.id} has no resolved asset`);
      }
    }
  }

  return issues;
}

/**
 * Compute a semantic content fingerprint for a snapshot.
 * Used for parity validation between web and export.
 */
export function hashSlideSemanticContent(snapshot: ImmutableSlideSnapshot): string {
  const parts: string[] = [];

  // Add slide ID and title
  parts.push(`slide:${snapshot.slideId}`);
  parts.push(`title:${snapshot.title}`);

  // Add visible blocks in order
  for (const block of snapshot.blocks) {
    if (block.visibility !== "visible") continue;

    parts.push(`block:${block.id}:${block.type}`);

    // Add text content
    if (typeof block.content === "string") {
      parts.push(`text:${block.content}`);
    } else if (Array.isArray(block.content)) {
      parts.push(`list:${block.content.join("|")}`);
    } else if (block.content && typeof block.content === "object") {
      const content = block.content as Record<string, unknown>;
      if (content.title) parts.push(`title:${content.title}`);
      if (content.value) parts.push(`value:${content.value}`);
      if (content.label) parts.push(`label:${content.label}`);
      if (Array.isArray(content.values)) {
        const values = content.values as Array<{ label: string; value: number }>;
        parts.push(`values:${values.map((v) => `${v.label}:${v.value}`).join("|")}`);
      }
    }

    // Add chart spec if present
    if (block.chartSpec) {
      parts.push(`chart:${block.chartSpec.type}`);
      parts.push(`categories:${block.chartSpec.categories.join("|")}`);
      parts.push(`series:${block.chartSpec.series.map((s) => s.values.join(",")).join("|")}`);
    }

    // Add asset if present
    if (block.assetSnapshot) {
      parts.push(`asset:${block.assetSnapshot.assetId}`);
    }
  }

  return parts.join("::");
}
