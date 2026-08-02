import type { Block, DeckAsset, DeckProject, DeckSlide, Frame, ImageBlockContent } from './types';
import { resolveBlockFrame } from './layout';

/**
 * Media and asset pipeline helpers (plan Workstream E).
 *
 * Pure, framework-free functions so they can be unit tested and reused by
 * editor, presenter, and validators alike.
 */

export type AssetStatus = 'ready' | 'failed' | 'placeholder';

export interface ImageIssue {
  severity: 'warning' | 'error';
  code: string;
  message: string;
}

export interface ResolvedImage {
  src?: string;
  status: AssetStatus;
  asset?: DeckAsset;
}

/** Minimal deck shape the asset helpers depend on, for easy testing. */
export type AssetDeck = Pick<DeckProject, 'assets'>;

/** Read the image content of a block, tolerating both new and legacy shapes. */
export function imageContentOf(block: Block): ImageBlockContent {
  const raw = block.content;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ImageBlockContent;
  }
  return { src: typeof raw === 'string' ? raw : undefined };
}

/** Look up an asset manifest entry by id. */
export function resolveAsset(deck: AssetDeck, assetId?: string): DeckAsset | undefined {
  if (!assetId) return undefined;
  return (deck.assets ?? []).find((asset) => asset.id === assetId);
}

/**
 * Resolve the concrete source and status for an image block.
 *
 * - `ready`:      a source exists and the asset manifest says it is valid.
 * - `placeholder`: no source at all — show a designed theme-integrated placeholder.
 * - `failed`:     manifest marks it failed, or the block references a missing asset.
 */
export function resolveImage(deck: AssetDeck, block: Block): ResolvedImage {
  const content = imageContentOf(block);
  const asset = resolveAsset(deck, content.assetId);

  if (asset) {
    if (asset.status === 'failed') return { src: undefined, status: 'failed', asset };
    if (asset.src) return { src: asset.src, status: 'ready', asset };
    return { src: undefined, status: 'placeholder', asset };
  }

  if (content.assetId) {
    // Referenced manifest entry does not exist.
    return { src: undefined, status: 'failed' };
  }

  if (content.src) return { src: content.src, status: 'ready' };
  return { src: undefined, status: 'placeholder' };
}

/** Clamp a focal point to the [0,1] range and default it to center. */
export function clampFocalPoint(focal?: { x?: number; y?: number }): { x: number; y: number } {
  if (!focal || typeof focal.x !== 'number' || typeof focal.y !== 'number') {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: Math.min(1, Math.max(0, focal.x)),
    y: Math.min(1, Math.max(0, focal.y)),
  };
}

/** CSS object-position string for a focal point. */
export function focalPointToCss(focal?: { x?: number; y?: number }): string {
  const point = clampFocalPoint(focal);
  return `${(point.x * 100).toFixed(1)}% ${(point.y * 100).toFixed(1)}%`;
}

/** Aspect ratio (w/h) from an asset's intrinsic dimensions, if known. */
export function aspectRatioOf(asset?: Pick<DeckAsset, 'width' | 'height'>): number | undefined {  if (!asset || !asset.width || !asset.height) return undefined;
  return asset.width / asset.height;
}

/** Frame aspect ratio (w/h). */
export function frameAspectRatio(frame?: Frame): number | undefined {
  if (!frame || !frame.w || !frame.h) return undefined;
  return frame.w / frame.h;
}

/**
 * Validate an image block against the asset contract (plan §9.3/§9.4).
 * Returns issues that prevent the deck from being marked ready.
 */
export function validateImageBlock(deck: DeckProject, slide: DeckSlide, block: Block): ImageIssue[] {
  const issues: ImageIssue[] = [];
  const content = imageContentOf(block);
  const resolved = resolveImage(deck, block);

  if (!content.decorative && !block.decorative && (!block.alt || block.alt.trim().length === 0)) {
    issues.push({
      severity: 'error',
      code: 'missing-alt',
      message: `Image block ${block.id} has no alt text and is not marked decorative.`,
    });
  }

  if (content.assetId && !resolved.asset) {
    issues.push({
      severity: 'error',
      code: 'unknown-asset',
      message: `Image block ${block.id} references missing asset "${content.assetId}".`,
    });
  }

  if (resolved.status === 'failed') {
    issues.push({
      severity: 'error',
      code: 'asset-failed',
      message: `Image block ${block.id} references an asset marked failed.`,
    });
  }

  if (resolved.asset && !resolved.asset.src) {
    issues.push({
      severity: 'error',
      code: 'asset-remote-only',
      message: `Asset "${content.assetId}" has no local source.`,
    });
  }

  if (resolved.asset && !resolved.asset.width && !resolved.asset.height) {
    issues.push({
      severity: 'warning',
      code: 'unknown-dimensions',
      message: `Asset "${content.assetId}" has unknown intrinsic dimensions.`,
    });
  }

  if (content.caption && content.caption.trim().length && content.fit !== 'contain') {
    issues.push({
      severity: 'warning',
      code: 'caption-crop',
      message: `Image block ${block.id} has a caption; consider "contain" fit to avoid cropping the subject.`,
    });
  }

  const assetRatio = aspectRatioOf(resolved.asset);
  const frame = resolveBlockFrame(slide, deck.canvas, block.id);
  const frameRatio = frameAspectRatio(frame);
  if (assetRatio && frameRatio) {
    const mismatch = Math.abs(assetRatio - frameRatio) / Math.max(frameRatio, 1e-6);
    if (mismatch > 0.5) {
      issues.push({
        severity: 'warning',
        code: 'aspect-mismatch',
        message: `Image block ${block.id} aspect ratio ${assetRatio.toFixed(2)} vs slot ${frameRatio.toFixed(2)}; a "cover" crop will cut a large area.`,
      });
    }
  }

  return issues;
}

/** Aggregate image validation issues across a deck. */
export function validateDeckAssets(deck: DeckProject): ImageIssue[] {
  const issues: ImageIssue[] = [];
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.type === 'image') {
        issues.push(...validateImageBlock(deck, slide, block));
      }
    }
  }
  return issues;
}
