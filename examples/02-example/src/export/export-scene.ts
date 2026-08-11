// export/export-scene.ts
//
// Structural validation of a fully-resolved export scene (Phase 16):
// catches the kinds of corruption that previously produced silent (0,0)
// geometry or leaked placeholder content into the deck file. Pure and
// framework-free so it can run in tests and CI.

import type { PptxExportContext, PptxSlideElement, ExportIssueCode } from "./export-types";
import {
  aspectMatches,
  validateRectWithinSlide,
  validateFrame,
} from "./geometry";

export type SceneSeverity = "error" | "warning";

export interface ExportSceneDiagnostic {
  code: ExportIssueCode;
  severity: SceneSeverity;
  slideId?: string;
  elementId?: string;
  message: string;
}

export interface ExportScene {
  slides: Array<{ slideId: string; elements: PptxSlideElement[] }>;
}

/** Detect the leak of a starter "New chart" template into the export. */
function isTemplateChartLeak(slide: ExportScene["slides"][number]): ExportSceneDiagnostic[] {
  return slide.elements
    .filter((element) => element.type === "chart")
    .map((element): ExportSceneDiagnostic[] => {
      const data = element.data as { title?: string; options?: Record<string, unknown> };
      const title = data.title ?? (data.options?.title as string | undefined) ?? "";
      if (/new chart/i.test(title)) {
        return [
          {
            code: "template-chart-leak",
            severity: "warning",
            slideId: slide.slideId,
            elementId: element.elementId,
            message: `Slide "${slide.slideId}" exports a chart titled "${title}", which matches an unconfigured editor template; verify the chart has real data`,
          },
        ];
      }
      return [];
    })
    .flat();
}

/** Detect fallback elements that stand in for failed images. */
function detectUnresolvedImages(slide: ExportScene["slides"][number]): ExportSceneDiagnostic[] {
  return slide.elements
    .filter((element) => element.type === "fallback")
    .map((element): ExportSceneDiagnostic[] => {
      const text = (element.data as { text?: string }).text ?? "";
      if (/image unavailable/i.test(text)) {
        return [
          {
            code: "unresolved-image",
            severity: "warning",
            slideId: slide.slideId,
            elementId: element.elementId,
            message: `Slide "${slide.slideId}" contains an image that could not be resolved (element "${element.elementId}"); it was replaced with a placeholder`,
          },
        ];
      }
      return [];
    })
    .flat();
}

/** Detect malformed or missing element geometry. */
function detectGeometryErrors(
  slide: ExportScene["slides"][number],
  ctx: PptxExportContext,
): ExportSceneDiagnostic[] {
  return slide.elements
    .map((element): ExportSceneDiagnostic[] => {
      const frame = { x: element.x, y: element.y, w: element.w, h: element.h };
      const errors = validateRectWithinSlide(frame, ctx.slideWidth, ctx.slideHeight);
      if (errors.length) {
        return [
          {
            code: "invalid-geometry",
            severity: "error",
            slideId: slide.slideId,
            elementId: element.elementId,
            message: `Slide "${slide.slideId}" element "${element.elementId}" has invalid geometry: ${errors.join("; ")}`,
          },
        ];
      }
      return [];
    })
    .flat();
}

/** Detect duplicate element ids across the whole deck (corrupt file risk). */
function detectDuplicateElementIds(
  slides: ExportScene["slides"],
): ExportSceneDiagnostic[] {
  const seen = new Map<string, string>();
  const diagnostics: ExportSceneDiagnostic[] = [];
  for (const slide of slides) {
    for (const element of slide.elements) {
      const id = element.elementId;
      if (!id) continue;
      const existingSlide = seen.get(id);
      if (existingSlide !== undefined && existingSlide !== slide.slideId) {
        diagnostics.push({
          code: "duplicate-element-id",
          severity: "warning",
          slideId: slide.slideId,
          elementId: id,
          message: `Element id "${id}" appears on both slide "${existingSlide}" and "${slide.slideId}"; duplicate ids can break edit targeting`,
        });
      } else {
        seen.set(id, slide.slideId);
      }
    }
  }
  return diagnostics;
}

/** Detect the PPTX/web aspect mismatch that hard-coded 13.333"x7.5" caused. */
function detectAspectMismatch(ctx: PptxExportContext): ExportSceneDiagnostic[] {
  const matches = aspectMatches(
    ctx.slideWidth,
    ctx.slideHeight,
    ctx.pptxWidth,
    ctx.pptxHeight,
  );
  if (!matches) {
    return [
      {
        code: "aspect-mismatch",
        severity: "error",
        message: `PPTX slide size (${ctx.pptxWidth}"x${ctx.pptxHeight}") does not match the document canvas aspect ratio (${ctx.slideWidth}x${ctx.slideHeight}px); exports will be distorted`,
      },
    ];
  }
  return [];
}

/**
 * Validate a fully-resolved export scene. Returns a list of diagnostics
 * grouped by severity; the export pipeline surfaces errors as failed status.
 */
export function validateExportScene(
  scene: ExportScene,
  ctx: PptxExportContext,
): ExportSceneDiagnostic[] {
  const diagnostics: ExportSceneDiagnostic[] = [
    ...detectAspectMismatch(ctx),
    ...detectDuplicateElementIds(scene.slides),
  ];
  for (const slide of scene.slides) {
    diagnostics.push(...detectGeometryErrors(slide, ctx));
    diagnostics.push(...isTemplateChartLeak(slide));
    diagnostics.push(...detectUnresolvedImages(slide));
  }
  return diagnostics;
}

/** True when a scene has at least one error-severity diagnostic. */
export function sceneHasErrors(diagnostics: ExportSceneDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export { validateFrame };