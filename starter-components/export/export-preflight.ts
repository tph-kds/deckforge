// starter-components/export/export-preflight.ts

import type {
  ExportPreflightResult,
  ExportIssue,
  PptxExportConfig,
} from "./export-types";
import { collectFontWarnings } from "./pptx/pptx-fonts";

function calculateScore(issues: ExportIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 20;
    else if (issue.severity === "warning") score -= 5;
    else score -= 1;
  }
  return Math.max(0, Math.min(100, score));
}

function calculateBlockCoverage(deck: { slides?: Array<{ blocks?: Array<{ type?: string }> }> }): number {
  const blocks = (deck.slides ?? []).flatMap((s) => s.blocks ?? []);
  if (blocks.length === 0) return 1;

  const nativeTypes = new Set(["text", "image", "shape", "table", "chart"]);
  const nativeCount = blocks.filter((b) => nativeTypes.has(b.type ?? "")).length;
  return nativeCount / blocks.length;
}

export async function runExportPreflight(
  deck: { slides?: Array<{ id?: string; blocks?: Array<Record<string, unknown>>; speakerNotes?: string; hidden?: boolean }> },
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

  for (const slide of deck.slides ?? []) {
    for (const block of slide.blocks ?? []) {
      const blockType = block.type as string;

      if (!["text", "image", "shape", "table", "chart"].includes(blockType)) {
        issues.push({
          severity: "warning",
          code: "unsupported-block-type",
          slideId: slide.id,
          blockId: block.id as string,
          message: `Block type "${blockType}" will be exported as image fallback`,
          suggestedFix: "Convert to a supported block type for native export",
          automaticFixAvailable: false,
        });
      }

      if (typeof block.cssFilter === "string" && block.cssFilter.includes("blur")) {
        issues.push({
          severity: "warning",
          code: "unsupported-css-effect",
          slideId: slide.id,
          blockId: block.id as string,
          message: "CSS filter effects may not transfer to PowerPoint",
          suggestedFix: "Remove blur filter or accept image fallback",
          automaticFixAvailable: false,
        });
      }

      if (typeof block.src === "string" && block.src.startsWith("http") && !block.src.startsWith("data:")) {
        issues.push({
          severity: "info",
          code: "external-asset",
          slideId: slide.id,
          blockId: block.id as string,
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

  return { issues, score, blockCoverage };
}
