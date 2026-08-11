// export/pptx/asset-registry.ts
//
// Resolves every manifest asset to an embeddable data URI once, up-front, so
// that the image exporter and preflight can rely on a single deterministic
// lookup keyed by asset id.
//
// Regression (P2-004): an asset that cannot be resolved (dead URL, offline,
// CORS) must NOT turn into a labeled TEXT box ("Image unavailable: …") nor be
// silently dropped. The registry falls back to a bundled real-image placeholder
// raster, so the visual slot is always filled with an actual image element.

import type { DeckProject } from "../../deck/types";
import { embedAsset } from "./pptx-assets";
import { PLACEHOLDER_IMAGE_DATA_URI } from "./pptx-placeholder";

export type AssetResolveStatus = "ready" | "placeholder";

export interface ResolvedAssetEntry {
  assetId: string;
  status: AssetResolveStatus;
  dataUri: string;
  mimeType: string;
  original: string;
  resolved: boolean;
}

export type AssetRegistry = ReadonlyMap<string, ResolvedAssetEntry>;

const DEFAULT_MIME = "image/png";

export async function resolveAllAssets(
  deck: DeckProject,
  cache: Map<string, { dataUri: string; mimeType: string }>
): Promise<AssetRegistry> {
  const registry = new Map<string, ResolvedAssetEntry>();
  for (const asset of deck.assets ?? []) {
    const src = asset.src ?? "";
    if (!src) {
      registry.set(asset.id, {
        assetId: asset.id,
        status: "placeholder",
        dataUri: PLACEHOLDER_IMAGE_DATA_URI,
        mimeType: DEFAULT_MIME,
        original: "",
        resolved: false,
      });
      continue;
    }
    const result = await embedAsset(src, cache);
    if (result.dataUri) {
      registry.set(asset.id, {
        assetId: asset.id,
        status: "ready",
        dataUri: result.dataUri,
        mimeType: result.mimeType || DEFAULT_MIME,
        original: src,
        resolved: true,
      });
    } else {
      registry.set(asset.id, {
        assetId: asset.id,
        status: "placeholder",
        dataUri: PLACEHOLDER_IMAGE_DATA_URI,
        mimeType: DEFAULT_MIME,
        original: src,
        resolved: false,
      });
    }
  }
  return registry;
}
