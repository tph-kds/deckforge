// export/export-preflight.ts

import type {
  ExportCoverage,
  ExportIssue,
  ExportPreflightResult,
  PptxExportConfig,
  PreflightGroupSummary,
} from "./export-types";
import type { Block, DeckProject } from "../deck/types";
import { collectFontWarnings } from "./pptx/pptx-fonts";
import { getBlockExporter } from "./pptx/block-exporters/index";
import { resolveDeckScenes } from "../deck/geometry-resolver";
import { validateRectWithinSlide } from "./geometry";

const NATIVE_BLOCK_TYPES = new Set([
  "text",
  "heading",
  "bullets",
  "callout",
  "citation",
  "metric",
  "process",
  "image",
  "shape",
  "table",
  "chart",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function calculateScore(issues: ExportIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 20;
    else if (issue.severity === "warning") score -= 5;
    else score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

function calculateBlockCoverage(deck: DeckProject): number {
  const blocks = deck.slides.flatMap((slide) => slide.blocks);
  if (blocks.length === 0) return 1;

  const nativeCount = blocks.filter((block) => NATIVE_BLOCK_TYPES.has(block.type)).length;
  return nativeCount / blocks.length;
}

function visibleBlocks(deck: DeckProject): Block[] {
  return deck.slides
    .filter((slide) => !slide.hidden)
    .flatMap((slide) => slide.blocks)
    .filter((block) => !block.hidden);
}

function calculateParityEstimates(deck: DeckProject): {
  estimatedRecall: number;
  estimatedFallbacks: number;
  estimatedMissing: number;
} {
  const visible = visibleBlocks(deck);
  if (visible.length === 0) {
    return { estimatedRecall: 1, estimatedFallbacks: 0, estimatedMissing: 0 };
  }

  let fallbacks = 0;
  let missing = 0;
  for (const block of visible) {
    const exporter = getBlockExporter(block.type);
    if (exporter.type === "fallback" && block.type !== "fallback") {
      missing += 1;
    } else if (exporter.exportability === "image-only") {
      fallbacks += 1;
    }
  }
  const preserved = visible.length - missing;
  return {
    estimatedRecall: preserved / visible.length,
    estimatedFallbacks: fallbacks,
    estimatedMissing: missing,
  };
}

/**
 * Compute the coverage invariants (expected == native + fallback, missing == 0)
 * over the RESOLVED scene. `missing` combines exporter-level omissions with
 * visible blocks whose canonical frame could not be resolved, so a deck whose
 * geometry pipeline fails can never look "ready".
 */
function calculateCoverage(
  deck: DeckProject,
  geometryMissing: number,
): ExportCoverage {
  const visible = visibleBlocks(deck);
  const expected = visible.length;

  let native = 0;
  let fallback = 0;
  let unexportable = 0;
  for (const block of visible) {
    const exporter = getBlockExporter(block.type);
    if (exporter.type === "fallback" && block.type !== "fallback") {
      unexportable += 1;
      continue;
    }
    if (exporter.exportability === "image-only") {
      fallback += 1;
    } else {
      native += 1;
    }
  }

  const missing = unexportable + geometryMissing;
  return {
    expected,
    native,
    fallback,
    missing,
    satisfied: missing === 0 && expected === native + fallback + unexportable,
  };
}

const GROUP_BY_CODE: Record<string, "geometry" | "assets" | "content" | "structural"> = {
  "invalid-geometry": "geometry",
  "aspect-mismatch": "geometry",
  "template-chart-leak": "geometry",
  "image-load-failed": "assets",
  "unresolved-image": "assets",
  "external-asset": "assets",
  "missing-speaker-notes": "content",
  "oversized-content": "content",
  "template-chart-skipped": "content",
  "chart-no-data": "content",
  "empty-table": "content",
  "no-fallback-produced": "content",
  "block-hidden-skipped": "content",
  "hidden-slide-skipped": "content",
  "font-substitution": "structural",
  "missing-font": "structural",
  "unsupported-block-type": "structural",
  "unsupported-block": "structural",
  "unsupported-css-effect": "structural",
  "block-export-failed": "structural",
  "archive-verification-failed": "structural",
  "duplicate-element-id": "structural",
};

const GROUP_LABELS: Record<string, string> = {
  geometry: "Geometry",
  assets: "Assets",
  content: "Content",
  structural: "Structural",
};

function groupOfIssue(issue: ExportIssue): "geometry" | "assets" | "content" | "structural" {
  return GROUP_BY_CODE[issue.code] ?? "structural";
}

function groupPreflightIssues(issues: ExportIssue[]): PreflightGroupSummary[] {
  const order: Array<"geometry" | "assets" | "content" | "structural"> = [
    "geometry",
    "assets",
    "content",
    "structural",
  ];
  return order
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      count: issues.filter((issue) => groupOfIssue(issue) === group).length,
      issues: issues.filter((issue) => groupOfIssue(issue) === group),
    }))
    .filter((summary) => summary.count > 0);
}

/**
 * Run a geometry-aware preflight. Unlike the legacy heuristic, this resolves
 * the canonical geometry of every slide first, so "Ready to export" is only
 * ever shown when every visible block has a resolvable frame and no content is
 * estimated to be missing.
 */
