# Task 7: Image Block Exporter

**Files:**
- Create: `starter-components/export/pptx/block-exporters/image.ts`

**Interfaces:**
- Consumes: image block, PptxExportContext
- Produces: PptxSlideElement

## Steps

- [ ] **Step 1: Create image.ts**

```typescript
// starter-components/export/pptx/block-exporters/image.ts

import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";
import { embedAsset } from "../pptx-assets";

interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const imageBlockExporter: PptxBlockExporter = {
  type: "image",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const imageBlock = block as ImageBlock;
    const assetResult = await embedAsset(imageBlock.src, ctx.assetCache);

    return {
      type: "image",
      x: imageBlock.x ?? 0,
      y: imageBlock.y ?? 0,
      w: imageBlock.w ?? ctx.slideWidth * 0.5,
      h: imageBlock.h ?? ctx.slideHeight * 0.5,
      data: {
        dataUri: assetResult.dataUri,
        alt: imageBlock.alt ?? "",
        options: {
          sizing: { type: "contain", w: imageBlock.w ?? 5, h: imageBlock.h ?? 3 },
        },
      },
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add starter-components/export/pptx/block-exporters/image.ts
git commit -m "feat: add image block exporter for PPTX"
```
