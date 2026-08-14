// export/prepare-export.ts
//
// THE single asynchronous export-preparation phase.
//
// `prepareExport` is the ONLY place that performs network/asset work. It
// resolves every required visible image source to embeddable data URIs exactly
// once, builds the canonical asset registry (keyed by canonical asset id:
// manifest id or `inline:<blockId>`), and freezes an immutable snapshot of the
// deck. Preflight, fidelity accounting, and the PPTX exporter all consume the
// resulting `PreparedExport` and must never re-resolve or reinterpret assets.
//
// Contract:
//   - Preflight operates on the PREPARED snapshots + registry, so "Ready to
//     export" can never be printed while an unresolved required image exists.
//   - The exporter consumes the registry, so it can never fail mid-export on a
//     URL that preflight said was fine.
//   - Each required source is fetched at most once per preparation.
//
// Type-safety note: `deck.assets` is technically optional on DeckProject, but
// every deck produced by this app carries a manifest array; we coerce to a
// stable array so registry lookups never see "undefined assets".

import type { DeckProject } from "../deck/types";
import type { PptxExportConfig } from "./export-types";
import { canonicalAssetRef } from "../deck/assets";
import { resolveSlideSnapshot, type ImmutableSlideSnapshot } from "./snapshot";
import { embedAssetDetailed, type AssetEmbedResult } from "./pptx/pptx-assets";

export type PreparedAssetStatus = "ready" | "failed";

/** One entry in the canonical, pre-resolved asset registry. */
export interface PreparedAsset {
  /** Canonical registry key (manifest id or `inline:<blockId>`). */
  assetId: string;
  /** The image block that first required this asset. */
  blockId?: string;
  /** The concrete source URL (or data URI) the asset was resolved from. */
  originalSrc: string;
  /** The embeddable data URI; empty when resolution failed. */
  resolvedDataUri: string;
  mimeType: string;
  width?: number;
  height?: number;
  status: PreparedAssetStatus;
  /** Why resolution failed (network error, HTTP status, CORS, orphan, …). */
  error?: string;
}

/** The frozen result of the single preparation phase. */
export interface PreparedExport {
  deck: DeckProject;
  config: PptxExportConfig;
  /** Canonical asset registry consumed by preflight + exporters. */
  assets: ReadonlyMap<string, PreparedAsset>;
  /** Immutable snapshots for every slide selected by the config. */
  slides: ImmutableSlideSnapshot[];
}

/** Type guard discriminating a `PreparedExport` from a raw `DeckProject`. */
export function isPreparedExport(value: unknown): value is PreparedExport {
  return (
    !!value &&
    typeof value === "object" &&
    "config" in value &&
    "assets" in value &&
    !Array.isArray((value as { assets?: unknown }).assets)
  );
}

interface RequiredAsset {
  assetId: string;
  blockId: string;
  src?: string;
  orphan?: boolean;
}

/**
 * Collect every required, visible image source. Manifest-backed blocks use
 * their asset id as the canonical key; legacy inline `content.src`/`block.src`
 * sources get a deterministic synthetic key. Placeholder blocks (no source)
 * are intentionally not collected — they are rendered as a designed
 * placeholder and never count against fidelity.
 */
function collectRequiredAssets(deck: DeckProject, includeHiddenSlides: boolean): RequiredAsset[] {
  const required = new Map<string, RequiredAsset>();
  for (const slide of deck.slides) {
    if (!includeHiddenSlides && slide.hidden) continue;
    for (const block of slide.blocks) {
      if (block.hidden || block.type !== "image") continue;
      const ref = canonicalAssetRef(deck, block);
      if (!ref) continue;
      if (!required.has(ref.assetId)) {
        required.set(ref.assetId, {
          assetId: ref.assetId,
          blockId: block.id,
          src: ref.src,
          orphan: ref.orphan,
        });
      }
    }
  }
  return [...required.values()];
}

async function buildAssetRegistry(
  deck: DeckProject,
  config: PptxExportConfig,
): Promise<PreparedAsset[]> {
  const cache = new Map<string, AssetEmbedResult>();
  const entries: PreparedAsset[] = [];

  for (const req of collectRequiredAssets(deck, config.includeHiddenSlides)) {
    const manifestAsset = !req.assetId.startsWith("inline:")
      ? (deck.assets ?? []).find((asset) => asset.id === req.assetId)
      : undefined;

    if (req.orphan) {
      entries.push({
        assetId: req.assetId,
        blockId: req.blockId,
        originalSrc: "",
        resolvedDataUri: "",
        mimeType: manifestAsset?.mimeType ?? "image/png",
        status: "failed",
        error: `Image block "${req.blockId}" references asset "${req.assetId}" which has no manifest entry`,
      });
      continue;
    }

    const src = req.src ?? "";
    if (!src) {
      entries.push({
        assetId: req.assetId,
        blockId: req.blockId,
        originalSrc: "",
        resolvedDataUri: "",
        mimeType: manifestAsset?.mimeType ?? "image/png",
        status: "failed",
        error: `Image block "${req.blockId}" has no resolvable source`,
      });
      continue;
    }

    const { result, error } = await embedAssetDetailed(src, cache);
    entries.push({
      assetId: req.assetId,
      blockId: req.blockId,
      originalSrc: src,
      resolvedDataUri: result.dataUri,
      mimeType: result.mimeType || manifestAsset?.mimeType || "image/png",
      width: manifestAsset?.width,
      height: manifestAsset?.height,
      status: result.dataUri ? "ready" : "failed",
      error: result.dataUri
        ? undefined
        : `Image "${src}" (block "${req.blockId}") could not be fetched (${error ?? "network error, 404, CORS, or timeout"})`,
    });
  }

  return entries;
}

/**
 * Prepare a deck for export. This is the ONE place assets are resolved; every
 * downstream consumer (preflight, fidelity, PPTX exporter) must be handed the
 * returned `PreparedExport` and must not perform its own resolution.
 */
export async function prepareExport(
  deck: DeckProject,
  config: PptxExportConfig,
): Promise<PreparedExport> {
  const assetEntries = await buildAssetRegistry(deck, config);
  const assets = new Map<string, PreparedAsset>();
  for (const entry of assetEntries) assets.set(entry.assetId, entry);

  const slides = deck.slides
    .filter((slide) => config.includeHiddenSlides || !slide.hidden)
    .map((slide) => resolveSlideSnapshot(slide, deck, assets));

  return { deck, config, assets, slides };
}