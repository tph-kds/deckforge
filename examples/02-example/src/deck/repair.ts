import type { Block, DeckProject, DeckSlide } from './types';
import { measureSlide, type MeasureIssue } from './measure';

/**
 * Deterministic automated repair (plan §7.4, §15.3, §15.4).
 *
 * Runs at most three render→validate→repair attempts. Each attempt applies a
 * targeted repair for the worst blocking failure, then re-measures. If a slide
 * still fails after the limit it is rejected rather than silently shipped.
 */

export interface RepairAttempt {
  attempt: number;
  applied: string[];
  remainingErrors: number;
}

export interface RepairResult {
  deck: DeckProject;
  accepted: boolean;
  attempts: RepairAttempt[];
  finalIssues: MeasureIssue[];
}

function mapSlide(deck: DeckProject, slideId: string, fn: (slide: DeckSlide) => DeckSlide): DeckProject {
  return { ...deck, slides: deck.slides.map((slide) => (slide.id === slideId ? fn(slide) : slide)) };
}

function mapBlock(slide: DeckSlide, blockId: string, fn: (block: Block) => Block): DeckSlide {
  return { ...slide, blocks: slide.blocks.map((block) => (block.id === blockId ? fn(block) : block)) };
}

function updateBindingGap(slide: DeckSlide, slot: string, gap: number): DeckSlide {
  return {
    ...slide,
    layoutBindings: (slide.layoutBindings ?? []).map((binding) =>
      binding.slot === slot ? { ...binding, gap } : binding,
    ),
  };
}

/** Repair 1: remove unnecessary decorative spacing in an overflowing slot. */
function tightenSpacing(slide: DeckSlide, slot: string): DeckSlide {
  return updateBindingGap(slide, slot, 6);
}

/** Repair 2: convert a long paragraph into concise bullets (plan §7.4 step 4). */
function paragraphToBullets(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    if (block.type !== 'text') return block;
    const text = typeof block.content === 'string' ? block.content : '';
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { ...block, type: 'bullets', content: sentences.length > 1 ? sentences : block.content };
  });
}

function splitSentences(content: unknown): string[] {
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join(' ') : '';
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Repair 3: trim optional supporting text to its leading sentences (plan §7.4 step 3). */
function trimSupportingText(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    const sentences = splitSentences(block.content);
    if (sentences.length <= 2) return block;
    const trimmed = sentences.slice(0, 2).join(' ');
    if (Array.isArray(block.content)) return { ...block, content: trimmed };
    return { ...block, content: trimmed };
  });
}

/** Repair 4: reduce heading emphasis by one typography step (plan §7.4 step 6). */
function reduceHeadingStep(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    if (block.type !== 'heading') return block;
    const level = (block.style?.level as number) ?? 3;
    const next = level < 3 ? level + 1 : 3;
    return { ...block, style: { ...block.style, level: next } };
  });
}

function firstBlockForIssue(deck: DeckProject, slide: DeckSlide, issue: MeasureIssue): Block | undefined {
  return slide.blocks.find((block) => block.id === issue.blockId);
}

function textBlockIds(deck: DeckProject, slide: DeckSlide): string[] {
  return slide.blocks
    .filter((block) => block.type === 'text' || block.type === 'heading')
    .map((block) => block.id);
}

function applyRepairForIssue(deck: DeckProject, slide: DeckSlide, issue: MeasureIssue, attempt: number): { deck: DeckProject; applied: string } {
  const id = issue.blockId;
  switch (issue.code) {
    case 'overflow': {
      if (attempt === 1) {
        return { deck: mapSlide(deck, slide.id, (s) => tightenSpacing(s, issue.slot)), applied: `Tightened spacing in slot "${issue.slot}".` };
      }
      const block = id ? firstBlockForIssue(deck, slide, issue) : undefined;
      if (attempt === 2) {
        if (block?.type === 'heading') {
          return { deck: mapSlide(deck, slide.id, (s) => reduceHeadingStep(s, id!)), applied: `Reduced heading size in "${id}".` };
        }
        if (block?.type === 'text' && splitSentences(block.content).length > 2) {
          return { deck: mapSlide(deck, slide.id, (s) => trimSupportingText(s, id!)), applied: `Trimmed supporting text in "${id}".` };
        }
        return { deck, applied: 'No targeted repair available; rejecting.' };
      }
      if (block?.type === 'text') {
        return { deck: mapSlide(deck, slide.id, (s) => paragraphToBullets(s, id!)), applied: `Converted text in "${id}" to bullets.` };
      }
      return { deck, applied: 'No targeted repair available; rejecting.' };
    }
    case 'orphan': {
      if (!id) return { deck, applied: 'No repair available.' };
      const block = firstBlockForIssue(deck, slide, issue);
      if (attempt === 1 && block?.type === 'text' && splitSentences(block.content).length > 2) {
        return { deck: mapSlide(deck, slide.id, (s) => trimSupportingText(s, id)), applied: `Trimmed supporting text in "${id}".` };
      }
      if (block?.type === 'heading') {
        return { deck: mapSlide(deck, slide.id, (s) => reduceHeadingStep(s, id)), applied: `Reduced heading size in "${id}".` };
      }
      return { deck, applied: 'No repair available.' };
    }
    case 'budget': {
      const candidates = textBlockIds(deck, slide);
      const trimmed = candidates.find((bid) => {
        const block = slide.blocks.find((b) => b.id === bid);
        return block && typeof block.content === 'string' && block.content.split(/\s+/).length > 6;
      });
      if (trimmed) {
        return { deck: mapSlide(deck, slide.id, (s) => trimSupportingText(s, trimmed)), applied: `Trimmed "${trimmed}" to meet the character budget.` };
      }
      return { deck, applied: 'No trimming candidate; rejecting.' };
    }
    default:
      return { deck, applied: `No deterministic repair for "${issue.code}"; rejecting.` };
  }
}

/**
 * Run the repair loop for a single slide. Mutates a copy of the deck and
 * re-measures up to `maxAttempts` times (default 3 per plan §15.3).
 */
export function repairSlide(
  deck: DeckProject,
  slideId: string,
  maxAttempts = 3,
): RepairResult {
  let working = deck;
  const attempts: RepairAttempt[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const slide = working.slides.find((s) => s.id === slideId);
    if (!slide) return { deck: working, accepted: false, attempts, finalIssues: [] };

    const issues = measureSlide(working, slide);
    const blocking = issues.filter((issue) => issue.severity === 'error');
    if (blocking.length === 0) {
      return {
        deck: working,
        accepted: true,
        attempts,
        finalIssues: issues,
      };
    }

    const target = blocking[0];
    const result = applyRepairForIssue(working, slide, target, attempt);
    working = result.deck;

    const after = measureSlide(working, working.slides.find((s) => s.id === slideId) ?? slide);
    attempts.push({
      attempt,
      applied: [result.applied],
      remainingErrors: after.filter((issue) => issue.severity === 'error').length,
    });
  }

  const slide = working.slides.find((s) => s.id === slideId);
  return {
    deck: working,
    accepted: false,
    attempts,
    finalIssues: slide ? measureSlide(working, slide) : [],
  };
}

/** Repair every slide in the deck; rejects any slide that stays invalid. */
export function repairDeck(deck: DeckProject, maxAttempts = 3): RepairResult[] {
  return deck.slides.map((slide) => repairSlide(deck, slide.id, maxAttempts));
}
