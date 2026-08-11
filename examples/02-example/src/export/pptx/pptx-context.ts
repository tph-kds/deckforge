import type { PptxExportConfig, PptxExportContext } from "../export-types";
import type { DeckProject } from "../../deck/types";
import { derivePptxSlideSize } from "../geometry";

/**
 * Build the export context. The PPTX slide size is DERIVED from the actual
 * document pixel size so the exported aspect ratio always equals the web
 * aspect ratio (Phase 4). This context is the only place the document and the
 * PPTX geometry relationship is established; individual exporters never invent
 * their own mapping.
 */
export function createExportContext(
  deck: DeckProject,
  config: PptxExportConfig
): PptxExportContext {
  const canvas = deck.canvas ?? { width: 1600, height: 900 };
  const slideWidth = canvas.width ?? 1600;
  const slideHeight = canvas.height ?? 900;
  const pptxSize = derivePptxSlideSize(slideWidth, slideHeight);
  return {
    deck,
    config,
    fontWarnings: [],
    assetCache: new Map(),
    slideWidth,
    slideHeight,
    pptxWidth: pptxSize.width,
    pptxHeight: pptxSize.height,
  };
}