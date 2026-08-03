import type { PptxExportConfig, FontWarning } from "../export-types";
import type { DeckProject } from "../deck/deck-types";

export interface PptxExportContextData {
  deck: DeckProject;
  config: PptxExportConfig;
  fontWarnings: FontWarning[];
  assetCache: Map<string, string>;
  slideWidth: number;
  slideHeight: number;
}

export function createExportContext(
  deck: DeckProject,
  config: PptxExportConfig
): PptxExportContextData {
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
