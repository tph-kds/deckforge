// export/export-preflight.ts
//
// Export preflight validation that ensures all blocks are properly resolved
// before export. This prevents:
// - Hidden/stale/template blocks from being exported
// - Missing chart data
// - Missing image assets
// - Geometry errors
// - Duplicate block exports
//
// Preflight operates on the output of the single `prepareExport` phase: it
// consumes the prepared snapshots and the canonical asset registry, so
// "Ready to export" is only ever reported when every required visible image
// actually resolved to embeddable bytes. No network work happens here.

import type { DeckProject } from "../deck/types";
import type {
  ExportIssue,
  ExportPreflightResult,
  ExportCoverage,
  PreflightGroupSummary,
  PptxExportConfig,
} from "./export-types";
import { DEFAULT_PPTX_CONFIG } from "./export-types";
import type { ImmutableSlideSnapshot, ResolvedBlockSnapshot } from "./snapshot";
import { hashSlideSemanticContent } from "./snapshot";
import { prepareExport, isPreparedExport, type PreparedExport } from "./prepare-export";
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
 * Classify an image block against the resolved asset registry and report the
 * issues that block (or constrain) an export.
 *
 *   ready        → native (resolved to embeddable bytes in preparation)
 *   failed       → Fidelity First: missing + blocking error
 *                  Editability First: fallback + warning (placeholder embedded)
 *   no snapshot  → placeholder block (no source): fallback + info
 */
function classifyImageBlock(
  block: ResolvedBlockSnapshot,
  slideId: string,
  config: PptxExportConfig,
): { representation: "native" | "fallback" | "missing"; issues: ExportIssue[] } {
  const as = block.assetSnapshot;

  if (!as) {
    return {
      representation: "fallback",
      issues: [
        {
          code: "image-load-failed",
          severity: "info",
          slideId,
          blockId: block.id,
          message: `Image block "${block.id}" has no image source; a bundled placeholder raster will be embedded`,
          suggestedFix: "Attach a local asset to the image block or use a data: URL",
          automaticFixAvailable: true,
        },
      ],
    };
  }

  if (as.status === "ready") {
    return { representation: "native", issues: [] };
  }

  const reason =
    as.error ??
    (as.resolvedSrc ? `image "${as.resolvedSrc}" could not be resolved` : "no resolvable source");

  if (config.mode === "fidelity-first") {
    return {
      representation: "missing",
      issues: [
        {
          code: "unresolved-image",
          severity: "error",
          slideId,
          blockId: block.id,
          message: `Image block "${block.id}" cannot be embedded in the PPTX: ${reason}`,
          suggestedFix: "Fix the image URL or attach a local/data: asset so the image can be embedded offline",
          automaticFixAvailable: false,
        },
      ],
    };
  }

  return {
    representation: "fallback",
    issues: [
      {
        code: "image-load-failed",
        severity: "warning",
        slideId,
        blockId: block.id,
        message: `Image block "${block.id}" cannot be embedded: ${reason}; a bundled placeholder raster will be embedded in its place`,
        suggestedFix: "Fix the image URL or attach a local/data: asset so the image can be embedded offline",
        automaticFixAvailable: false,
      },
    ],
  };
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
 * Run export preflight validation on a prepared export.
 *
 * Pass the result of `prepareExport` so the preflight, fidelity accounting and
 * the PPTX exporter all reason about the SAME resolved assets. For backward
 * compatibility a raw `DeckProject` is prepared on the fly (this still
 * resolves assets exactly once, inside that preparation).
 */
export async function runExportPreflight(
  input: PreparedExport | DeckProject,
  config?: PptxExportConfig
): Promise<ExportPreflightResult> {
  const prepared: PreparedExport = isPreparedExport(input)
    ? input
    : await prepareExport(input, config ?? DEFAULT_PPTX_CONFIG);

  const issues: ExportIssue[] = [];

  let chartBlockCount = 0;
  let geometryMissingCount = 0;

  // Parity/coverage tallies over all visible blocks (fractions per contract).
  let visibleCount = 0;
  let nativeCount = 0;
  let fallbackCount = 0;
  let missingCount = 0;

  for (const snapshot of prepared.slides) {
    const rawSlide = prepared.deck.slides.find((slide) => slide.id === snapshot.slideId);
    if (!rawSlide) continue;

    // Validate each block that made it into the canonical snapshot.
    for (const block of snapshot.blocks) {
      visibleCount++;

      if (block.type === "chart") chartBlockCount++;

      issues.push(...validateBlockVisibility(block, snapshot.slideId));
      issues.push(...validateChartBlock(block, snapshot.slideId));
      issues.push(...validateBlockGeometry(block, snapshot.slideId));

      if (block.type === "image") {
        const classification = classifyImageBlock(block, snapshot.slideId, prepared.config);
        issues.push(...classification.issues);
        if (classification.representation === "native") nativeCount++;
        else if (classification.representation === "fallback") fallbackCount++;
        else missingCount++;
        continue;
      }

      const exporter = getBlockExporter(block.type);
      if (exporter.type === "fallback" && block.type !== "fallback") {
        issues.push({
          code: "unsupported-block-type",
          severity: "warning",
          slideId: snapshot.slideId,
          blockId: block.id,
          message: `Block type "${block.type}" cannot be exported natively; it will be rasterized, substituted, or omitted`,
          suggestedFix: "Convert to a supported block type for native export",
          automaticFixAvailable: false,
        });
        missingCount++;
        continue;
      }
      if (exporter.exportability === "image-only") {
        fallbackCount++;
      } else {
        nativeCount++;
      }
    }

    issues.push(...validateNoDuplicateBlockIds(snapshot));

    // Fail closed on geometry: any visible raw block missing from the canonical
    // snapshot has no resolvable frame and cannot be exported.
    const snapshotBlockIds = new Set(snapshot.blocks.map((block) => block.id));
    for (const block of rawSlide.blocks) {
      if (block.hidden) continue;
      if (snapshotBlockIds.has(block.id)) continue;
      geometryMissingCount++;
      visibleCount++;
      issues.push({
        code: "invalid-geometry",
        severity: "error",
        slideId: rawSlide.id,
        blockId: block.id,
        message: `Block "${block.id}" (${block.type}) has no resolvable frame and cannot be exported`,
        suggestedFix: "Bind the block to a layout slot or give it an explicit frame",
        automaticFixAvailable: true,
      });
    }
  }

  // Check for errors
  const hasErrors = issues.some((issue) => issue.severity === "error");

  // Parity estimates are 0..1 fractions, not percentages (exported contract).
  const estimatedMissing = missingCount;
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
      count: issues.filter((i) => i.code === "unresolved-image" || i.code === "image-load-failed").length,
      issues: issues.filter((i) => i.code === "unresolved-image" || i.code === "image-load-failed"),
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
        i.code === "duplicate-element-id" ||
        i.code === "unsupported-block-type"
      ).length,
      issues: issues.filter((i) =>
        i.code === "block-hidden-skipped" ||
        i.code === "duplicate-element-id" ||
        i.code === "unsupported-block-type"
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