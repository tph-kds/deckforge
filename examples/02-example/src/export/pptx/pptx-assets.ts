// export/pptx/pptx-assets.ts

export interface AssetEmbedResult {
  dataUri: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface EmbedOutcome {
  result: AssetEmbedResult;
  error?: string;
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

/**
 * Fetch one URL into an embeddable data URI, caching by URL so each source is
 * resolved at most once per preparation. Unlike the legacy `embedAsset`, this
 * variant also reports WHY a resolution failed so preflight can surface an
 * actionable, block-specific blocking error instead of a generic one.
 */
export async function embedAssetDetailed(
  assetUrl: string,
  cache: Map<string, AssetEmbedResult>
): Promise<EmbedOutcome> {
  if (cache.has(assetUrl)) {
    return { result: cache.get(assetUrl)! };
  }

  if (assetUrl.startsWith("data:")) {
    const result: AssetEmbedResult = {
      dataUri: assetUrl,
      mimeType: assetUrl.split(";")[0].split(":")[1] ?? "image/png",
    };
    cache.set(assetUrl, result);
    return { result };
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
    return { result };
  } catch (err) {
    const error = err instanceof Error ? err.message : "unknown error";
    const empty: AssetEmbedResult = {
      dataUri: "",
      mimeType: "image/png",
    };
    cache.set(assetUrl, empty);
    return { result: empty, error };
  }
}

export async function embedAsset(
  assetUrl: string,
  cache: Map<string, AssetEmbedResult>
): Promise<AssetEmbedResult> {
  return (await embedAssetDetailed(assetUrl, cache)).result;
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
