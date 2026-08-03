import type { PptxExportConfig } from "../export-types";
import type { DeckProject } from "../../deck-types";
import { createExportContext, type PptxExportContextData } from "./pptx-context";

export class PptxExporter {
  private config: PptxExportConfig;

  constructor(config: PptxExportConfig) {
    this.config = config;
  }

  async export(deck: DeckProject): Promise<Blob> {
    const ctx = createExportContext(deck, this.config);

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    pptx.defineLayout({ name: "CUSTOM", width: ctx.slideWidth, height: ctx.slideHeight });
    pptx.layout = "CUSTOM";

    const slides = deck.slides ?? [];
    for (const slide of slides) {
      if (!this.config.includeHiddenSlides && slide.hidden) continue;
      const pptxSlide = pptx.addSlide();
      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }
    }

    const buffer = await pptx.write({ outputType: "arraybuffer" });
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  }
}