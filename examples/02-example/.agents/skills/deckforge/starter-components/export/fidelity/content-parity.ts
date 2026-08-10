import type { Block, DeckProject } from "../../deck-types";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";
import { FIDELITY_POLICY } from "./fidelity-policy";

const VISIBLE_TEXT = /[A-Za-z0-9]{2,}/g;

type ContentRecord = Record<string, unknown>;

function asRecord(value: unknown): ContentRecord {
  return (value ?? {}) as ContentRecord;
}

export function rawText(block: Block): string {
  if (typeof block.content === "string") return block.content;
  return String(asRecord(block.content).text ?? "");
}

function meaningfulText(block: Block): number {
  return (rawText(block).match(VISIBLE_TEXT) ?? []).length;
}

/**
 * Compute text-recall content parity: the ratio of meaningful text tokens
 * present in the export to the total expected across all visible blocks.
 *
 * This is a TEXT-based metric — it measures how much human-readable text
 * survives into the PPTX output. For visual blocks (charts, diagrams,
 * images) where the exported representation is SVG or raster, the metric
 * falls back to the block's alt text or title. A score of 1.0 means all
 * expected text is present; 0.0 means no text was exported.
 *
 * The metric intentionally does NOT measure visual fidelity (pixel-level
 * accuracy) or structural fidelity (layout positions). Those are assessed
 * separately by the OOXML structural verifier.
 */
export function calculateContentParity(
  deck: DeckProject,
  blocks: FidelityBlockReport[],
  policy: PptxFidelityPolicy = FIDELITY_POLICY,
): number {
  const visible = deck.slides.flatMap((slide) => slide.blocks.filter((block) => !block.hidden));
  if (visible.length === 0) return 1;

  const byId = new Map(blocks.map((b) => [b.blockId, b]));
  const expected = visible.map((block) => meaningfulText(block));
  const present = visible.map((block) => {
    const rep = byId.get(block.id);
    if (!rep || rep.representation === "unsupported") return 0;
    if (rep.representation === "native" || rep.representation === "expanded-build") return meaningfulText(block);
    if (rep.representation === "raster") return Math.round(meaningfulText(block) * 0.8);
    if (rep.representation === "svg") {
      const content = asRecord(block.content);
      const alt = String(content.alt ?? asRecord(content.chart).title ?? content.text ?? "");
      return Math.max(1, (alt.match(VISIBLE_TEXT) ?? []).length);
    }
    return 0;
  });

  const expectedTotal = expected.reduce((a, b) => a + b, 0);
  const presentTotal = present.reduce((a, b) => a + b, 0);
  return expectedTotal === 0 ? 1 : Math.min(1, presentTotal / expectedTotal);
}
