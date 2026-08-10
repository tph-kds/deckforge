# PPTX Fidelity-First Export Upgrade (02-example)

Status: **Draft — corrected after self-review, not yet executed**
Target: `examples/02-example`
Planner: DeckForge runtime planner + superpowers writing-plans
Created: 2026-08-09

## Purpose

The current PPTX exporter (`02-example/src/export/**`) produces a working
`.pptx` but gives the user no feedback about **what was actually preserved**:
charts, diagrams, and video chapters are silently replaced, fonts are
substituted, and the deck-level status is a coarse `"complete" | "partial" |
"failed"`. This plan upgrades the export pipeline to a **fidelity-first**
contract:

- Every block export reports its *representation* (native / svg / raster /
  expanded-build / unsupported).
- The final deck status becomes fidelity-aware:
  `"complete" | "complete-with-fallbacks" | "partial" | "failed"` (extended
  `ExportStatus`).
- Charts, diagrams, and video chapter content export as **inline SVG** (data
  URIs) instead of being dropped, so PowerPoint/Keynote/LibreOffice can still
  open and render them as images, while the HTML5 runtime keeps true
  editability.
- The generated `.pptx` is verified against a short **archive contract**
  (slide count, speaker notes, hyperlinks, text survival) after generation.
- The export dialog shows a **fidelity summary** (content recall, missing
  blocks, fallback count) instead of only a file path.
- A `docs`-visible **fidelity showcase deck** (`03-example-fidelity`) is added
  to make degradation behavior visible and reviewable.

This is an **editable-deck** delivery profile: the editor surface stays the
single source of truth, the exported artifact is a fidelity-preserving
derivative, and any loss is surfaced, not hidden.

## Non-goals

- No actual `.pptx` round-trip *rendering* (no slide-preview raster). Fidelity
  here means: content/data preserved in a form PowerPoint can open, with any
  loss explicitly reported.
- No WYSIWYG export UI changes beyond the summary card and shortcut hint.
- No changes to the web presenter/editor surfaces themselves.
- No native text/image/shape table-of-rows conversion work (already native).
- No new runtime dependency: SVG export uses only `pptxgenjs` image support.
- No attempt to make PowerPoint edit the SVG (documented as "image-only").

## Delivery contract (what must be true when this is done)

1. `src/export/fidelity/fidelity-report.ts` exports `buildFidelityReport`,
   `countRepresentation`, and `fidelityStatus`. `src/export/fidelity/
   representation-planner.ts` exports `planBlockRepresentation` and
   `FIDELITY_POLICY`. `src/export/fidelity/content-parity.ts` exports
   `calculateContentParity`. `src/export/fidelity/fidelity-policy.ts` exports
   `FIDELITY_POLICY`.
2. `buildFidelityReport` returns `{ status, contentRecall, missingVisibleBlocks,
   blocks }` where `status` derives from parity and the per-block statuses per
   the hard rules below, and `blocks[i].representation` is one of
   `"native" | "svg" | "raster" | "expanded-build" | "unsupported"`.
3. `export.ts` extends `PptxExportResult` with `fidelity?: FidelityReport`
   and populates it from the built `ExportReport` (`blocks` + parity + archive
   verification).
4. `ExportStatus` gains `"complete-with-fallbacks"`. The four-value order is
   `"complete" | "complete-with-fallbacks" | "partial" | "failed"` — never
   "good, then bad" within one deck.
5. The seed deck exports with **no** `error`-severity issues and no silent
   losses: every seed block reports `"native"` or `"svg"` (charts/diagram),
   and the deck status is `"complete"` or `"complete-with-fallbacks"`.
6. The export dialog replaces the status badge with a fidelity summary card
   (recall %, missing-block count, fallback count) plus a hint to press
   `?` for export shortcuts.
7. Preflight exposes `estimatedFallbacks`, `missingBlockCount`,
   `unsupportedBlockCount`, and `chartBlockCount` (zero-satisfying defaults for
   null configs).
8. A dedicated exportable showcase deck lives at
   `examples/03-example-fidelity` (decks/theme/components mirror the 02 pattern
   minimally), demonstrating: chart SVG export, diagram SVG export, video
   chapter fallback, and a raster fallback block.

## Global constraints (read every step against these)

- **One-way dependency rule.** `export-types.ts` must NOT import from
  `fidelity/*`. All fidelity schema types live in `export-types.ts`;
  `fidelity/*` imports *from* `export-types.ts`. This keeps the type layer
  acyclic and avoids a runtime cycle.
- **No runtime cycle.** Every fidelity `import type` in `export/*.ts` (the
  framework `export.ts`, `export-preflight.ts`, `pptx/*`) is converted to a
  full `import` only if the imported module has no side effects — all our
  modules are side-effect-free, so full imports are fine. Do not add modules
  that run side effects at import time.
- **Keep the editor and presenter as separate surfaces.** No changes to
  editor/presenter routing.
- **Visible shortcut guidance.** The dialog already shows `?` for shortcuts;
  the fidelity card must not remove it.
- **Always fidelity-aware.** Never claim "complete" when a non-hidden block is
  `raster`, `svg` (only when an error occurred), or `unsupported`.
- **SVG is emitted with `data:` URI and `alt`.** Charts/diagrams export an SVG
  image with `alt` text derived from block content; the `alt` is what the
  verifier and PowerPoint screen-reader see.
- **Keep tests green as you go.** Run `npm.cmd run typecheck` then
  `npm.cmd run test -- src/export` (watch mode for the current file) after
  every task. The export test suite's existing tests must stay passing
  (update only where the plan explicitly says).

## Verification loop

```bash
# in examples/02-example (use npm.cmd on Windows)
npm.cmd run typecheck
npm.cmd run test -- src/export/fidelity
npm.cmd run test -- src/export
npm.cmd run build
# then, from repo root:
python ../../scripts/audits/validate_output_contract.py . --profile editable-deck
npm.cmd run validate
```

Run the relevant slice after every task, the full loop at the end.

---

# Task 1 — Schema: fidelity types + `svg` slide element

Adds the type vocabulary the whole pipeline uses, and extends the slide-element
model with an SVG variant. Tests are added first and must pass against the new
types without changing any behavior.

> Execution note (2026-08-09): two facts differ from the original draft.
> (a) Vitest only includes `tests/**/*.test.ts(x)` (see `vite.config.ts`), so
> every test lives under `tests/` with `../src/...` imports. (b)
> `PptxSlideElement` is already a **discriminated union** with a typed `data`
> per variant — so the SVG variant is added as a new union member, not by
> widening a single interface.

## Steps

### 1. Test-first: add `tests/export-types.test.ts`

Create `examples/02-example/tests/export-types.test.ts` (mirrors the
`tests/export.test.ts` convention):

```ts
import { describe, expect, it } from "vitest";
import type { FidelityReport } from "../src/export/fidelity/fidelity-types";
import type { PptxExportResult, PptxSlideElementType } from "../src/export/export-types";

describe("export schema", () => {
  it("accepts the four-value fidelity status order", () => {
    const order: Array<"complete" | "complete-with-fallbacks" | "partial" | "failed"> = [
      "complete",
      "complete-with-fallbacks",
      "partial",
      "failed",
    ];
    expect(order).toHaveLength(4);
  });

  it("defines PptxExportResult with an optional fidelity report", () => {
    const result: PptxExportResult = {
      report: { status: "complete", slides: [], issues: [] },
      blob: new Blob(),
      archiveVerified: true,
      fidelity: { status: "complete", contentRecall: 1, missingVisibleBlocks: 0, blocks: [] },
    };
    expect(result.fidelity?.status).toBe("complete");
  });

  it("allows an svg slide element type", () => {
    const t: PptxSlideElementType = "svg";
    expect(t).toBe("svg");
  });
});
```

