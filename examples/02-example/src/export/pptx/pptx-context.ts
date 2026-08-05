import type { PptxExportConfig, PptxExportContext } from "../export-types";
import type { DeckProject } from "../../deck/types";

export function createExportContext(
  deck: DeckProject,
  config: PptxExportConfig
): PptxExportContext {
  const canvas = deck.canvas ?? { width: 13.333, height: 7.5 };
  return {
    deck,
    config,
    fontWarnings: [],
    assetCache: new Map(),
    slideWidth: canvas.width ?? 13.333,
    slideHeight: canvas.height ?? 7.5,
  };
}
