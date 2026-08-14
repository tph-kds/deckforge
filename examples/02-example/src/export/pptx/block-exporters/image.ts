// export/pptx/block-exporters/image.ts
//
// The image exporter consumes the canonical, pre-resolved asset registry built
// by the single `prepareExport` phase. It performs NO network work of its own:
// if the preparation phase failed to resolve a required image, this exporter
// reports a blocking error (Fidelity First) or a truthful rasterized fallback
// (Editability First) — never a silent omission, and never a re-fetch that
// could contradict what preflight reported.

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import { canonicalAssetRef } from "../../../deck/assets";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import { documentUnitToPptxInches } from "../../geometry";
import { PLACEHOLDER_IMAGE_DATA_URI } from "../pptx-placeholder";
import { readImageSizeFromDataUri } from "../../image-dimensions";
import type { Block, ImageBlockContent } from "../../../deck/types";

/**
 * PPTX sizing box (inches) for an image element, derived from the resolved
 * document-pixel frame. pptxgenjs interprets `sizing.w/h` as INCHES when the
 * value is < 100 and as EMU otherwise — feeding it document pixels (e.g. 852)
 * produced a 0.001"-wide picture. Inches are always the correct unit here.
 */
function sizingBoxInches(
  frame: { w: number; h: number },
  ctx: PptxExportContext,
): { w: number; h: number } {
  return {
    w: documentUnitToPptxInches(frame.w, ctx.slideWidth, ctx.pptxWidth),
    h: documentUnitToPptxInches(frame.h, ctx.slideHeight, ctx.pptxHeight),
  };
}

/**
 * Intrinsic dimensions for the raster that will be embedded. The bytes are
 * authoritative (they match the actual embedded image), so they take priority
 * over the manifest record, which can be stale or absent (URL-pasted sources,
 * decks saved before upload dimensions were tracked).
 */
function naturalSize(
  dataUri: string,
  recordedWidth?: number,
  recordedHeight?: number,
): { width: number; height: number } | undefined {
  const decoded = readImageSizeFromDataUri(dataUri);
  if (decoded) {
    return decoded;
  }
  if (recordedWidth && recordedHeight) {
    return { width: recordedWidth, height: recordedHeight };
  }
  return undefined;
}

export const imageBlockExporter: PptxBlockExporter = {
  type: "image",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const imageBlock = block as Block;
    const frame = exportFrameOf(imageBlock);

    // A frame IS required: never place at (0,0) by defaulting w/h.
    if (!frame) {
      return {
        status: "unsupported",
        issues: [frameErrorIssue(imageBlock.id, "image blocks require a resolved frame")],
      };
    }

    const content = (imageBlock.content as ImageBlockContent | undefined) ?? {};
    const ref = canonicalAssetRef(ctx.deck, imageBlock);
    const alt = content.alt ?? imageBlock.alt ?? "";
    const fit = content.fit ?? "cover";

    const fix =
      "Use a local asset or a data: URL so the image can be embedded offline";

    // Placeholder image block: no source and no asset id. The web renders a
    // designed placeholder, so PPTX keeps the visual slot filled with the
    // bundled placeholder raster — a truthful fallback, not an omission.
    if (!ref) {
      return {
        status: "rasterized",
        issues: [
          {
            code: "no-fallback-produced",
            severity: "info",
            message: `Image block "${imageBlock.id}" has no image source; the bundled placeholder raster was embedded`,
            suggestedFix: "Attach a local asset to the image block or use a data: URL",
            automaticFixAvailable: true,
          },
        ],
        element: placeholderElement(imageBlock.id, frame, alt, fit, ctx),
      };
    }

    // Orphan: the block references a manifest asset that does not exist. This
    // is a real resolution failure, surfaced the same way as a dead URL.
    if (ref.orphan) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "image-load-failed",
            severity: "error",
            message: `Image block "${imageBlock.id}" references asset "${ref.assetId}" which has no manifest entry; the image cannot be embedded`,
            suggestedFix: "Attach a local asset to the image block or use a data: URL",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    const entry = ctx.assetRegistry.get(ref.assetId);
    const source = entry?.originalSrc ?? ref.src ?? "";

    if (!source) {
      return {
        status: "unsupported",
        issues: [
          {
            code: "image-load-failed",
            severity: "error",
            message: `Image block "${imageBlock.id}" has no resolvable source and cannot be embedded`,
            suggestedFix: fix,
            automaticFixAvailable: false,
          },
        ],
      };
    }

    if (entry && entry.status === "ready" && entry.resolvedDataUri) {
      const natural = naturalSize(entry.resolvedDataUri, entry.width, entry.height);
      const element: PptxSlideElement = {
        type: "image",
        elementId: imageBlock.id,
        ...frame,
        data: {
          dataUri: entry.resolvedDataUri,
          alt,
          naturalWidth: natural?.width,
          naturalHeight: natural?.height,
          options: {
            sizing: {
              type: fit === "cover" ? "cover" : "contain",
              ...sizingBoxInches(frame, ctx),
            },
            margin: 0,
          },
        },
      };
      return { status: "native", issues: [], element };
    }

    // The preparation phase failed to resolve this required image.
    const reason =
      entry?.error ?? "network error, CORS restriction, or missing asset";
    const base = {
      code: "image-load-failed" as const,
      automaticFixAvailable: false as const,
    };

    // Fidelity First never ships a successful export with a placeholder in
    // place of a real image: an unresolved required image is a blocking error.
    if (ctx.config.mode === "fidelity-first") {
      return {
        status: "unsupported",
        issues: [
          {
            ...base,
            severity: "error",
            message: `Image "${source}" (block "${imageBlock.id}") could not be loaded: ${reason}`,
            suggestedFix: fix,
          },
        ],
      };
    }

    // Editability-first: keep the visual slot filled with the bundled
    // placeholder raster so the image still "appears" in PPTX.
    return {
      status: "rasterized",
      issues: [
        {
          ...base,
          severity: "warning",
          message: `Image "${source}" (block "${imageBlock.id}") could not be loaded: ${reason}; a bundled placeholder image was embedded in its place`,
          suggestedFix: fix,
        },
      ],
      element: placeholderElement(imageBlock.id, frame, alt, fit, ctx),
    };
  },
};

function placeholderElement(
  elementId: string,
  frame: { x: number; y: number; w: number; h: number },
  alt: string,
  fit: string,
  ctx: PptxExportContext,
): PptxSlideElement {
  const natural = readImageSizeFromDataUri(PLACEHOLDER_IMAGE_DATA_URI);
  return {
    type: "image",
    elementId,
    ...frame,
    data: {
      dataUri: PLACEHOLDER_IMAGE_DATA_URI,
      alt,
      naturalWidth: natural?.width,
      naturalHeight: natural?.height,
      options: {
        sizing: {
          type: fit === "cover" ? "cover" : "contain",
          ...sizingBoxInches(frame, ctx),
        },
        margin: 0,
      },
    },
  };
}