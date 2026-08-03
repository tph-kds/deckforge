# Task 12: Block Export Registry

**Files:**
- Create: `starter-components/export/pptx/block-exporters/index.ts`

**Interfaces:**
- Consumes: all block exporters from Tasks 6-11
- Produces: BlockExportRegistry lookup

## Steps

- [ ] **Step 1: Create block export registry**

```typescript
// starter-components/export/pptx/block-exporters/index.ts

import type { PptxBlockExporter } from "../../export-types";
import { textBlockExporter } from "./text";
import { imageBlockExporter } from "./image";
import { shapeBlockExporter } from "./shape";
import { tableBlockExporter } from "./table";
import { chartBlockExporter } from "./chart";
import { diagramBlockExporter } from "./diagram";
import { fallbackBlockExporter } from "./fallback";

export const blockExporters: PptxBlockExporter[] = [
  textBlockExporter,
  imageBlockExporter,
  shapeBlockExporter,
  tableBlockExporter,
  chartBlockExporter,
  diagramBlockExporter,
  fallbackBlockExporter,
];

export function getBlockExporter(type: string): PptxBlockExporter {
  return blockExporters.find((e) => e.type === type) ?? fallbackBlockExporter;
}

export function getExportability(type: string): string {
  return getBlockExporter(type).exportability;
}
```

- [ ] **Step 2: Commit**

```bash
git add starter-components/export/pptx/block-exporters/index.ts
git commit -m "feat: add block export registry for PPTX"
```
