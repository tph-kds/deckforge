# Task 5: Asset Embedding

**Files:**
- Create: `starter-components/export/pptx/pptx-assets.ts`

**Interfaces:**
- Consumes: asset references from DeckProject
- Produces: base64 data URIs for PPTX embedding

## Steps

- [ ] **Step 1: Create pptx-assets.ts**

```typescript
// starter-components/export/pptx/pptx-assets.ts

export interface AssetEmbedResult {
  dataUri: string;
  width?: number;
  height?: number;
  mimeType: string;
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
    const response = await fetch(assetUrl);
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
    return {
      dataUri: "",
      mimeType: "image/png",
    };
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
```

- [ ] **Step 2: Commit**

```bash
git add starter-components/export/pptx/pptx-assets.ts
git commit -m "feat: add asset embedding with caching for PPTX export"
```
