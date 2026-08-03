# Task 11: Diagram and Fallback Block Exporters

**Files:**
- Create: `starter-components/export/pptx/block-exporters/diagram.ts`
- Create: `starter-components/export/pptx/block-exporters/fallback.ts`

**Interfaces:**
- Consumes: diagram/unknown block, PptxExportContext
- Produces: PptxSlideElement (image fallback)

## Steps

- [ ] **Step 1: Create diagram.ts**

```typescript
// starter-components/export/pptx/block-exporters/diagram.ts

import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

interface DiagramBlock {
  id: string;
  type: "diagram";
  nodes?: Array<{ id: string; label: string }>;
  edges?: Array<{ from: string; to: string }>;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const diagramBlockExporter: PptxBlockExporter = {
  type: "diagram",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const diagramBlock = block as DiagramBlock;

    const nodeCount = diagramBlock.nodes?.length ?? 0;
    const edgeCount = diagramBlock.edges?.length ?? 0;
    const summary = `Diagram: ${nodeCount} nodes, ${edgeCount} edges`;

    return {
      type: "fallback",
      x: diagramBlock.x ?? 0,
      y: diagramBlock.y ?? 0,
      w: diagramBlock.w ?? ctx.slideWidth * 0.6,
      h: diagramBlock.h ?? ctx.slideHeight * 0.4,
      data: {
        text: summary,
        options: {
          fill: { color: "F0F0F0" },
          line: { color: "CCCCCC", width: 1 },
        },
      },
    };
  },
};
```

- [ ] **Step 2: Create fallback.ts**

```typescript
// starter-components/export/pptx/block-exporters/fallback.ts

import type { PptxBlockExporter, PptxExportContext, PptxSlideElement } from "../../export-types";

export const fallbackBlockExporter: PptxBlockExporter = {
  type: "fallback",
  exportability: "image-only",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement> {
    const anyBlock = block as Record<string, unknown>;
    const blockType = (anyBlock.type as string) ?? "unknown";

    return {
      type: "fallback",
      x: (anyBlock.x as number) ?? 0,
      y: (anyBlock.y as number) ?? 0,
      w: (anyBlock.w as number) ?? ctx.slideWidth * 0.5,
      h: (anyBlock.h as number) ?? ctx.slideHeight * 0.3,
      data: {
        text: `[${blockType} block - requires web rendering]`,
        options: {
          fill: { color: "FFF3CD" },
          line: { color: "FFC107", width: 1 },
        },
      },
    };
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add starter-components/export/pptx/block-exporters/diagram.ts starter-components/export/pptx/block-exporters/fallback.ts
git commit -m "feat: add diagram and fallback block exporters for PPTX"
```