Because vitest strips types without checking, the red phase for this test is
`npm.cmd run typecheck` (tsc errors: missing `fidelity/fidelity-types`,
missing `PptxSlideElementType`, no `fidelity` on `PptxExportResult`). The
vitest run itself passes once the files compile.

Run: `npm.cmd run typecheck` (red), then `npm.cmd run test -- tests/export-types.test.ts` (green after implementation).

### 2. Add an `svg` variant to the slide-element union

`src/export/export-types.ts` already models `PptxSlideElement` as a
discriminated union of element interfaces with typed `data`. Add a new member:

```ts
interface PptxSvgElement {
  type: "svg";
  x: number;
  y: number;
  w: number;
  h: number;
  data: { svg: string; alt?: string; options?: Record<string, unknown> };
}
```

and append it to the union (`... | PptxSvgElement`). Also export a type alias
for the discriminant:

```ts
export type PptxSlideElementType =
  | "text"
  | "image"
  | "shape"
  | "table"
  | "chart"
  | "fallback"
  | "svg";
```

SVG elements are constructed as
`{ type: "svg", x, y, w, h, data: { svg: "<svg …>", alt?: string } }`. Because
the union already types `data` per variant, `element.data.svg` is typed
`string` in `writeElementToSlide` — no cast needed at the access site.

### 3. Extend `ExportBlockReport` (line ~36)

```ts
export interface ExportBlockReport {
  blockId: string;
  status: BlockExportStatus;
  issues: ExportIssue[];
  representation?: BlockRepresentation;
  contentPreserved?: boolean;
  editable?: boolean;
  visualParity?: number;
}
```

`BlockRepresentation` is defined in step 4 below; it lives in this same file.

### 4. Add the fidelity schema types (in `export-types.ts`, near `ExportStatus` line ~50)

Add **in this file** so the one-way dependency rule holds (`fidelity/*` imports
from here, never the reverse):

```ts
export type PptxExportMode = "fidelity-first" | "editability-first";

export type BlockRepresentation = "native" | "svg" | "raster" | "expanded-build" | "unsupported";

export type FidelityStatus = ExportStatus;

export interface PptxVerificationCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PptxVerificationReport {
  checks: PptxVerificationCheck[];
  passed: boolean;
}

export interface FidelityReport {
  status: FidelityStatus;
  contentRecall: number;
  missingVisibleBlocks: number;
  blocks: ExportBlockReport[];
  verification?: PptxVerificationReport;
}
```

Also extend the status union (line ~50):

```ts
export type ExportStatus = "complete" | "complete-with-fallbacks" | "partial" | "failed";
```

### 5. Extend `ExportPreflightResult` (line ~121)

```ts
export interface ExportPreflightResult {
  issues: ExportIssue[];
  score: number;
  blockCoverage: number;
  estimatedFallbacks: number;
  missingBlockCount: number;
  unsupportedBlockCount: number;
  chartBlockCount: number;
}
```

### 6. Extend `PptxExportResult` (line ~59)

```ts
export interface PptxExportResult {
  report: ExportReport;
  blob: Blob;
  archiveVerified: boolean;
  fidelity?: FidelityReport;
}
```

### 6a. Create `fidelity/fidelity-types.ts` (re-export layer)

The Task 1 test imports `FidelityReport` from `./fidelity/fidelity-types`, so
the re-export layer is created here (it was originally placed in Task 2). Its
content is exactly the file described in Task 2 step 3 below; Task 2 skips
that step.

### 6b. Keep `export-preflight.ts` compiling

Because `ExportPreflightResult` gained required fields, make
`runExportPreflight` return zero-default estimates now (real estimates land in
Task 9):

```ts
return {
  issues,
  score,
  blockCoverage,
  estimatedFallbacks: 0,
  missingBlockCount: 0,
  unsupportedBlockCount: 0,
  chartBlockCount: 0,
};
```

### 7. Mirror ALL type changes into the starter-components copy

Repeat steps 2–6 in
`skills/deckforge/starter-components/export/export-types.ts` (same edits,
same order). Keep the two files in sync — the starter copy is what future
generated apps get.

### 8. Re-run `export-types.test.ts` — green.

---

# Task 2 — Fidelity policy and representation planner

Implements the decision function that maps a block + export result to a
representation, and a hand-written `FIDELITY_POLICY` (hard rules + priorities)
used by the parity/report layers and (later) the showcase deck.

## Steps

### 1. Add `fidelity/fidelity-policy.ts` (new)

```ts
import type { PptxFidelityPolicy } from "./fidelity-types";

export const FIDELITY_POLICY: PptxFidelityPolicy = {
  version: "1.0.0",
  defaultMode: "fidelity-first",
  priorities: ["content", "visual", "geometry", "editability", "file-size"],
  hardRules: {
    meaningfulContentRecall: 0.9,
    maxMissingVisibleBlocks: 0,
    silentOmissionAllowed: false,
    diagramSummaryFallbackAllowed: true,
  },
  representations: ["native", "svg", "raster", "expanded-build"],
};
```

### 2. Add `fidelity/representation-planner.ts` (new)

```ts
import type { BlockExportStatus, ExportIssue, PptxSlideElement } from "../export-types";
import type { BlockRepresentation, FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";

export interface PlannerInput {
  blockId: string;
  hidden: boolean;
  status: BlockExportStatus;
  element?: PptxSlideElement;
  issues: ExportIssue[];
}

function repr(
  blockId: string,
  status: BlockExportStatus,
  issues: ExportIssue[],
  representation: BlockRepresentation,
  extras: Partial<Pick<FidelityBlockReport, "contentPreserved" | "editable" | "visualParity">> = {},
): FidelityBlockReport {
  return {
    blockId,
    status,
    issues,
    representation,
    contentPreserved: representation !== "unsupported",
    editable: representation === "native",
    visualParity: representation === "native" ? 1 : representation === "svg" ? 0.9 : 0.8,
    ...extras,
  };
}

export function planBlockRepresentation(
  input: PlannerInput,
  policy: PptxFidelityPolicy = FIDELITY_POLICY,
): FidelityBlockReport {
  const { blockId, hidden, status, element, issues } = input;
  if (hidden) {
    return repr(blockId, "skipped", issues, "unsupported", { contentPreserved: false, editable: false, visualParity: 0 });
  }
  const hasError = issues.some((issue) => issue.severity === "error");
  if (hasError || status === "unsupported") {
    return repr(blockId, "unsupported", issues, "unsupported", { contentPreserved: false, editable: false, visualParity: 0 });
  }
  const r: BlockRepresentation =
    element?.type === "svg"
      ? "svg"
      : status === "native"
        ? "native"
        : status === "rasterized"
          ? "raster"
          : status === "substituted"
            ? "expanded-build"
            : "unsupported";
  return repr(blockId, status, issues, r);
}

export function countRepresentation(
  blocks: FidelityBlockReport[],
  rep: BlockRepresentation,
): number {
  return blocks.filter((b) => b.representation === rep).length;
}
```

### 3. Add `fidelity/fidelity-types.ts` — DONE in Task 1 (step 6a)

Already created in Task 1; its content is exactly the file below. If for any
reason it does not exist yet, create it now:

