// export/pptx/pptx-assets.ts

export interface AssetEmbedResult {
  dataUri: string;
  width?: number;
  height?: number;
  mimeType: string;
}

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function embedAsset(
  assetUrl: string,
  cache: Map<string, AssetEmbedResult>
): Promise<AssetEmbedResult> {
  if (cache.has(assetUrl)) {
    return cache.get(assetUrl)!;
  }

  if (assetUrl.startsWith("data:")) {
    const result: AssetEmbedResult = {
      dataUri: assetUrl,
      mimeType: assetUrl.split(";")[0].split(":")[1] ?? "image/png",
    };
    cache.set(assetUrl, result);
    return result;
  }

  try {
    const response = await fetchWithTimeout(assetUrl, FETCH_TIMEOUT_MS);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type || "image/png";

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUri = `data:${mimeType};base64,${base64}`;

    const result: AssetEmbedResult = { dataUri, mimeType };
    cache.set(assetUrl, result);
    return result;
  } catch {
    const empty: AssetEmbedResult = {
      dataUri: "",
      mimeType: "image/png",
    };
    cache.set(assetUrl, empty);
    return empty;
  }
}

export function embedAssetSync(
  assetUrl: string,
  cache: Map<string, AssetEmbedResult>
): AssetEmbedResult | null {
  if (cache.has(assetUrl)) {
    return cache.get(assetUrl)!;
  }
  return null;
}

/**
 * Pre-resolve all remote assets before export.
 * This prevents CORS issues and placeholder substitutions.
 * Returns a map of URL → AssetEmbedResult.
 * Throws if any asset fails to resolve.
 */
export async function resolveAllAssets(
  deck: { assets?: Array<{ id: string; src: string; kind?: string }> }
): Promise<Map<string, AssetEmbedResult>> {
  const cache = new Map<string, AssetEmbedResult>();
  const remoteAssets = (deck.assets ?? []).filter(
    (asset) => asset.src && !asset.src.startsWith("data:") && asset.kind !== "video"
  );

  const results = await Promise.allSettled(
    remoteAssets.map(async (asset) => {
      const result = await embedAsset(asset.src, cache);
      if (!result.dataUri) {
        throw new Error(`Failed to resolve asset "${asset.id}" (${asset.src})`);
      }
      return { url: asset.src, result };
    })
  );

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected"
  );

  if (failures.length > 0) {
    const messages = failures.map((f) => f.reason?.message ?? "unknown error").join("; ");
    throw new Error(`Asset resolution failed: ${messages}`);
  }

  return cache;
}
