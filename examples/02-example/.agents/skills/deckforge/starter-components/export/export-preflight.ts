// export/export-preflight.ts

import type {
  ExportPreflightResult,
  ExportIssue,
  PptxExportConfig,
} from "./export-types";
import type { DeckProject } from "../deck-types";
import { collectFontWarnings } from "./pptx/pptx-fonts";
import { getBlockExporter } from "./pptx/block-exporters/index";

const NATIVE_BLOCK_TYPES = new Set([
  "text",
  "heading",
  "bullets",
  "callout",
  "citation",
  "metric",
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

function calculateParityEstimates(deck: DeckProject): {
  estimatedRecall: number;
  estimatedFallbacks: number;
  estimatedMissing: number;
} {
  const visible = deck.slides
    .filter((slide) => !slide.hidden)
    .flatMap((slide) => slide.blocks)
    .filter((block) => !block.hidden);
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

  const visible = deck.slides
    .filter((slide) => !slide.hidden)
    .flatMap((slide) => slide.blocks)
    .filter((block) => !block.hidden);

  return {
    issues,
    score,
    blockCoverage,
    ...estimates,
    missingBlockCount: estimates.estimatedMissing,
    unsupportedBlockCount: estimates.estimatedMissing,
    chartBlockCount: visible.filter((block) => block.type === "chart").length,
  };
}
