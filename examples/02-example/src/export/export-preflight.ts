// export/export-preflight.ts
//
// Export preflight validation that ensures all blocks are properly resolved
// before export. This prevents:
// - Hidden/stale/template blocks from being exported
// - Missing chart data
// - Missing image assets
// - Geometry errors
// - Duplicate block exports

import type { DeckProject, DeckSlide, Block, ChartContent } from "../deck/types";
import type {
  ExportIssue,
  ExportPreflightResult,
  ExportCoverage,
  PreflightGroupSummary,
  PptxExportConfig,
} from "./export-types";
import type { ImmutableSlideSnapshot, ResolvedBlockSnapshot } from "./snapshot";
import { resolveSlideSnapshot, validateSnapshot, hashSlideSemanticContent } from "./snapshot";
import { resolveSlideGeometry } from "../deck/geometry-resolver";
import { getBlockExporter } from "./pptx/block-exporters/index";

// ─── Preflight Scoring ───────────────────────────────────────────────────────

function calculateScore(issues: ExportIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 20;
    else if (issue.severity === "warning") score -= 5;
    else score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Preflight Issue Codes ───────────────────────────────────────────────────

export type PreflightIssueCode =
  | "hidden-block-included"
  | "template-chart-included"
  | "missing-chart-data"
  | "missing-image-asset"
  | "geometry-missing"
  | "duplicate-block-id"
  | "block-type-unsupported"
  | "snapshot-validation-failed"
  | "content-parity-mismatch";

// ─── Preflight Validators ────────────────────────────────────────────────────

/**
 * Validate that a snapshot contains no hidden/stale/template blocks.
 */
function validateBlockVisibility(
  block: ResolvedBlockSnapshot,
  slideId: string
): ExportIssue[] {
  const issues: ExportIssue[] = [];

  if (block.visibility === "hidden") {
    issues.push({
      code: "block-hidden-skipped",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" is hidden but included in snapshot`,
      automaticFixAvailable: true,
    });
  }

  if (block.editorOnly) {
    issues.push({
      code: "block-hidden-skipped",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" is editor-only but included in snapshot`,
      automaticFixAvailable: true,
    });
  }

  if (block.deleted) {
    issues.push({
      code: "block-hidden-skipped",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" is deleted but included in snapshot`,
      automaticFixAvailable: true,
    });
  }

  if (block.temporary) {
    issues.push({
      code: "block-hidden-skipped",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" is temporary but included in snapshot`,
      automaticFixAvailable: true,
    });
  }

  if (block.placeholder) {
    issues.push({
      code: "block-hidden-skipped",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" is placeholder but included in snapshot`,
      automaticFixAvailable: true,
    });
  }

  return issues;
}

/**
 * Validate chart blocks have required data.
 */
function validateChartBlock(
  block: ResolvedBlockSnapshot,
  slideId: string
): ExportIssue[] {
  const issues: ExportIssue[] = [];

  if (block.type !== "chart") return issues;

  if (!block.chartSpec) {
    issues.push({
      code: "chart-no-data",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Chart block "${block.id}" has no resolved chart spec`,
      suggestedFix: "Add data values to the chart",
      automaticFixAvailable: false,
    });
    return issues;
  }

  if (block.chartSpec.categories.length === 0) {
    issues.push({
      code: "chart-no-data",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Chart block "${block.id}" has no categories`,
      suggestedFix: "Add category labels to the chart",
      automaticFixAvailable: false,
    });
  }

  if (block.chartSpec.series.length === 0 || block.chartSpec.series[0].values.length === 0) {
    issues.push({
      code: "chart-no-data",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Chart block "${block.id}" has no series data`,
      suggestedFix: "Add data values to the chart",
      automaticFixAvailable: false,
    });
  }

  return issues;
}

/**
 * Validate image blocks have resolved assets.
 */
function validateImageBlock(
  block: ResolvedBlockSnapshot,
  slideId: string
): ExportIssue[] {
  const issues: ExportIssue[] = [];

  if (block.type !== "image") return issues;

  if (!block.assetSnapshot) {
    issues.push({
      code: "unresolved-image",
      severity: "warning",
      slideId,
      blockId: block.id,
      message: `Image block "${block.id}" has no resolved asset`,
      suggestedFix: "Add a valid image asset to the block",
      automaticFixAvailable: false,
    });
  }

  return issues;
}

/**
 * Validate geometry for all blocks.
 */
function validateBlockGeometry(
  block: ResolvedBlockSnapshot,
  slideId: string
): ExportIssue[] {
  const issues: ExportIssue[] = [];

  if (!block.frame) {
    issues.push({
      code: "invalid-geometry",
      severity: "error",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" has no geometry`,
      automaticFixAvailable: false,
    });
    return issues;
  }

  const { x, y, w, h } = block.frame;
  if (w <= 0 || h <= 0) {
    issues.push({
      code: "invalid-geometry",
      severity: "error",
      slideId,
      blockId: block.id,
      message: `Block "${block.id}" has invalid dimensions (${w}x${h})`,
      automaticFixAvailable: false,
    });
  }

  return issues;
}

/**
 * Validate no duplicate block IDs in a snapshot.
 */
function validateNoDuplicateBlockIds(
  snapshot: ImmutableSlideSnapshot
): ExportIssue[] {
  const issues: ExportIssue[] = [];
  const seenIds = new Set<string>();

  for (const block of snapshot.blocks) {
    if (seenIds.has(block.id)) {
      issues.push({
        code: "duplicate-element-id",
        severity: "warning",
        slideId: snapshot.slideId,
        blockId: block.id,
        message: `Block "${block.id}" is duplicated in slide "${snapshot.slideId}"`,
        automaticFixAvailable: false,
      });
    }
    seenIds.add(block.id);
  }

  return issues;
}

// ─── Main Preflight Function ─────────────────────────────────────────────────

/**
 * Run export preflight validation on a deck.
 * This must be called before export to ensure all blocks are properly resolved.
 */
export function runExportPreflight(
  deck: DeckProject,
  _config?: PptxExportConfig
): ExportPreflightResult {
  const issues: ExportIssue[] = [];
  const snapshots: ImmutableSlideSnapshot[] = [];

  let chartBlockCount = 0;
  let geometryMissingCount = 0;

  // Parity/coverage tallies over all visible blocks (fractions per contract).
  let visibleCount = 0;
  let nativeCount = 0;
  let fallbackCount = 0;
  let unexportableCount = 0;

  for (const slide of deck.slides) {
    // Skip hidden slides
    if (slide.hidden) continue;

    // Canonical geometry: fail closed when a visible block has no frame.
    const scene = resolveSlideGeometry(slide, deck.canvas);
    geometryMissingCount += scene.missingFrames.length;
    for (const missing of scene.missingFrames) {
      issues.push({
        code: "invalid-geometry",
        severity: "error",
        slideId: slide.id,
        blockId: missing.blockId,
        message: `Block "${missing.blockId}" (${missing.block.type}) has no resolvable frame and cannot be exported`,
        suggestedFix: "Bind the block to a layout slot or give it an explicit frame",
        automaticFixAvailable: true,
      });
    }

    // Create snapshot
    const snapshot = resolveSlideSnapshot(slide, deck);

    // Validate snapshot structure
    const snapshotIssues = validateSnapshot(snapshot);
    for (const message of snapshotIssues) {
      issues.push({
        code: "block-export-failed",
        severity: "warning",
        slideId: slide.id,
        message,
        automaticFixAvailable: false,
      });
    }

    // Validate each block
    for (const block of snapshot.blocks) {
      if (block.type === "chart") chartBlockCount++;

      // Validate visibility
      issues.push(...validateBlockVisibility(block, slide.id));

      // Validate chart blocks
      issues.push(...validateChartBlock(block, slide.id));

      // Validate image blocks
      issues.push(...validateImageBlock(block, slide.id));

      // Validate geometry
      issues.push(...validateBlockGeometry(block, slide.id));
    }

    // Validate no duplicate block IDs
    issues.push(...validateNoDuplicateBlockIds(snapshot));

    snapshots.push(snapshot);

    // Parity + coverage classification over visible blocks. Blocks with no
    // native exporter are counted as missing AND flagged with an issue so the
    // export is never a silent omission.
    for (const block of slide.blocks) {
      if (block.hidden) continue;
      visibleCount++;
      const exporter = getBlockExporter(block.type);
      if (exporter.type === "fallback" && block.type !== "fallback") {
        issues.push({
          code: "unsupported-block-type",
          severity: "warning",
          slideId: slide.id,
          blockId: block.id,
          message: `Block type "${block.type}" cannot be exported natively; it will be rasterized, substituted, or omitted`,
          suggestedFix: "Convert to a supported block type for native export",
          automaticFixAvailable: false,
        });
        unexportableCount++;
        continue;
      }
      if (exporter.exportability === "image-only") {
        fallbackCount++;
      } else {
        nativeCount++;
      }
    }
  }

  // Check for errors
  const hasErrors = issues.some((issue) => issue.severity === "error");

  // Parity estimates are 0..1 fractions, not percentages (exported contract).
  const estimatedMissing = unexportableCount;
  const estimatedFallbacks = fallbackCount;
  const estimatedRecall =
    visibleCount > 0 ? (visibleCount - estimatedMissing) / visibleCount : 1;

  // Coverage invariants: expected == native + fallback and missing == 0.
  const coverage: ExportCoverage = {
    expected: visibleCount,
    native: nativeCount,
    fallback: fallbackCount,
    missing: estimatedMissing + geometryMissingCount,
    satisfied: estimatedMissing === 0 && geometryMissingCount === 0,
  };

  // Group issues by category
  const groups: PreflightGroupSummary[] = [
    {
      group: "geometry",
      label: "Geometry",
      count: issues.filter((i) => i.code === "invalid-geometry").length,
      issues: issues.filter((i) => i.code === "invalid-geometry"),
    },
    {
      group: "assets",
      label: "Assets",
      count: issues.filter((i) => i.code === "unresolved-image").length,
      issues: issues.filter((i) => i.code === "unresolved-image"),
    },
    {
      group: "content",
      label: "Content",
      count: issues.filter((i) => i.code === "chart-no-data").length,
      issues: issues.filter((i) => i.code === "chart-no-data"),
    },
    {
      group: "structural",
      label: "Structural",
      count: issues.filter((i) =>
        i.code === "block-hidden-skipped" ||
        i.code === "duplicate-element-id"
      ).length,
      issues: issues.filter((i) =>
        i.code === "block-hidden-skipped" ||
        i.code === "duplicate-element-id"
      ),
    },
  ];

  return {
    issues,
    score: calculateScore(issues),
    blockCoverage: visibleCount > 0 ? nativeCount / visibleCount : 1,
    estimatedFallbacks,
    estimatedRecall,
    estimatedMissing,
    missingBlockCount: estimatedMissing,
    unsupportedBlockCount: estimatedMissing,
    chartBlockCount,
    ready: !hasErrors && estimatedMissing === 0 && geometryMissingCount === 0,
    geometryMissingCount,
    visibleBlockCount: visibleCount,
    coverage,
    groups,
  };
}

/**
 * Compare two snapshots for content parity.
 * Used to validate that web and export have the same content.
 */
export function compareSnapshots(
  webSnapshot: ImmutableSlideSnapshot,
  exportSnapshot: ImmutableSlideSnapshot
): {
  match: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  // Compare slide IDs
  if (webSnapshot.slideId !== exportSnapshot.slideId) {
    differences.push(`Slide ID mismatch: ${webSnapshot.slideId} vs ${exportSnapshot.slideId}`);
  }

  // Compare block count
  if (webSnapshot.blocks.length !== exportSnapshot.blocks.length) {
    differences.push(
      `Block count mismatch: ${webSnapshot.blocks.length} vs ${exportSnapshot.blocks.length}`
    );
  }

  // Compare block IDs
  const webBlockIds = webSnapshot.blocks.map((b) => b.id).sort();
  const exportBlockIds = exportSnapshot.blocks.map((b) => b.id).sort();
  if (JSON.stringify(webBlockIds) !== JSON.stringify(exportBlockIds)) {
    differences.push(`Block IDs mismatch: ${webBlockIds.join(",")} vs ${exportBlockIds.join(",")}`);
  }

  // Compare block types
  for (const webBlock of webSnapshot.blocks) {
    const exportBlock = exportSnapshot.blocks.find((b) => b.id === webBlock.id);
    if (!exportBlock) {
      differences.push(`Block ${webBlock.id} missing in export snapshot`);
      continue;
    }

    if (webBlock.type !== exportBlock.type) {
      differences.push(
        `Block ${webBlock.id} type mismatch: ${webBlock.type} vs ${exportBlock.type}`
      );
    }
  }

  // Compare semantic content
  const webHash = hashSlideSemanticContent(webSnapshot);
  const exportHash = hashSlideSemanticContent(exportSnapshot);
  if (webHash !== exportHash) {
    differences.push(`Semantic content mismatch`);
  }

  return {
    match: differences.length === 0,
    differences,
  };
}