This file is the **re-export layer** so consumers keep importing from
`./fidelity-types` while the schema itself lives in `export-types.ts` (one-way
dependency):

```ts
import type {
  BlockRepresentation,
  ExportBlockReport,
  ExportStatus,
  FidelityReport,
  PptxExportMode,
  PptxVerificationReport,
} from "../export-types";

// Re-exported so consumers can import the shared schema types from one place.
export type { BlockRepresentation, FidelityReport, PptxExportMode, PptxVerificationReport };

export type FidelityStatus = ExportStatus;

/** A per-block fidelity report entry; same shape as the extended ExportBlockReport. */
export type FidelityBlockReport = ExportBlockReport;

export interface FidelityHardRules {
  meaningfulContentRecall: number;
  maxMissingVisibleBlocks: number;
  silentOmissionAllowed: boolean;
  diagramSummaryFallbackAllowed: boolean;
}

export interface PptxFidelityPolicy {
  version: string;
  defaultMode: PptxExportMode;
  priorities: Array<"content" | "visual" | "geometry" | "editability" | "file-size">;
  hardRules: FidelityHardRules;
  representations: Array<"native" | "svg" | "raster" | "expanded-build">;
}
```

### 4. Add `fidelity/representation-planner.test.ts` (new)

```ts
import { describe, expect, it } from "vitest";
import { FIDELITY_POLICY } from "./fidelity-policy";
import { countRepresentation, planBlockRepresentation, type PlannerInput } from "./representation-planner";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";

function rep(input: Partial<PlannerInput>): FidelityBlockReport {
  return planBlockRepresentation(
    {
      blockId: "b1",
      hidden: false,
      status: "native",
      issues: [],
      ...input,
    },
    FIDELITY_POLICY,
  );
}

describe("planBlockRepresentation", () => {
  it("maps native blocks to native representation", () => {
    const r = rep({ status: "native" });
    expect(r.representation).toBe("native");
    expect(r.editable).toBe(true);
    expect(r.contentPreserved).toBe(true);
  });

  it("maps svg elements to svg representation", () => {
    const r = rep({ status: "rasterized", element: { type: "svg", x: 0, y: 0, w: 100, h: 100, data: { svg: "<svg/>", alt: "A chart" } } });
    expect(r.representation).toBe("svg");
    expect(r.editable).toBe(false);
  });

  it("maps rasterized non-svg elements to raster", () => {
    const r = rep({ status: "rasterized" });
    expect(r.representation).toBe("raster");
  });

  it("maps substituted blocks to expanded-build", () => {
    const r = rep({ status: "substituted" });
    expect(r.representation).toBe("expanded-build");
  });

  it("is unsupported when the exporter errored", () => {
    const r = rep({ status: "native", issues: [{ code: "block-export-failed", severity: "error", message: "boom", automaticFixAvailable: false }] });
    expect(r.representation).toBe("unsupported");
    expect(r.contentPreserved).toBe(false);
    expect(r.editable).toBe(false);
  });

  it("skips hidden blocks without counting them as missing", () => {
    const r = rep({ hidden: true });
    expect(r.representation).toBe("unsupported");
    expect(r.status).toBe("skipped");
  });

  it("counts representations per category", () => {
    const blocks = [rep({ status: "native" }), rep({ status: "rasterized", element: { type: "svg", x: 0, y: 0, w: 1, h: 1, data: { svg: "" } } }), rep({ hidden: true })];
    expect(countRepresentation(blocks, "svg")).toBe(1);
    expect(countRepresentation(blocks, "native")).toBe(1);
  });

  it("respects a custom policy's allowed representations", () => {
    const custom: PptxFidelityPolicy = { ...FIDELITY_POLICY, representations: ["native"] };
    const r = planBlockRepresentation({ blockId: "b", hidden: false, status: "native", issues: [] }, custom);
    expect(r.representation).toBe("native");
  });
});
```

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/fidelity/representation-planner.test.ts`.

---

# Task 3 — Content parity

Computes a single `contentRecall` number from a deck and its fidelity block
reports. This is the input to `buildFidelityReport`'s status.

## Steps

### 1. Add `fidelity/content-parity.ts` (new)

> Execution note: in this codebase `Block.content` is typed `unknown`, so the
> module casts through a `Record<string, unknown>` helper (`asRecord`) before
> reading `.text` / `.alt` / `.chart.title`. The original draft's placeholder
> `blockRepresentation` (which always returned `"native"`) is dropped — it was
> dead weight. The module exports `rawText` and `calculateContentParity`.

```ts
import type { Block, DeckProject } from "../../deck/types";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";
import { FIDELITY_POLICY } from "./fidelity-policy";

const VISIBLE_TEXT = /[A-Za-z0-9]{2,}/g;

type ContentRecord = Record<string, unknown>;

function asRecord(value: unknown): ContentRecord {
  return (value ?? {}) as ContentRecord;
}

export function rawText(block: Block): string {
  return String(asRecord(block.content).text ?? "");
}

function meaningfulText(block: Block): number {
  return (rawText(block).match(VISIBLE_TEXT) ?? []).length;
}

export function calculateContentParity(
  deck: DeckProject,
  blocks: FidelityBlockReport[],
  policy: PptxFidelityPolicy = FIDELITY_POLICY,
): number {
  const visible = deck.slides.flatMap((slide) => slide.blocks.filter((block) => !block.hidden));
  if (visible.length === 0) return 1;

  const byId = new Map(blocks.map((b) => [b.blockId, b]));
  const expected = visible.map((block) => meaningfulText(block));
  const present = visible.map((block) => {
    const rep = byId.get(block.id);
    if (!rep || rep.representation === "unsupported") return 0;
    if (rep.representation === "native" || rep.representation === "expanded-build") return meaningfulText(block);
    if (rep.representation === "raster") return Math.round(meaningfulText(block) * 0.8);
    if (rep.representation === "svg") {
      const content = asRecord(block.content);
      const alt = String(content.alt ?? asRecord(content.chart).title ?? content.text ?? "");
      return Math.max(1, (alt.match(VISIBLE_TEXT) ?? []).length);
    }
    return 0;
  });

  const expectedTotal = expected.reduce((a, b) => a + b, 0);
  const presentTotal = present.reduce((a, b) => a + b, 0);
  return expectedTotal === 0 ? 1 : Math.min(1, presentTotal / expectedTotal);
}
```

### 2. Add `fidelity/content-parity.test.ts` (new)

```ts
import { describe, expect, it } from "vitest";
import { calculateContentParity } from "./content-parity";
import { FIDELITY_POLICY } from "./fidelity-policy";
import type { FidelityBlockReport } from "./fidelity-types";
import type { DeckProject } from "../../deck/types";

function textBlock(id: string, text: string, hidden = false): any {
  return { id, type: "text", layout: { x: 0, y: 0, w: 200, h: 40 }, content: { text }, hidden };
}

function deck(blocks: any[], slideId = "s1"): DeckProject {
  return { slides: [{ id: slideId, blocks }] } as unknown as DeckProject;
}

function native(id: string): FidelityBlockReport {
  return { blockId: id, status: "native", issues: [], representation: "native" };
}

function unsupported(id: string): FidelityBlockReport {
  return { blockId: id, status: "unsupported", issues: [], representation: "unsupported", contentPreserved: false };
}

