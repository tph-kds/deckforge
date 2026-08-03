# Task 13: PPTX Fallback Renderer

**Files:**
- Create: `starter-components/export/pptx/pptx-fallback-renderer.ts`

**Interfaces:**
- Consumes: blocks with non-native exportability, PptxExportContext
- Produces: image-based fallback elements

## Steps

- [ ] **Step 1: Create pptx-fallback-renderer.ts**

```typescript
// starter-components/export/pptx/pptx-fallback-renderer.ts

import type { PptxExportContext, PptxSlideElement } from "../export-types";

export async function renderFallback(
  block: Record<string, unknown>,
  ctx: PptxExportContext,
  reason: string
): Promise<PptxSlideElement> {
  const blockType = (block.type as string) ?? "unknown";

  return {
    type: "fallback",
    x: (block.x as number) ?? 0,
    y: (block.y as number) ?? 0,
    w: (block.w as number) ?? ctx.slideWidth * 0.5,
    h: (block.h as number) ?? ctx.slideHeight * 0.3,
    data: {
      text: `[${blockType}: ${reason}]`,
      options: {
        fill: { color: "FFF3CD" },
        line: { color: "FFC107", width: 1 },
        fontSize: 12,
        color: "856404",
      },
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add starter-components/export/pptx/pptx-fallback-renderer.ts
git commit -m "feat: add PPTX fallback renderer for hybrid mode"
```
