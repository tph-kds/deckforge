# Task 2: PptxGenJS Adapter Core

**Files:**
- Create: `starter-components/export/pptx/pptx-exporter.ts`
- Create: `starter-components/export/pptx/pptx-context.ts`

**Interfaces:**
- Consumes: PptxExportConfig, PptxExportContext from Task 1
- Produces: PptxExporter.export() method signature

## Steps

- [ ] **Step 1: Create pptx-context.ts**

```typescript
// starter-components/export/pptx/pptx-context.ts

import type { PptxExportConfig, FontWarning } from "../export-types";

export interface PptxExportContextData {
  deck: import("../../types/deck-types").DeckProject;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, string>;
  slideWidth: number;
  slideHeight: number;
}

export function createExportContext(
  deck: import("../../types/deck-types").DeckProject,
  config: PptxExportConfig
): PptxExportContextData {
  const canvas = deck.canvas ?? { width: 13.333, height: 7.5 };
  return {
    deck,
    config,
    fontWarnings: [],
    assetCache: new Map(),
    slideWidth: canvas.width ?? 13.333,
    slideHeight: canvas.height ?? 7.5,
  };
}
```

- [ ] **Step 2: Create pptx-exporter.ts with adapter skeleton**

```typescript
// starter-components/export/pptx/pptx-exporter.ts

import type { PptxExportConfig } from "../export-types";
import { createExportContext, type PptxExportContextData } from "./pptx-context";

export class PptxExporter {
  private config: PptxExportConfig;

  constructor(config: PptxExportConfig) {
    this.config = config;
  }

  async export(deck: import("../../types/deck-types").DeckProject): Promise<Blob> {
    const ctx = createExportContext(deck, this.config);

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    pptx.defineLayout({ name: "CUSTOM", width: ctx.slideWidth, height: ctx.slideHeight });
    pptx.layout = "CUSTOM";

    const slides = deck.slides ?? [];
    for (const slide of slides) {
      if (!this.config.includeHiddenSlides && slide.hidden) continue;
      const pptxSlide = pptx.addSlide();
      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }
    }

    const buffer = await pptx.write({ outputType: "arraybuffer" });
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add starter-components/export/pptx/pptx-exporter.ts starter-components/export/pptx/pptx-context.ts
git commit -m "feat: add PptxGenJS adapter core with export skeleton"
```
