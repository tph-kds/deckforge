import type { PptxExportConfig, PptxExportContext } from "../export-types";
import type { DeckProject } from "../../deck/types";
import { derivePptxSlideSize } from "../geometry";
import type { PreparedExport } from "../prepare-export";

/**
 * Build the export context. The PPTX slide size is DERIVED from the actual
 * document pixel size so the exported aspect ratio always equals the web
 * aspect ratio (Phase 4). This context is the only place the document and the
 * PPTX geometry relationship is established; individual exporters never invent
 * their own mapping.
 *
 * The context carries the canonical asset registry from the single
 * `prepareExport` phase when one was prepared — exporters consume resolved
 * bytes from it and never fetch on their own.
 */
export function createExportContext(
  deck: DeckProject,
  config: PptxExportConfig,
  prepared?: PreparedExport
): PptxExportContext {
  const canvas = deck.canvas ?? { width: 1600, height: 900 };
  const slideWidth = canvas.width ?? 1600;
  const slideHeight = canvas.height ?? 900;
  const pptxSize = derivePptxSlideSize(slideWidth, slideHeight);
  return {
    deck,
    config,
    fontWarnings: [],
    assetRegistry: prepared?.assets ?? new Map(),
    slideWidth,
    slideHeight,
    pptxWidth: pptxSize.width,
    pptxHeight: pptxSize.height,
  };
}