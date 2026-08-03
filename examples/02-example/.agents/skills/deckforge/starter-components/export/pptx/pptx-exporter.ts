import type { PptxExportConfig, PptxSlideElement } from "../export-types";
import type { DeckProject } from "../../deck-types";
import { createExportContext, type PptxExportContextData } from "./pptx-context";
import { getBlockExporter } from "./block-exporters/index";

const PIXELS_PER_INCH = 96;

function pixelsToInches(px: number): number {
  return px / PIXELS_PER_INCH;
}

function writeElementToSlide(pptxSlide: Record<string, unknown>, element: PptxSlideElement): void {
  const opts = {
    x: element.x,
    y: element.y,
    w: element.w,
    h: element.h,
  };

  switch (element.type) {
    case "text": {
      const data = element.data as { text: string; options?: Record<string, unknown> };
      (pptxSlide as Record<string, unknown>).addText = (pptxSlide as Record<string, unknown>).addText || function() {};
      (pptxSlide as Record<string, { text: string; options?: Record<string, unknown> }>).addText(data.text, { ...opts, ...data.options });
      break;
    }
    case "image": {
      const data = element.data as { dataUri: string; options?: Record<string, unknown> };
      (pptxSlide as Record<string, { dataUri: string; options?: Record<string, unknown> }>).addImage({ data: data.dataUri }, { ...opts, ...data.options });
      break;
    }
    case "shape": {
      const data = element.data as { shape: string; options?: Record<string, unknown> };
      (pptxSlide as Record<string, { shape: string; options?: Record<string, unknown> }>).addShape(data.shape as never, { ...opts, ...data.options });
      break;
    }
    case "table": {
      const data = element.data as { rows: unknown[][]; options?: Record<string, unknown> };
      (pptxSlide as Record<string, { rows: unknown[][]; options?: Record<string, unknown> }>).addTable(data.rows, { ...opts, ...data.options });
      break;
    }
    case "chart": {
      const data = element.data as { chartType: string; data: unknown; options?: Record<string, unknown> };
      (pptxSlide as Record<string, { chartType: string; data: unknown; options?: Record<string, unknown> }>).addChart(data.chartType as never, data.data, { ...opts, ...data.options });
      break;
    }
    case "fallback": {
      const data = element.data as { text: string; options?: Record<string, unknown> };
      (pptxSlide as Record<string, { text: string; options?: Record<string, unknown> }>).addText(data.text, { ...opts, fill: { color: "FFF3CD" }, color: "856404", fontSize: 12 });
      break;
    }
  }
}

export class PptxExporter {
  private config: PptxExportConfig;

  constructor(config: PptxExportConfig) {
    this.config = config;
  }

  async export(deck: DeckProject): Promise<Blob> {
    const ctx = createExportContext(deck, this.config);

    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();

    const slideWidthInches = pixelsToInches(ctx.slideWidth);
    const slideHeightInches = pixelsToInches(ctx.slideHeight);
    pptx.defineLayout({ name: "CUSTOM", width: slideWidthInches, height: slideHeightInches });
    pptx.layout = "CUSTOM";

    const slides = deck.slides ?? [];
    for (const slide of slides) {
      if (!this.config.includeHiddenSlides && slide.hidden) continue;
      const pptxSlide = pptx.addSlide();

      if (slide.speakerNotes && this.config.includeSpeakerNotes) {
        pptxSlide.addNotes(slide.speakerNotes);
      }

      const blocks = slide.blocks ?? [];
      for (const block of blocks) {
        try {
          const exporter = getBlockExporter(block.type);
          const element = await exporter.export(block, ctx);
          writeElementToSlide(pptxSlide as Record<string, unknown>, element);
        } catch (err) {
          console.warn(`Failed to export block ${block.id}:`, err);
        }
      }
    }

    const buffer = await pptx.write({ outputType: "arraybuffer" });
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  }
}