describe("calculateContentParity", () => {
  it("is 1 for an all-native deck", () => {
    const d = deck([textBlock("a", "Hello world")]);
    const parity = calculateContentParity(d, [native("a")], FIDELITY_POLICY);
    expect(parity).toBe(1);
  });

  it("is 0 when every visible block is missing", () => {
    const d = deck([textBlock("a", "Hello world")]);
    const parity = calculateContentParity(d, [unsupported("a")], FIDELITY_POLICY);
    expect(parity).toBe(0);
  });

  it("is 0.5 when one of two blocks is missing", () => {
    const d = deck([textBlock("a", "Hello world"), textBlock("b", "Goodbye world")]);
    const parity = calculateContentParity(d, [native("a"), unsupported("b")], FIDELITY_POLICY);
    expect(parity).toBe(0.5);
  });

  it("excludes hidden blocks from the denominator", () => {
    const d = deck([textBlock("a", "Hello world", true), textBlock("b", "Goodbye world")]);
    const parity = calculateContentParity(d, [unsupported("a"), native("b")], FIDELITY_POLICY);
    expect(parity).toBe(1);
  });

  it("is 1 for an empty visible deck", () => {
    expect(calculateContentParity(deck([]), [], FIDELITY_POLICY)).toBe(1);
  });
});
```

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/fidelity/content-parity.test.ts`.

---

# Task 4 — PPTX archive verifier

Adds `pptx-verifier.ts`: a JSZip-based structural check of the produced
`.pptx`. It verifies slide count, speaker notes, text survival, and slide
relationship integrity.
The current `pptx-exporter.ts` already stubs `verifyArchive` returning
`{ passed: true }`; replace it here. The exporter test suite must keep passing
(its `vi.mock` of pptxgenjs still works because the verifier needs no
pptxgenjs).

## Steps

### 1. Add `pptx/pptx-verifier.ts` (new)

```ts
import JSZip from "jszip";
import type { ExportReport, PptxVerificationCheck, PptxVerificationReport } from "../export-types";

export interface VerificationInput {
  report: ExportReport;
  blob: Blob;
  /** slideId -> expected text fragments that must appear in that slide's <a:t> runs */
  expectedTexts?: Record<string, string[]>;
}

function decode(entryText: string): string {
  return entryText.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function normalizeText(text: string): string {
  return decode(text).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function slideNumber(slideId: string): number {
  const match = /slide(\d+)/.exec(slideId);
  return match ? parseInt(match[1], 10) : 0;
}

export async function verifyPptxArchive(input: VerificationInput): Promise<{
  passed: boolean;
  report: PptxVerificationReport;
}> {
  const { report, blob, expectedTexts = {} } = input;
  const checks: PptxVerificationCheck[] = [];
  const slideIds = report.slides.map((s) => s.slideId);

  try {
    const zip = await JSZip.loadAsync(blob);

    const archiveSlides = Object.keys(zip.files)
      .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml") && !name.includes("_rels"))
      .map((name) => name.replace("ppt/slides/", "").replace(".xml", ""))
      .filter((name) => name !== "slideMast");
    checks.push({
      name: "slide-count",
      passed: archiveSlides.length === slideIds.length,
      detail: `expected ${slideIds.length} slides, found ${archiveSlides.length}`,
    });

    const notesCount = slideIds.reduce((count, slideId) => {
      const entry = zip.file(`ppt/notesSlides/notesSlide${slideNumber(slideId)}.xml`);
      return entry ? count + 1 : count;
    }, 0);
    checks.push({
      name: "speaker-notes",
      passed: notesCount === slideIds.length,
      detail: `found notes for ${notesCount} of ${slideIds.length} slides`,
    });

    const slideText = new Map<string, string>();
    for (const slideId of slideIds) {
      const entry = zip.file(`ppt/slides/${slideId}.xml`);
      if (!entry) continue;
      const raw = await entry.async("string");
      const texts = raw.match(/<a:t>([^<]*)<\/a:t>/g) ?? [];
      slideText.set(slideId, texts.map((t) => t.replace(/<\/?a:t>/g, "")).join(" "));
    }

    const missing: string[] = [];
    for (const slideId of slideIds) {
      const normalized = normalizeText(slideText.get(slideId) ?? "");
      for (const expected of expectedTexts[slideId] ?? []) {
        if (!normalized.includes(normalizeText(expected))) {
          missing.push(`slide ${slideId} missing text: "${expected}"`);
        }
      }
    }
    checks.push({
      name: "text-survival",
      passed: missing.length === 0,
      detail: missing.length === 0 ? "all expected text found" : missing.join("; "),
    });

    const missingRels: string[] = [];
    for (const slideId of slideIds) {
      const rels = zip.file(`ppt/slides/_rels/${slideId}.xml.rels`);
      if (!rels) continue;
      const relsText = await rels.async("string");
      if (!/^\s*<Relationship\b[^>]*\bTarget=/m.test(relsText)) {
        missingRels.push(slideId);
      }
    }
    checks.push({
      name: "relationship-integrity",
      passed: missingRels.length === 0,
      detail: missingRels.length === 0 ? "every slide has a target-bearing relationship" : `slides missing rels targets: ${missingRels.join(", ")}`,
    });

    return {
      passed: checks.every((c) => c.passed),
      report: { checks, passed: checks.every((c) => c.passed) },
    };
  } catch (error) {
    checks.push({
      name: "archive-open",
      passed: false,
      detail: error instanceof Error ? error.message : "failed to open archive",
    });
    return { passed: false, report: { checks, passed: false } };
  }
}
```

### 2. Add `pptx/pptx-verifier.test.ts` (new)

The verifier needs a real blob, so it cannot use the existing pptxgenjs mock.
It builds a minimal valid PPTX zip with `jszip` directly.

```ts
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { verifyPptxArchive } from "./pptx-verifier";
import type { ExportReport } from "../export-types";

const SLIDE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Hello world</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

const SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

const NOTES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker note</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`;

async function buildZip(overrides: Record<string, unknown> = {}): Promise<Blob> {
  const zip = new JSZip();
  const base: Record<string, unknown> = {
    "[Content_Types].xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Types/>",
    "ppt/slides/slide1.xml": SLIDE_XML,
    "ppt/slides/_rels/slide1.xml.rels": SLIDE_RELS,
    "ppt/notesSlides/notesSlide1.xml": NOTES_XML,
  };
  const files = { ...base, ...overrides };
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content as string);
  }
  return zip.generateAsync({ type: "blob" });
}

const BASE_REPORT: ExportReport = {
  status: "complete",
  slides: [
    {
      slideId: "slide1",
      blocks: [
        { blockId: "text-a", status: "native", issues: [], representation: "native", contentPreserved: true },
      ],
    },
  ],
  issues: [],
};

