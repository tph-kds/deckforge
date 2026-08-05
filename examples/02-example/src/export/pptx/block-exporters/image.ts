// export/pptx/block-exporters/image.ts

import type {
  PptxBlockExport,
  PptxBlockExporter,
  PptxExportContext,
  PptxSlideElement,
} from "../../export-types";
import { embedAsset } from "../pptx-assets";

interface ImageContentLike {
  assetId?: string;
  src?: string;
  alt?: string;
  fit?: string;
}

interface ImageBlock {
  id: string;
  type: "image";
  src?: string;
  alt?: string;
  content?: ImageContentLike;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  frame?: { x?: number; y?: number; w?: number; h?: number };
}

function imageGeometry(block: ImageBlock, ctx: PptxExportContext) {
  return {
    x: block.x ?? block.frame?.x ?? 0,
    y: block.y ?? block.frame?.y ?? 0,
    w: block.w ?? block.frame?.w ?? ctx.slideWidth * 0.5,
    h: block.h ?? block.frame?.h ?? ctx.slideHeight * 0.5,
  };
}

function placeholderElement(block: ImageBlock, ctx: PptxExportContext): PptxSlideElement {
  return {
    type: "fallback",
    ...imageGeometry(block, ctx),
    data: {
      text: `[image unavailable: ${block.id}]`,
      options: {
        fill: { color: "FFF3CD" },
        line: { color: "FFC107", width: 1 },
        fontSize: 12,
        color: "856404",
      },
    },
  };
}

export const imageBlockExporter: PptxBlockExporter = {
  type: "image",
  exportability: "native-editable",

  async export(block: unknown, ctx: PptxExportContext): Promise<PptxBlockExport> {
    const imageBlock = block as ImageBlock;
    const content = imageBlock.content;
    const asset = content?.assetId
      ? ctx.deck.assets?.find((entry) => entry.id === content.assetId)
      : undefined;
    const src = content?.src ?? imageBlock.src ?? asset?.src ?? "";
    const alt = content?.alt ?? imageBlock.alt ?? asset?.alt ?? "";

    if (!src) {
      return {
        status: "skipped",
        issues: [
          {
            code: "image-load-failed",
            severity: "warning",
            message: `Image block "${imageBlock.id}" has no resolvable source and was skipped`,
            suggestedFix: "Attach a local asset to the image block or use a data: URL",
            automaticFixAvailable: false,
          },
        ],
      };
    }

    const assetResult = await embedAsset(src, ctx.assetCache);

    if (!assetResult.dataUri) {
      return {
        status: "substituted",
        issues: [
          {
            code: "image-load-failed",
            severity: "warning",
            message: `Image "${src}" could not be loaded; replaced with a placeholder box`,
            suggestedFix: "Use a local asset or a data: URL so the image can be embedded offline",
            automaticFixAvailable: false,
          },
        ],
        element: placeholderElement(imageBlock, ctx),
      };
    }

    return {
      status: "native",
      issues: [],
      element: {
        type: "image",
        ...imageGeometry(imageBlock, ctx),
        data: {
          dataUri: assetResult.dataUri,
          alt,
          options: {
            sizing: { type: "contain", w: imageBlock.w ?? 5, h: imageBlock.h ?? 3 },
          },
        },
      },
    };
  },
};
