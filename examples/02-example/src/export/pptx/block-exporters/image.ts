// export/pptx/block-exporters/image.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import { embedAsset } from "../pptx-assets";
import { exportFrameOf, frameErrorIssue } from "../export-utils";
import { PLACEHOLDER_IMAGE_DATA_URI } from "../pptx-placeholder";
import type { Block } from "../../../deck/types";

interface ImageContentLike {
  assetId?: string;
  src?: string;
  alt?: string;
  fit?: string;
  originalWidth?: number;
  originalHeight?: number;
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

    const content = imageBlock.content as ImageContentLike | undefined;
    const asset = content?.assetId
      ? ctx.deck.assets?.find((entry) => entry.id === content.assetId)
      : undefined;
    const src = content?.src ?? (imageBlock as { src?: string }).src ?? asset?.src ?? "";
    const alt = content?.alt ?? (imageBlock as { alt?: string }).alt ?? asset?.alt ?? "";
    const fit = content?.fit ?? "contain";

    const issueBase = {
      severity: "warning" as const,
      code: "image-load-failed" as const,
      automaticFixAvailable: false,
    };
    const fix = "Use a local asset or a data: URL so the image can be embedded offline";

if (!src) {
        return {
          status: "skipped",
          issues: [
            {
              ...issueBase,
              message: `Image block "${imageBlock.id}" has no resolvable source and was skipped`,
              suggestedFix: "Attach a local asset to the image block or use a data: URL",
            },
          ],
        };
      }

    try {
      const assetResult = await embedAsset(src, ctx.assetCache);

      // Regression (P2-004): a failed/empty asset must NEVER become a labeled
      // TEXT box ("Image unavailable: …"). The visual slot always receives a
      // real image element: the bundled placeholder raster when the source is
      // unresolvable. The image "appears in PPTX" either way.
      const dataUri = assetResult.dataUri || PLACEHOLDER_IMAGE_DATA_URI;
      const mimeType = assetResult.mimeType || "image/png";

      const element: PptxSlideElement = {
        type: "image",
        elementId: imageBlock.id,
        ...frame,
        data: {
          dataUri,
          alt,
          options: {
            sizing: {
              type: fit === "cover" ? "cover" : "contain",
              w: frame.w,
              h: frame.h,
            },
            margin: 0,
          },
        },
      };

      if (assetResult.dataUri) {
        return { status: "native", issues: [], element };
      }

      return {
        status: "rasterized",
        issues: [
          {
            severity: "warning",
            code: "image-load-failed",
            automaticFixAvailable: false,
            suggestedFix: fix,
            message: `Image "${src}" (block "${imageBlock.id}") could not be loaded (network error or CORS restriction); a bundled placeholder image was embedded in its place`,
          },
        ],
        element,
      };
    } catch (err) {
      // Even a hard failure keeps the visual slot filled with a real image.
      return {
        status: "rasterized",
        issues: [
          {
            severity: "warning",
            code: "image-load-failed",
            automaticFixAvailable: false,
            suggestedFix: fix,
            message: `Image "${src}" (block "${imageBlock.id}") failed to export: ${err instanceof Error ? err.message : "unknown error"}; a bundled placeholder image was embedded in its place`,
          },
        ],
        element: {
          type: "image",
          elementId: imageBlock.id,
          ...frame,
          data: {
            dataUri: PLACEHOLDER_IMAGE_DATA_URI,
            alt,
            options: {
              sizing: {
                type: fit === "cover" ? "cover" : "contain",
                w: frame.w,
                h: frame.h,
              },
              margin: 0,
            },
          },
        },
      };
    }
  },
};