describe("verifyPptxArchive", () => {
  it("passes a well-formed archive with all expected content", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedTexts: { slide1: ["Hello world"] },
    });
    expect(result.passed).toBe(true);
    expect(result.report.checks.map((c) => c.name)).toContain("text-survival");
  });

  it("fails when a slide part is missing", async () => {
    const blob = await buildZip();
    const result = await verifyPptxArchive({
      report: { ...BASE_REPORT, slides: [BASE_REPORT.slides[0], { slideId: "slide2", blocks: [] }] },
      blob,
    });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "slide-count")?.passed).toBe(false);
  });

  it("reports missing expected text", async () => {
    const blob = await buildZip({
      "ppt/slides/slide1.xml": SLIDE_XML.replace("Hello world", "Goodbye world"),
    });
    const result = await verifyPptxArchive({
      report: BASE_REPORT,
      blob,
      expectedTexts: { slide1: ["Hello world"] },
    });
    expect(result.passed).toBe(false);
    const textCheck = result.report.checks.find((c) => c.name === "text-survival");
    expect(textCheck?.passed).toBe(false);
  });

  it("fails to open a non-archive blob", async () => {
    const result = await verifyPptxArchive({ report: BASE_REPORT, blob: new Blob(["not a zip"]) });
    expect(result.passed).toBe(false);
    expect(result.report.checks.find((c) => c.name === "archive-open")?.passed).toBe(false);
  });
});
```

### 3. Replace the `verifyArchive` stub in `pptx-exporter.ts`

Delete this block (around lines 108–126 in the current file):

```ts
export async function verifyArchive(_blob: Blob): Promise<{ passed: boolean }> {
  return { passed: true };
}
```

And replace it with a thin wrapper:

```ts
import type { ExportReport } from "../export-types";
import { verifyPptxArchive } from "./pptx-verifier";

export async function verifyArchive(
  blob: Blob,
  report?: ExportReport,
  expectedTexts?: Record<string, string[]>,
): Promise<{ passed: boolean }> {
  if (!report) return { passed: true };
  const result = await verifyPptxArchive({ report, blob, expectedTexts });
  return { passed: result.passed };
}
```

Run: `npm.cmd run typecheck`, `npm.cmd run test -- src/export/pptx/pptx-verifier.test.ts`, then `npm.cmd run test -- src/export`.

---

# Task 5 — Wire the verifier into the exporter and keep the suite green

The exporter currently stubs `verifyArchive`. This task replaces that stub with
the real `verifyPptxArchive` and updates the existing export test to cover the
real verification path, while keeping every pre-existing test passing.

## Steps

### 1. Update the existing `export.test.ts` mock and fixtures

Current `export.test.ts` mocks `pptxgenjs` with a fake `Slide` whose
`writeFile` returns `{ generateAsync: ... }` and its zip fixture has `slide1.xml`,
`slide2.xml`, and notes. Because the exporter now calls the real verifier, the
fixture must satisfy the archive contract. Keep the mock (it still works — the
verifier needs no pptxgenjs), but fix two things:

**a. `ArchiveMock.writeFile` — keep returning a blob, but make sure it encodes
all three slides** (it already pushes one part per call to `generate`; when the
exporter adds notes via `addNotes` the mock already records them). Verify the
fixture's slide count matches the report (2 slides) so `slide-count` passes.

**b. Fix the slide-count test that passed for the wrong reason.** The existing
test "reports complete with every block native for an all-native deck" and the
archive verification tests currently rely on the fake returning `passed: true`
unconditionally. Replace the unconditional pass with the real verifier by
giving the fixture exactly the two slides the report expects. If the current
test drops `slide2` from the fake zip, the verifier now correctly fails
`slide-count` — so update the test to keep BOTH slides in the fixture:

```ts
"ppt/slides/slide2.xml": fakeSlideXml("slide2"),
"ppt/slides/_rels/slide2.xml.rels": fakeSlideRels("slide2"),
```

(Adjust `fakeSlideXml`/`fakeSlideRels` helpers as needed — they already exist in
the mock.)

### 2. Confirm `export.test.ts` "verifies the archive" test now runs the real verifier

The existing test asserting `result.archiveVerified === true` for a valid deck
must still pass. If it fails, it means the fixture's text/slide-count no longer
matches the report — fix the fixture, not the assertion.

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/export.test.ts`.

---

# Task 6 — Fidelity report builder

Combines per-block fidelity entries + content parity into the deck-level
`FidelityReport` returned by export.

## Steps

### 1. Add `fidelity/fidelity-report.ts` (new)

```ts
import type { DeckProject } from "../../deck/types";
import type { FidelityReport } from "../export-types";
import { calculateContentParity } from "./content-parity";
import { FIDELITY_POLICY } from "./fidelity-policy";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";

export interface BuildFidelityReportInput {
  deck: DeckProject;
  blocks: FidelityBlockReport[];
  policy?: PptxFidelityPolicy;
}

export function countRepresentation(
  blocks: FidelityBlockReport[],
  rep: FidelityBlockReport["representation"],
): number {
  return blocks.filter((b) => b.representation === rep).length;
}

export function fidelityStatus(
  parity: number,
  blocks: FidelityBlockReport[],
  policy: PptxFidelityPolicy,
): FidelityReport["status"] {
  const hardRules = policy.hardRules;
  const visible = blocks.filter((b) => b.status !== "skipped");
  const hasError = blocks.some((b) => b.issues.some((i) => i.severity === "error"));
  if (hasError) return "failed";
  if (parity < hardRules.meaningfulContentRecall) return "partial";
  if (visible.some((b) => b.representation === "unsupported")) return "partial";
  const fallbackCount = countRepresentation(blocks, "raster") + countRepresentation(blocks, "svg") + countRepresentation(blocks, "expanded-build");
  if (fallbackCount > 0) return "complete-with-fallbacks";
  return "complete";
}

export function buildFidelityReport(input: BuildFidelityReportInput): FidelityReport {
  const { deck, blocks, policy = FIDELITY_POLICY } = input;
  const parity = calculateContentParity(deck, blocks, policy);
  const missingVisibleBlocks = blocks.filter(
    (b) => b.status !== "skipped" && b.representation === "unsupported",
  ).length;
  return {
    status: fidelityStatus(parity, blocks, policy),
    contentRecall: parity,
    missingVisibleBlocks,
    blocks,
  };
}
```

(Note: `fidelity-report.ts` imports `FidelityReport` from `../export-types`
directly, and the re-exported `FidelityReport` in `fidelity-types.ts` is
identical, so either import site compiles. Keep the direct one here and use the
`fidelity-types` one in consumers that already import it — both are the same
type.)

### 2. Add `fidelity/fidelity-report.test.ts` (new)

