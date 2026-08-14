// export/fidelity/svg/svg-raster.ts
//
// Rasterize an SVG string to a PNG buffer in pure Node. PptxGenJS embeds SVG
// images by generating a PNG *preview* in a browser `Image`/`canvas`, which is
// not available in Node, so any SVG fallback (charts, diagrams, video posters)
// is rasterized here instead and embedded as a crisp 2x PNG.
//
// Web-only theme fonts that are not installed on office machines are mapped to
// their export substitution before rendering so chart text is deterministic
// (the same mapping the PPTX text exporter uses).

import { Resvg } from "@resvg/resvg-js";

/** Web font -> commonly installed office font, matching pptFontFor(). */
const FONT_FALLBACK: Record<string, string> = {
  Inter: "Arial",
  "Libre Baskerville": "Georgia",
  "JetBrains Mono": "Consolas",
};

function mapFontFamily(svg: string): string {
  let out = svg;
  for (const [from, to] of Object.entries(FONT_FALLBACK)) {
    out = out.split(`font-family="${from}"`).join(`font-family="${to}"`);
  }
  return out;
}

/**
 * Render an SVG string to a PNG buffer at the given target width (px). Height
 * follows the SVG's intrinsic aspect ratio (viewBox), so callers should only
 * rasterize SVGs whose element keeps that aspect (charts: contained 560:300
 * box; diagrams: SVG already sized to the frame).
 */
export function renderSvgToPng(svg: string, pixelWidth: number): Buffer {
  const resvg = new Resvg(mapFontFamily(svg), {
    fitTo: { mode: "width", value: Math.max(1, Math.round(pixelWidth)) },
    background: "transparent",
  });
  const rendered = resvg.render();
  if (!rendered || rendered.width === 0 || rendered.height === 0) {
    throw new Error("SVG rasterization produced an empty image");
  }
  return rendered.asPng();
}
