// export/self-contained.ts
//
// "Make deck self-contained": rewrite every required visible image source into
// an embeddable data URI so the deck exports with zero network. Pure logic with
// an injectable embedder (defaults to the real fetch-based one) so unit tests
// run deterministically offline.
//
// Contract:
//   - Manifest-backed assets are rewritten in place (id, width, height kept).
//   - Inline-only image blocks (canonical `inline:<blockId>` refs) are
//     normalized into a NEW manifest asset so every image lives in deck.assets
//     afterwards, consistent with the `updateImageSource` command.
//   - data: URIs pass through untouched.
//   - A failed fetch is recorded (blockId + error) and the original source is
//     kept, so preflight still blocks with the block-specific message. Never
//     throws.

import type { DeckProject, DeckSlide, Block } from "../deck/types";
import { canonicalAssetRef, imageContentOf } from "../deck/assets";
import { newId } from "../deck/seed";
import { embedAssetDetailed, type AssetEmbedResult, type EmbedOutcome } from "./pptx/pptx-assets";

export type EmbedFn = (
  assetUrl: string,
  cache: Map<string, AssetEmbedResult>,
) => Promise<EmbedOutcome>;

export interface SelfContainedFailure {
  blockId: string;
  assetId?: string;
  error: string;
}

export interface SelfContainedResult {
  deck: DeckProject;
  embedded: number;
  failures: SelfContainedFailure[];
}

export async function makeDeckSelfContained(
  deck: DeckProject,
  embed: EmbedFn = embedAssetDetailed,
): Promise<SelfContainedResult> {
  const cache = new Map<string, AssetEmbedResult>();
  const failures: SelfContainedFailure[] = [];
  let embedded = 0;

  // Pass 1: rewrite remote manifest entries in place (id/dimensions preserved).
  const assets = (deck.assets ?? []).map((asset) => ({ ...asset }));
  for (const asset of assets) {
    if (!asset.src || asset.src.startsWith("data:")) continue;
    const { result, error } = await embed(asset.src, cache);
    if (result.dataUri) {
      embedded += 1;
      asset.src = result.dataUri;
      if (result.mimeType) asset.mimeType = result.mimeType;
    } else {
      failures.push({
        blockId: firstImageBlockIdFor(deck, asset.id),
        assetId: asset.id,
        error: error ?? "fetch failed",
      });
    }
  }

  // Pass 2: normalize inline-only remote image blocks into the manifest.
  const slides: DeckSlide[] = [];
  for (const slide of deck.slides) {
    let blocks: Block[] = slide.blocks;
    for (const block of blocks) {
      if (block.hidden || block.type !== "image") continue;
      const ref = canonicalAssetRef(deck, block);
      if (!ref || !ref.assetId.startsWith("inline:")) continue;
      const src = ref.src;
      if (!src || src.startsWith("data:")) continue;
      const { result, error } = await embed(src, cache);
      if (!result.dataUri) {
        failures.push({ blockId: block.id, error: error ?? "fetch failed" });
        continue;
      }
      const assetId = newId("asset");
      assets.push({ id: assetId, kind: "image", src: result.dataUri, mimeType: result.mimeType });
      embedded += 1;
      const content = imageContentOf(block);
      blocks = blocks.map((b) =>
        b.id === block.id ? { ...b, content: { ...content, src: undefined, assetId } } : b,
      );
    }
    slides.push({ ...slide, blocks });
  }

  return { deck: { ...deck, assets, slides }, embedded, failures };
}

/** First visible image block bound to the given manifest asset, for failure reporting. */
function firstImageBlockIdFor(deck: DeckProject, assetId: string): string {
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.hidden || block.type !== "image") continue;
      if (canonicalAssetRef(deck, block)?.assetId === assetId) return block.id;
    }
  }
  return "";
}
