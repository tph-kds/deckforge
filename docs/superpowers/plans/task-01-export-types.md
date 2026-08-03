# Task 1: Export Types Foundation

**Files:**
- Create: `starter-components/export/export-types.ts`
- Modify: `starter-components/types/deck-types.ts`

**Interfaces:**
- Consumes: existing DeckProject, DeckBlock types from deck-types.ts
- Produces: ExportPreflightResult, ExportIssue, PptxExportConfig, PptxExportContext, PptxBlockExporter

## Steps

- [ ] **Step 1: Create export-types.ts with core contracts**

```typescript
// starter-components/export/export-types.ts

export type ExportIssueSeverity = "info" | "warning" | "error";

export type PptxExportability =
  | "native-editable"
  | "native-with-reduction"
  | "hybrid-rasterized"
  | "image-only"
  | "poster-with-link"
  | "unsupported";

export interface ExportIssue {
  severity: ExportIssueSeverity;
  code: string;
  slideId?: string;
  blockId?: string;
  message: string;
  suggestedFix?: string;
  automaticFixAvailable: boolean;
}

export interface ExportPreflightResult {
  issues: ExportIssue[];
  score: number;
  blockCoverage: number;
}

export interface PptxExportConfig {
  mode: "hybrid";
  includeSpeakerNotes: boolean;
  includeHiddenSlides: boolean;
  compatibilityTargets: string[];
  fontPolicy: "warn-and-substitute" | "embed-when-licensed";
  filenameTemplate: string;
}

export interface FontWarning {
  fontFamily: string;
  slideId?: string;
  blockId?: string;
  substituteFont?: string;
}

export interface PptxSlideElement {
  type: "text" | "image" | "shape" | "table" | "chart" | "fallback";
  x: number;
  y: number;
  w: number;
  h: number;
  data: unknown;
}

export interface PptxExportContext {
  pptx: unknown;
  deck: unknown;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, string>;
  slideWidth: number;
  slideHeight: number;
}

export interface PptxBlockExporter {
  type: string;
  export(block: unknown, ctx: PptxExportContext): Promise<PptxSlideElement>;
  exportability: PptxExportability;
}

export interface ExportDialogProps {
  deck: unknown;
  onExport?: (result: Blob) => void;
  onError?: (error: Error) => void;
}

export const DEFAULT_PPTX_CONFIG: PptxExportConfig = {
  mode: "hybrid",
  includeSpeakerNotes: true,
  includeHiddenSlides: false,
  compatibilityTargets: ["powerpoint", "keynote", "libreoffice"],
  fontPolicy: "warn-and-substitute",
  filenameTemplate: "{title}-{date}.pptx",
};
```

- [ ] **Step 2: Add export types to deck-types.ts**

Read `starter-components/types/deck-types.ts` and add re-exports of the new types at the end of the file.

- [ ] **Step 3: Commit**

```bash
git add starter-components/export/export-types.ts starter-components/types/deck-types.ts
git commit -m "feat: add export type contracts for PPTX export"
```