export async function runExportPreflight(
  deck: DeckProject,
  config: PptxExportConfig
): Promise<ExportPreflightResult> {
  const issues: ExportIssue[] = [];

  const fontWarnings = collectFontWarnings(deck);
  for (const fw of fontWarnings) {
    issues.push({
      severity: "warning",
      code: "font-substitution",
      slideId: fw.slideId,
      blockId: fw.blockId,
      message: `Font "${fw.fontFamily}" may be substituted with ${fw.substituteFont}`,
      suggestedFix: `Use a PPTX-safe font like ${fw.substituteFont}`,
      automaticFixAvailable: false,
    });
  }

  // Phase 16: resolve canonical geometry up-front. A visible block with no
  // usable frame is an error that must block export (never (0,0) placement).
  const scenes = resolveDeckScenes(deck);
  let geometryMissing = 0;
  for (const slide of deck.slides) {
    const scene = scenes.get(slide.id);
    if (!scene) continue;

    for (const missing of scene.missingFrames) {
      geometryMissing += 1;
      const diagnostics = [
        `blockType: ${missing.block.type}`,
        `positionMode: ${missing.block.positionMode ?? "slot"}`,
        `slotId: ${missing.slotId ?? "(none)"}`,
        `layoutId: ${slide.layout}`,
        `state: ${missing.state}`,
      ];
      issues.push({
        severity: "error",
        code: "invalid-geometry",
        slideId: slide.id,
        blockId: missing.blockId,
        message: `${missing.reason}; export would fail (a resolved frame is required)`,
        note: diagnostics.join(" · "),
        suggestedFix: "Bind the block to a slot in the editor, or give it a frame",
        automaticFixAvailable: false,
      });
    }

    for (const entry of scene.blocks) {
      const boundsErrors = validateRectWithinSlide(
        entry.frame,
        deck.canvas.width ?? 1600,
        deck.canvas.height ?? 900,
      );
      if (boundsErrors.length) {
        issues.push({
          severity: "error",
          code: "invalid-geometry",
          slideId: slide.id,
          blockId: entry.blockId,
          message: `Block "${entry.blockId}" resolves to out-of-bounds geometry: ${boundsErrors.join("; ")}`,
          note: [
            `blockType: ${entry.block.type}`,
            `positionMode: ${entry.block.positionMode ?? "slot"}`,
            `slotId: ${entry.slotId ?? "(none)"}`,
            `layoutId: ${slide.layout}`,
            `frame source: ${entry.resolutionSource}`,
            `frame: {x:${entry.frame.x}, y:${entry.frame.y}, w:${entry.frame.w}, h:${entry.frame.h}}`,
          ].join(" · "),
          suggestedFix: "Fix the layout contract or move the block into the canvas",
          automaticFixAvailable: false,
        });
      }
    }
  }

  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      const record = asRecord(block);
      const blockType = block.type;

      if (!NATIVE_BLOCK_TYPES.has(blockType)) {
        issues.push({
          severity: "warning",
          code: "unsupported-block-type",
          slideId: slide.id,
          blockId: block.id,
          message: `Block type "${blockType}" cannot be exported natively; it will be rasterized, substituted, or omitted`,
          suggestedFix: "Convert to a supported block type for native export",
          automaticFixAvailable: false,
        });
      }

      if (typeof record.cssFilter === "string" && record.cssFilter.includes("blur")) {
        issues.push({
          severity: "warning",
          code: "unsupported-css-effect",
          slideId: slide.id,
          blockId: block.id,
          message: "CSS filter effects may not transfer to PowerPoint",
          suggestedFix: "Remove blur filter or accept image fallback",
          automaticFixAvailable: false,
        });
      }

      if (typeof record.src === "string" && record.src.startsWith("http") && !record.src.startsWith("data:")) {
        issues.push({
          severity: "info",
          code: "external-asset",
          slideId: slide.id,
          blockId: block.id,
          message: "External asset will be embedded in the export",
          suggestedFix: undefined,
          automaticFixAvailable: false,
        });
      }
    }

    if (config.includeSpeakerNotes && !slide.speakerNotes) {
      issues.push({
        severity: "info",
        code: "missing-speaker-notes",
        slideId: slide.id,
        message: "Slide has no speaker notes",
        suggestedFix: "Add speaker notes for better presenter experience",
        automaticFixAvailable: false,
      });
    }
  }

  const score = calculateScore(issues);
  const blockCoverage = calculateBlockCoverage(deck);
  const estimates = calculateParityEstimates(deck);
  const coverage = calculateCoverage(deck, geometryMissing);

  const visible = visibleBlocks(deck);
  const hasErrors = issues.some((issue) => issue.severity === "error");

  return {
    issues,
    score,
    blockCoverage,
    ...estimates,
    missingBlockCount: estimates.estimatedMissing,
    unsupportedBlockCount: estimates.estimatedMissing,
    chartBlockCount: visible.filter((block) => block.type === "chart").length,
    ready: !hasErrors && estimates.estimatedMissing === 0 && geometryMissing === 0,
    geometryMissingCount: geometryMissing,
    visibleBlockCount: visible.length,
    coverage,
    groups: groupPreflightIssues(issues),
  };
}