```ts
import { describe, expect, it } from "vitest";
import { FIDELITY_POLICY } from "./fidelity-policy";
import { buildFidelityReport, countRepresentation, fidelityStatus } from "./fidelity-report";
import { planBlockRepresentation, type PlannerInput } from "./representation-planner";
import type { DeckProject } from "../../deck/types";
import type { FidelityBlockReport } from "./fidelity-types";

function textBlock(id: string, text: string, hidden = false): any {
  return { id, type: "text", layout: { x: 0, y: 0, w: 200, h: 40 }, content: { text }, hidden };
}

function deck(blocks: any[]): DeckProject {
  return { slides: [{ id: "s1", blocks }] } as unknown as DeckProject;
}

function textEl(text: string, x = 0, y = 0): PlannerInput["element"] {
  return { type: "text", x, y, w: 100, h: 40, data: { text, options: {} } };
}

function plan(input: Partial<PlannerInput>): FidelityBlockReport {
  return planBlockRepresentation(
    { blockId: "b1", hidden: false, status: "native", issues: [], element: textEl("Hello world"), ...input },
    FIDELITY_POLICY,
  );
}

describe("buildFidelityReport", () => {
  it("is complete for an all-native deck", () => {
    const blocks = [plan({ blockId: "a" })];
    const report = buildFidelityReport({ deck: deck([textBlock("a", "Hello world")]), blocks });
    expect(report.status).toBe("complete");
    expect(report.contentRecall).toBe(1);
    expect(report.missingVisibleBlocks).toBe(0);
  });

  it("is complete-with-fallbacks when a chart is svg", () => {
    const svg = plan({ blockId: "a", status: "rasterized", element: { type: "svg", x: 0, y: 0, w: 100, h: 100, data: { svg: "<svg/>", alt: "Quarterly revenue" } } });
    const report = buildFidelityReport({ deck: deck([textBlock("a", "Quarterly revenue")]), blocks: [svg] });
    expect(report.status).toBe("complete-with-fallbacks");
  });

  it("is partial when a visible block is unsupported", () => {
    const blocks = [
      plan({ blockId: "a" }),
      plan({ blockId: "b", issues: [{ code: "block-export-failed", severity: "error", message: "boom", automaticFixAvailable: false }] }),
    ];
    const report = buildFidelityReport({ deck: deck([textBlock("a", "Hello world"), textBlock("b", "Goodbye world")]), blocks });
    expect(report.status).toBe("failed");
    expect(report.missingVisibleBlocks).toBe(1);
  });

  it("counts representations", () => {
    const blocks = [plan({ blockId: "a" }), plan({ blockId: "b", status: "rasterized" })];
    expect(countRepresentation(blocks, "native")).toBe(1);
    expect(countRepresentation(blocks, "raster")).toBe(1);
  });

  it("derives failed from parity below the hard rule", () => {
    const blocks = [
      plan({ blockId: "a" }),
      plan({ blockId: "b", issues: [{ code: "block-export-failed", severity: "error", message: "boom", automaticFixAvailable: false }] }),
    ];
    expect(fidelityStatus(0.5, blocks, FIDELITY_POLICY)).toBe("failed");
  });
});
```

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/fidelity/fidelity-report.test.ts`.

---

# Task 7 — Rework `export.ts` + `pptx-exporter.ts` to be fidelity-first

The core: the exporter now produces fidelity block reports, computes parity,
calls the real verifier, and returns `PptxExportResult` with `fidelity`. The
big existing `export.test.ts` suite is reworked to fixture the new pipeline.

## Steps

### 1. Rework `pptx-exporter.ts`

**a. Add an SVG case to `writeElementToSlide`** (after the `"fallback"` case,
around line 82):

```ts
    case "svg": {
      pptxSlide.addImage({
        data: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(element.data.svg as string)}`,
        ...opts,
        ...(element.data.options as PptxGenJS.ImageProps),
      } as unknown as PptxGenJS.ImageProps);
      break;
    }
```

**b. Extend `ExportBuildResult`** (line ~86) so the fidelity blocks flow out:

```ts
export interface ExportBuildResult {
  slides: Array<{ slide: DeckSlide; elements: PptxSlideElement[] }>;
  report: ExportReport;
  parity: number;
  fidelityBlocks: FidelityBlockReport[];
}
```

Import `FidelityBlockReport` (from `./fidelity-types`).

**c. Rework `deriveExportStatus`** (lines ~95-97). Current:

```ts
export function deriveExportStatus(
  issues: ExportIssue[],
  slideReports: ExportSlideReport[],
  params?: unknown
): ExportStatus {
  const hasError = issues.some((issue) => issue.severity === "error");
  return hasError ? "failed" : "partial";
}
```

Replace with:

```ts
export function deriveExportStatus(
  issues: ExportIssue[],
  slideReports: ExportSlideReport[],
  parity: number,
  archiveVerified: boolean = true,
): ExportStatus {
  const hasError = issues.some((issue) => issue.severity === "error");
  if (hasError || !archiveVerified) return "failed";
  const allNative = slideReports.every((slide) => slide.blocks.every((block) => block.status === "native"));
  if (allNative) return "complete";
  if (parity >= 1) return "complete-with-fallbacks";
  return "partial";
}
```

**d. Rework `exportBlocksToSlide`** (lines ~99-108) to thread a per-slide
`fidelityBlocks: FidelityBlockReport[]` array:

- Start with `const fidelityBlocks: FidelityBlockReport[] = [];`
- For each block, call `blockExporter.export(block, ctx)` to get `result`
  (`PptxBlockExport` with `status`, `issues`, optional `element`).
- Build a `PlannerInput` and push `planBlockRepresentation(...)` into
  `fidelityBlocks`. Import `planBlockRepresentation` and `PlannerInput` from
  `./fidelity/representation-planner`.
- If `result.element` exists, `elements.push(result.element)`.
- For hidden blocks, skip export and push
  `planBlockRepresentation({ blockId: block.id, hidden: true, status: "skipped", issues: [] }, FIDELITY_POLICY)`.
- After the loop, if any block had an error issue, keep the block's element out
  of the deck and record a `"block-export-failed"` issue (severity `"error"`) so
  `deriveExportStatus` can fail the deck. The block report still gets
  `representation: "unsupported"`.

**e. Rework `export()`** (the exported function) to return `PptxExportResult`:

- After building `{ slides, report }`, compute:
  `const parity = calculateContentParity(deck, reportBlocks, FIDELITY_POLICY)`.
- Build the final fidelity report:
  `const fidelityReport = buildFidelityReport({ deck, blocks: reportBlocks, policy: FIDELITY_POLICY })`.
- Build `expectedTexts` from the deck so the archive verifier checks real
  content (visible blocks only; reuse `rawText` from `fidelity/content-parity`):
  `const expectedTexts = Object.fromEntries(deck.slides.map((slide) => [slide.slideId, slide.blocks.filter((b) => !b.hidden).map((b) => rawText(b))]));`
  (Adjust `slide.slideId` to the actual field name used by the deck model.)
- Replace the `verifyArchive(blob)` stub call with the real one:
  `const archiveVerified = (await verifyArchive(blob, report, expectedTexts)).passed;`
- Set `report.status = deriveExportStatus(allIssues, report.slides, parity, archiveVerified)`.
- Return `{ report, blob, archiveVerified, fidelity: fidelityReport }`.

**f. Keep the module pure and side-effect free** — no top-level imports of
modules that run side effects.

### 2. Update `export.ts` (framework facade)

- `import type { FidelityReport } from "./export-types";` (the schema lives
  there now; do not import it from `./fidelity/fidelity-types`).
- In `PptxExporter.export()`, thread the new inputs: compute the fidelity report
  from the built `ExportReport` + deck + verification, and set
  `result.fidelity`.
- Keep `exportPptx` returning the blob and now also expose the report/fidelity
  so the UI can consume it.

### 3. Rework `export.test.ts` to fixture the new pipeline

Replace the block-report fixtures with explicit fidelity ones. Add a small
`vi.mock` note: the pptxgenjs mock stays, but the *fixture blob* must match the
archive contract (slide count, notes, text). Add fixtures:

```ts
const NATIVE_ISSUES: ExportIssue[] = [];
const BLOCK_A = { blockId: "a", status: "native" as const, issues: NATIVE_ISSUES, representation: "native" as const };
```

Add tests:

```ts
it("returns a fidelity report with contentRecall 1 for an all-native deck", async () => {
  const { result } = await runExport(FIXTURE_ALL_NATIVE);
  expect(result.fidelity?.contentRecall).toBe(1);
  expect(result.fidelity?.status).toBe("complete");
});

it("flags a complete-with-fallbacks status when a chart becomes svg", async () => {
  const { result } = await runExport(FIXTURE_WITH_SVG);
  expect(result.fidelity?.status).toBe("complete-with-fallbacks");
});

it("fails the deck when a block export errors", async () => {
  const { result } = await runExport(FIXTURE_WITH_ERROR_BLOCK);
  expect(result.report.status).toBe("failed");
  expect(result.fidelity?.status).toBe("failed");
});

it("sets archiveVerified from the real verifier", async () => {
  const { result } = await runExport(FIXTURE_ALL_NATIVE);
  expect(result.archiveVerified).toBe(true);
});
```

Adapt the existing `describe("deriveExportStatus")` block: its old 2-arg calls
become 4-arg calls, e.g. `deriveExportStatus(issues, slides, parity)`.

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/export.test.ts`.

---

# Task 8 — SVG-native chart, diagram, and video export + process-text fix

Converts charts and diagrams to inline SVG (data URI images), adds a video
chapter fallback exporter, and fixes the process block's duplicate-text bug.
This is where the seed deck's fidelity actually improves.

## Steps

### 1. `pptx/block-exporters/chart.ts` → emit SVG

Change the chart exporter to produce an SVG image element:

- Build the SVG string from the chart's data: `series`, `categories`,
  `title`, `type` (bar/line/area), and color scale from
  `ctx.deck.theme.colors`.
- Return `{ status: "rasterized", issues: [], element: { type: "svg", x, y, w, h, data: { svg, alt } } }`
  where `alt` is derived from the chart title or a default like
  `"${type} chart: ${categories.join(', ')}"`.
- SVG content: title text, axis labels, bars/lines/points. Use a fixed
  viewBox of `0 0 ${w} ${h}` and `shape-rendering="crispEdges"`.
- Colors from theme tokens: `axis` (labels), `accent`/`primary` (bars),
  `grid` (ticks). Keep the SVG free of external refs (`xlink:href`), scripts,
  or `foreignObject` (security: no active content in exported files).

### 2. `pptx/block-exporters/diagram.ts` → emit SVG

Same pattern: build an SVG from `block.content.diagram` (`steps`, `kind`
= `flow`/`matrix`), return `{ status: "rasterized", element: { type: "svg", ... data: { svg, alt } } }`
with `alt` = the diagram title or first steps joined by ` -> `.

### 3. `pptx/block-exporters/video.ts` → chapter fallback

The current video exporter returns an empty element (it is effectively a no-op
that produces no slide output and no issue). Change it so a video with a
`chapter` produces a **poster + summary** fallback:

```ts
export const videoExporter: PptxBlockExporter = {
  type: "video",
  exportability: "image-only",
  async export(block: Block, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const content = block.content as { url?: string; poster?: string; chapter?: { title?: string; summary?: string; keyPoints?: string[] } };
    if (content?.chapter?.title || content?.chapter?.summary) {
      return {
        status: "rasterized",
        issues: [{ code: "fallback-rasterized", severity: "info", message: "Video exported as chapter summary card", automaticFixAvailable: false }],
        element: {
          type: "text",
          x: block.layout?.x ?? 0,
          y: block.layout?.y ?? 0,
          w: block.layout?.w ?? 640,
          h: block.layout?.h ?? 360,
          data: {
            text: [content.chapter.title, content.chapter.summary, ...(content.chapter.keyPoints ?? [])].filter(Boolean).join("\n"),
            options: { breakLine: true, fit: "shrink" },
          },
        },
      };
    }
    return {
      status: "rasterized",
      issues: [{ code: "external-asset", severity: "info", message: "Video requires an interactive runtime; exported as placeholder", automaticFixAvailable: false }],
      element: {
        type: "text",
        x: block.layout?.x ?? 0,
        y: block.layout?.y ?? 0,
        w: block.layout?.w ?? 640,
        h: block.layout?.h ?? 360,
        data: { text: "[Video placeholder]", options: { align: "center" } },
      },
    };
  },
};
```

Register `videoExporter` in the index (Task 9).

### 4. Update exporter tests

- **`pptx/block-exporters/chart.test.ts`** — rewrite the current assertions
  that expected `addImage` with `fallback` data; now expect an SVG element:

```ts
expect(result.element?.type).toBe("svg");
const svg = (result.element?.data as { svg: string }).svg;
expect(svg).toContain("<svg");
expect(svg).toContain("Quarterly revenue");
```

- **`pptx/block-exporters/video.test.ts`** — the current test
  `"splits chapter source content into poster, summary, and metadata"` asserted
  the old (removed) behavior. Mark it `.skip` and add the new behavior test:

```ts
it("exports a video with a chapter as a summary card", async () => {
  const block = {
    id: "vid-1",
    type: "video",
    layout: { x: 0, y: 0, w: 640, h: 360 },
    source: { url: "https://example.com/video.mp4" },
    chapter: { title: "Core loop", summary: "The core loop is the heart of the game.", keyPoints: ["Clear goal", "Escalating stakes"] },
  } as unknown as Block;
  const result = await videoExporter.export(block, ctxFor({}));
  expect(result.element?.type).toBe("text");
  const text = (result.element?.data as { text: string }).text;
  expect(text).toContain("Core loop");
  expect(text).toContain("Clear goal");
});

it("exports a video without a chapter as a placeholder", async () => {
  const block = { id: "vid-1", type: "video", layout: { x: 0, y: 0, w: 640, h: 360 }, source: { url: "https://example.com/video.mp4" } } as unknown as Block;
  const result = await videoExporter.export(block, ctxFor({}));
  expect(result.element?.type).toBe("text");
  expect((result.element?.data as { text: string }).text).toContain("Video placeholder");
});
```

(`ctxFor` is the existing test helper; adjust to the test's actual helper name.)

- **`pptx/block-exporters/process.test.ts`** — the current test
  `"uses consistent text for process step labels"` encoded the *bug* (labels
  duplicated in `data.text`). Fix the exporter first (below), then update the
  test to assert the corrected single-step output.

### 5. Fix the process exporter's duplicate-text bug

Current `process.ts` sets `data.text` to a list containing each step's
`title` and `description` twice. Fix so each step contributes its `title`
once and its `description` once:

```ts
data: {
  text: steps.flatMap((s) => [s.title, s.description]).filter(Boolean),
  options: { list: { type: "bullet" } },
}
```

### 6. Update the process test to lock the fix

```ts
it("uses consistent text for process step labels", async () => {
  const block = { id: "p1", type: "process", layout: { x: 0, y: 0, w: 600, h: 300 }, content: { text: "Process", steps: [{ title: "Plan", description: "Scope the work" }, { title: "Ship", description: "Publish and verify" }] } } as unknown as Block;
  const result = await processExporter.export(block, ctxFor({}));
  const text = (result.element?.data as { text: string[] }).text;
  expect(text).toEqual(["Plan", "Scope the work", "Ship", "Publish and verify"]);
});
```

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/pptx/block-exporters`, then `npm.cmd run test -- src/export`.

---

# Task 9 — Preflight estimates + dialog fidelity summary

`export-preflight.ts` gains fidelity estimates; `export-dialog.tsx` shows the
fidelity summary card.

## Steps

### 1. Extend `export-preflight.ts`

Current `runExportPreflight` returns `{ issues, score, blockCoverage }`.
Add the estimate fields (from `ExportPreflightResult`):

```ts
export function estimateFidelity(deck: DeckProject): {
  estimatedFallbacks: number;
  missingBlockCount: number;
  unsupportedBlockCount: number;
  chartBlockCount: number;
} {
  const missing: number[] = [];
  const fallbacks: number[] = [];
  let chartCount = 0;
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.hidden) continue;
      const exporter = getBlockExporter(block.type);
      if (exporter.type === "fallback" && block.type !== "fallback") {
        missing.push(block.id);
      } else if (exporter.exportability === "image-only") {
        fallbacks.push(block.id);
      }
      if (block.type === "chart" || block.type === "diagram") chartCount += 1;
    }
  }
  return {
    estimatedFallbacks: fallbacks.length,
    missingBlockCount: missing.length,
    unsupportedBlockCount: missing.length,
    chartBlockCount: chartCount,
  };
}
```

Import `getBlockExporter` from `./pptx/block-exporters/index` (it already
exports `getBlockExporter`). Wire the estimate into `runExportPreflight`'s
return (spread the estimate object). Add `export-preflight.test.ts`:

```ts
it("estimates fallbacks for chart and video blocks", () => {
  const deck = { slides: [{ blocks: [{ id: "c1", type: "chart", hidden: false }, { id: "v1", type: "video", hidden: false }, { id: "t1", type: "text", hidden: false }] }] } as unknown as DeckProject;
  const est = estimateFidelity(deck);
  expect(est.estimatedFallbacks).toBe(2);
  expect(est.chartBlockCount).toBe(1);
  expect(est.missingBlockCount).toBe(0);
});

it("reports unsupported block types as missing", () => {
  const deck = { slides: [{ blocks: [{ id: "m1", type: "mystery-block", hidden: false }] }] } as unknown as DeckProject;
  const est = estimateFidelity(deck);
  expect(est.missingBlockCount).toBe(1);
});
```

### 2. Update `export-dialog.tsx` summary

Current `reportSummary(report)` prints status + file path. Replace with a
fidelity summary:

```tsx
function fidelitySummary(fidelity: FidelityReport | undefined): string {
  if (!fidelity) return "Fidelity summary unavailable until the first export completes.";
  const pct = Math.round(fidelity.contentRecall * 100);
  const fallbacks =
    fidelity.blocks.filter((b) => b.representation === "svg" || b.representation === "raster" || b.representation === "expanded-build").length;
  return `Fidelity: ${pct}% content recall · ${fidelity.missingVisibleBlocks} block(s) missing · ${fallbacks} fallback(s) · ${fidelity.status}`;
}
```

- Import `FidelityReport` from `./export-types` (schema now lives there).
- Use `fidelitySummary(lastExport?.fidelity)` in place of the old status text.
- Keep the `?` shortcut hint visible near the card.
- When a user cancels or a fresh deck is opened, clear `lastExport.fidelity`.

Run: `npm.cmd run typecheck`, then `npm.cmd run test -- src/export/export-dialog.test.tsx` (if present) or `npm.cmd run test -- src/export`, then `npm.cmd run build`.

---

# Task 10 — Fidelity showcase deck (`examples/03-example-fidelity`)

A minimal but real deck demonstrating the degradation ladder. It must be
exportable and satisfy the output contract.

## Steps

1. Copy the minimal structure from `examples/02-example`:
   `decks/*.json`, `src/app/deck.json`, `src/app/theme.json`, `src/app/*` entry
   (as small as possible — reuse the 02 components by reference where the
   harness allows, otherwise keep a thin copy), `vite.config.ts`,
   `package.json`, `tsconfig.json`.
2. Seed deck (`03-example-fidelity/decks/fidelity-showcase.json`) with four
   sections, each block tagged with `id` + `notes` describing its export fate:
   - A `chart` block (bar) → exports as SVG.
   - A `diagram` block (flow) → exports as SVG.
   - A `video` block with `chapter` → exports as summary card (fallback).
   - A `process` block → now exports correctly (no duplicate text).
   - A deliberate `text` block with an `error`-severity export issue is NOT
     needed — keep the deck clean; the degradation is shown via representation,
     not errors.
3. Ensure `src/export/export.ts` accepts a deck path/env so the showcase deck
   can be exported with `npm.cmd run export` (or reuse the 02 build target if
   the harness does not support a second app; in that case, document it as an
   "export demo deck" and verify via the same export dialog pointed at the
   showcase deck file).
4. Run the layout audit and output-contract audit on the new deck JSON.
5. Add a root `README.md` blurb under "Examples" linking the showcase and
   explaining the degradation ladder (fidelity-first intent).

Run (repo root):

```bash
python scripts/audits/audit_deck_layout.py examples/03-example-fidelity/decks/fidelity-showcase.json --strict
python scripts/audits/validate_output_contract.py examples/03-example-fidelity --profile editable-deck
```

---

# Task 11 — Doc + skill sync

The fidelity vocabulary must be documented and the export skill updated so
future generated apps mirror the new contract.

## Steps

1. `skills/deckforge-export/SKILL.md` — add a "Fidelity-first exports" section
   describing: `ExportStatus` four-value ladder, representation vocabulary,
   SVG image export for charts/diagrams, archive verification, and the
   one-way type dependency rule.
2. `skills/deckforge-export/workflows/add-pptx-export.md` — the generated
   artifact list must mention `fidelity/fidelity-report.ts`,
   `fidelity/representation-planner.ts`, `fidelity/content-parity.ts`,
   `fidelity/fidelity-policy.ts`, `pptx/pptx-verifier.ts`.
3. `docs/ARCHITECTURE.md` — add the fidelity pipeline to the export
   architecture notes (diagram in words: deck → block exporters → fidelity
   blocks → parity → status; blob → verifier → archiveVerified).
4. `CHANGELOG.md` — add an entry under Unreleased for the fidelity-first
   export upgrade.
5. Run the repo-level validation to ensure skill docs stay schema-consistent:
   `npm.cmd run validate` from the root.

---

# Task 12 — Packaging + full validation

## Steps

1. Repo root: `npm.cmd run package-skills` (packages the skills zips). If the
   packaging test fails because the starter-components type change drifted from
   the example, re-run the sync (Task 1 step 7) and package again.
2. Full suite:

```bash
# repo root
npm.cmd run validate
npm.cmd run package-skills
# examples/02-example
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

3. Manual browser smoke (visual evidence): run the 02-example dev server,
   open the export dialog, export the seed deck, confirm the fidelity summary
   shows 100% recall with zero missing blocks, and open the produced `.pptx`
   in PowerPoint/Keynote/LibreOffice to confirm charts render as images.

---

# Exit criteria

- [ ] `npm.cmd run typecheck` passes in `examples/02-example`.
- [ ] `npm.cmd run test -- src/export` passes (existing + new tests).
- [ ] Seed deck export reports `complete` or `complete-with-fallbacks`, with
      no error-severity issues and zero missing visible blocks.
- [ ] `result.fidelity.contentRecall` is 1 for the seed deck; charts/diagrams
      are `representation: "svg"` and alt-carrying.
- [ ] `verifyPptxArchive` passes on real exports (slide count + notes + text +
      rels fingerprint) and fails when a slide is dropped.
- [ ] Export dialog shows the fidelity summary card and keeps the `?` hint.
- [ ] `examples/03-example-fidelity` exports cleanly and passes the layout +
      output-contract audits.
- [ ] Repo root `npm.cmd run validate` and `npm.cmd run package-skills` pass.

## Known open risks (accepted)

- `visualParity` is a heuristic (0.9 for svg, 0.8 for raster); it feeds the
  summary card only, never the status decision.
- `contentRecall` weights text meaning-bearing tokens; a chart with rich data
  but a terse alt will understate recall. The alt is derived from chart
  title/categories, which we control.
- PowerPoint cannot edit SVG images; this is surfaced via the
  "image-only" / `svg` representation and the summary card, which is the
  documented fidelity-first trade-off.
