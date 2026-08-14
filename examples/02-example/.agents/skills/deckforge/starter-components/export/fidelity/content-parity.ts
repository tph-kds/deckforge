import type { Block, DeckProject } from "../../deck/types";
import type { FidelityBlockReport, PptxFidelityPolicy } from "./fidelity-types";
import { FIDELITY_POLICY } from "./fidelity-policy";

const VISIBLE_TEXT = /[A-Za-z0-9]{2,}/g;

type ContentRecord = Record<string, unknown>;

function asRecord(value: unknown): ContentRecord {
  return (value ?? {}) as ContentRecord;
}

export function rawText(block: Block): string {
  const content = block.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    // bullets: array of lines / {text}
    return content
      .map((item) =>
        typeof item === "string" ? item : typeof (item as { text?: unknown })?.text === "string"
          ? ((item as { text: string }).text)
          : "",
      )
      .join(" ");
  }
  if (!content || typeof content !== "object") return "";
  const record = asRecord(content);
  if (typeof record.text === "string") return record.text;
  // metric: { value, label, delta }
  if (record.value != null || record.label != null || record.delta != null) {
    return [record.value, record.label, record.delta].filter((v) => typeof v === "string").join(" ");
  }
  // process: { steps: [{ title, detail }] }
  if (Array.isArray(record.steps)) {
    return record.steps
      .map((step) => {
        const s = asRecord(step);
        return [s.title, s.detail].filter((v) => typeof v === "string").join(" ");
      })
      .join(" ");
  }
  return "";
}

function meaningfulText(block: Block): number {
  return (rawText(block).match(VISIBLE_TEXT) ?? []).length;
}

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
