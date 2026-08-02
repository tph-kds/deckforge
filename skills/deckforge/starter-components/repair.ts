import type { DeckBlock, DeckProject, DeckSlide } from './deck-types';
import { blocksBySlot, type LayoutContract } from './layout-engine';
import { measureSlide, type MeasureIssue } from './measure';

/**
 * Repair pass for measurement issues (plan §15.3, §15.4).
 *
 * Pure transformations that resolve the deterministic measure findings from
 * measure.ts. Every function returns a new issue array so the caller can
 * re-measure and confirm convergence; nothing here touches persistence.
 */

const DEFAULT_BUDGETS: Record<string, { maxCharacters: number }> = {
  title: { maxCharacters: 48 },
  subtitle: { maxCharacters: 110 },
  bullet: { maxCharacters: 120 },
  takeaway: { maxCharacters: 160 },
};

/** True when a block is visually minimal enough to fold into an existing slot. */
export function isMinimalBlock(block: DeckBlock): boolean {
  const text = typeof block.content === 'string' ? block.content : '';
  const hasVisual = block.type === 'diagram' || block.type === 'chart' || block.type === 'image';
  return !hasVisual && text.length > 0 && text.length <= 36;
}

/**
 * Fix overflow by moving a block to an unused slot (plan §15.4). Returns the
 * updated slides; falls back to trimming text when no slot is available.
 */
export function repairOverflow(
  slides: DeckSlide[],
  slide: DeckSlide,
  issue: MeasureIssue,
  contract: LayoutContract,
): DeckSlide[] {
  if (issue.code !== 'overflow') return slides;
  const usedSlots = new Set<string>();
  for (const b of slides.flatMap((s) => s.blocks)) if (b.slot) usedSlots.add(b.slot);
  for (const b of slide.blocks) {
    if (!issue.blockId || b.id !== issue.blockId) continue;
    const candidate = contract.slots.find(
      (slot) => slot.id !== b.slot && !usedSlots.has(slot.id) && slot.allowedBlocks.includes(b.type),
    );
    if (candidate) {
      b.slot = candidate.id;
      b.style = { ...(b.style ?? {}), repair: { action: 'move', from: issue.slot, to: candidate.id } };
      return slides;
    }
    if (typeof b.content === 'string') {
      const max = DEFAULT_BUDGETS[b.slot ?? '']?.maxCharacters ?? 120;
      b.content = b.content.slice(0, max);
      b.style = { ...(b.style ?? {}), repair: { action: 'truncate', reason: 'overflow' } };
      return slides;
    }
  }
  return slides;
}

/**
 * Fix budget violations by trimming the longest text block bound to the slot
 * until the aggregate character budget is met (plan §15.3).
 */
export function repairBudget(
  slides: DeckSlide[],
  slide: DeckSlide,
  issue: MeasureIssue,
  contract: LayoutContract,
): DeckSlide[] {
  if (issue.code !== 'budget' || !issue.slot) return slides;
  const budget = (contract.slots.find((s) => s.id === issue.slot) as {
    contentBudget?: { maxCharacters?: number };
  } | undefined)?.contentBudget?.maxCharacters;
  if (budget == null) return slides;

  const bySlot = blocksBySlot(slide);
  const blocks = bySlot.get(issue.slot) ?? [];
  const texts = blocks.filter((b) => typeof b.content === 'string');
  let total = texts.reduce((sum, b) => sum + (b.content as string).length, 0);
  let i = 0;
  while (total > budget && i < texts.length) {
    const longest = texts.reduce((a, b) =>
      (b.content as string).length > (a.content as string).length ? b : a,
    );
    const excess = total - budget;
    if ((longest.content as string).length <= excess) break;
    longest.content = (longest.content as string).slice(0, Math.max(1, (longest.content as string).length - excess));
    (longest.style as Record<string, unknown>) = { ...(longest.style ?? {}), repair: { action: 'trim', reason: 'budget' } };
    total = texts.reduce((sum, b) => sum + (b.content as string).length, 0);
    i += 1;
  }
  return slides;
}

/**
 * Apply the repair that matches a given issue. Returns the slides with a
 * single repair applied, or the original slides when no rule applies.
 */
export function repairIssue(
  slides: DeckSlide[],
  slide: DeckSlide,
  issue: MeasureIssue,
  contract: LayoutContract,
): DeckSlide[] {
  switch (issue.code) {
    case 'overflow':
      return repairOverflow(slides, slide, issue, contract);
    case 'budget':
      return repairBudget(slides, slide, issue, contract);
    default:
      return slides;
  }
}

/**
 * Fixed-point repair loop (plan §15.4): repeatedly measure and apply repairs
 * until no blocking issues remain or the repair budget is exhausted. The
 * default budget of three passes prevents infinite loops from contradictory
 * rules.
 */
export function repairDeck(deck: DeckProject, contract: LayoutContract, maxPasses = 3): DeckProject {
  let current = deck;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const slide of current.slides) {
      if (slide.hidden) continue;
      const issues = measureSlide(current, slide, contract);
      for (const issue of issues) {
        if (issue.severity !== 'error') continue;
        const next = repairIssue(current.slides, slide, issue, contract);
        if (next !== current.slides) {
          current = { ...current, slides: next };
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }
  return current;
}
