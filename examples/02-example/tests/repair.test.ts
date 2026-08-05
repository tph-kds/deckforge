import { describe, expect, it } from 'vitest';
import { loadSeedDeck } from '../src/deck/seed';
import { measureSlide, hasBlockingIssues } from '../src/deck/measure';
import { repairSlide, repairDeck, hashDeck } from '../src/deck/repair';
import type { DeckSlide, DeckProject } from '../src/deck/types';

const deck = loadSeedDeck();

function sentences(count: number, perSentence = 100): string {
  const padded = 'x'.repeat(perSentence - 1) + '.';
  return Array.from({ length: count }, () => padded).join(' ');
}

function statementSlide(blockId: string, content: string): DeckSlide {
  return {
    id: 's-test',
    title: 'Repair fixture',
    layout: 'statement',
    blocks: [
      { id: 'b-statement', type: 'heading', content: 'Repair fixture', style: { level: 1 }, sourceIds: [], slot: 'statement', positionMode: 'slot' },
      { id: blockId, type: 'text', content, style: {}, sourceIds: [], slot: 'support', positionMode: 'slot' },
    ],
    speakerNotes: '',
    sources: [],
    interactions: [],
    density: 'medium',
    layoutBindings: [
      { slot: 'statement', blockIds: ['b-statement'], flow: 'stack', gap: 8 },
      { slot: 'support', blockIds: [blockId], flow: 'stack', gap: 8 },
    ],
  };
}

/** section-divider chapter slot is narrow enough that even two sentences still overflow. */
function chapterSlide(blockId: string, content: string): DeckSlide {
  return {
    id: 's-chapter',
    title: 'Chapter fixture',
    layout: 'section-divider',
    blocks: [
      { id: 'b-chapter-title', type: 'heading', content: 'Chapter', style: { level: 1 }, sourceIds: [], slot: 'title', positionMode: 'slot' },
      { id: blockId, type: 'text', content, style: {}, sourceIds: [], slot: 'chapter', positionMode: 'slot' },
    ],
    speakerNotes: '',
    sources: [],
    interactions: [],
    density: 'medium',
    layoutBindings: [
      { slot: 'title', blockIds: ['b-chapter-title'], flow: 'stack', gap: 8 },
      { slot: 'chapter', blockIds: [blockId], flow: 'stack', gap: 8 },
    ],
  };
}

/** Slide A owns slot "subtitle" (title-hero); slide B uses layout statement, which has no "subtitle". */
function crossSlotDeck(): DeckProject {
  const slideA: DeckSlide = {
    id: 's-a',
    title: 'Slide A',
    layout: 'title-hero',
    blocks: [
      { id: 'a-title', type: 'heading', content: 'Slide A', style: { level: 1 }, sourceIds: [], slot: 'title', positionMode: 'slot' },
      { id: 'a-sub', type: 'text', content: 'Short subtitle.', style: {}, sourceIds: [], slot: 'subtitle', positionMode: 'slot' },
    ],
    speakerNotes: '',
    sources: [],
    interactions: [],
    density: 'medium',
    layoutBindings: [
      { slot: 'title', blockIds: ['a-title'], flow: 'stack', gap: 8 },
      { slot: 'subtitle', blockIds: ['a-sub'], flow: 'stack', gap: 8 },
    ],
  };
  const slideB: DeckSlide = {
    id: 's-b',
    title: 'Slide B',
    layout: 'statement',
    blocks: [
      { id: 'b-statement', type: 'heading', content: 'Slide B', style: { level: 1 }, sourceIds: [], slot: 'statement', positionMode: 'slot' },
      { id: 'b-support', type: 'text', content: sentences(6), style: {}, sourceIds: [], slot: 'subtitle', positionMode: 'slot' },
    ],
    speakerNotes: '',
    sources: [],
    interactions: [],
    density: 'medium',
    layoutBindings: [
      { slot: 'statement', blockIds: ['b-statement'], flow: 'stack', gap: 8 },
      { slot: 'support', blockIds: ['b-support'], flow: 'stack', gap: 8 },
    ],
  };
  return { ...deck, slides: [slideA, slideB] };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

describe('repairSlide', () => {
  it('returns accepted and converged for an already-clean slide without mutations', () => {
    const slide = deck.slides[0];
    const result = repairSlide(deck, slide.id);
    expect(result.accepted).toBe(true);
    expect(result.converged).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.operations).toHaveLength(0);
    expect(result.commands).toHaveLength(0);
    expect(result.iterationCount).toBe(0);
    expect(result.attempts).toHaveLength(0);
    expect(result.deck.slides.find((s) => s.id === slide.id)).toEqual(slide);
  });

  it('trims overflowing supporting text into a valid slide when text reduction is approved', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const broken = { ...deck, slides: [overlong] };
    expect(hasBlockingIssues(measureSlide(broken, overlong))).toBe(true);

    const result = repairSlide(broken, 's-test', 3, true);
    expect(result.accepted).toBe(true);
    expect(result.converged).toBe(true);
    expect(result.attempts.length).toBeGreaterThan(0);
    expect(result.operations.length).toBeGreaterThan(0);

    const repaired = result.deck.slides.find((s) => s.id === 's-test')!;
    expect(hasBlockingIssues(measureSlide(result.deck, repaired))).toBe(false);
  });

  it('stops and rejects when no repair resolves the issue', () => {
    const hopeless = statementSlide('b-support', sentences(1, 700));
    const broken = { ...deck, slides: [hopeless] };
    expect(hasBlockingIssues(measureSlide(broken, hopeless))).toBe(true);

    const result = repairSlide(broken, 's-test');
    expect(result.accepted).toBe(false);
    expect(result.converged).toBe(false);
    expect(result.attempts).toHaveLength(3);
    expect(result.iterationCount).toBe(3);
  });

  it('repairDeck processes every slide', () => {
    const results = repairDeck(deck);
    expect(results).toHaveLength(deck.slides.length);
    for (const result of results) {
      expect(result.accepted).toBe(true);
    }
  });
});

describe('convergence and hashing', () => {
  it('hashDeck is deterministic and differs when a block content changes', () => {
    const d1 = loadSeedDeck();
    const d2 = loadSeedDeck();
    expect(hashDeck(d1)).toBe(hashDeck(d2));

    const block = d2.slides[0].blocks.find((b) => typeof b.content === 'string')!;
    block.content = `${block.content} extra`;
    expect(hashDeck(d1)).not.toBe(hashDeck(d2));
  });

  it('stops a pathological non-converging loop within maxAttempts and reports converged=false', () => {
    const pathological = chapterSlide('b-chapter-body', sentences(3));
    const broken = { ...deck, slides: [pathological] };
    expect(hasBlockingIssues(measureSlide(broken, pathological))).toBe(true);

    const result = repairSlide(broken, 's-chapter', 3, true);
    expect(result.accepted).toBe(false);
    expect(result.converged).toBe(false);
    expect(result.iterationCount).toBeLessThanOrEqual(3);
    expect(result.attempts.length).toBeLessThanOrEqual(3);
    expect(result.operations.length).toBeGreaterThan(0);
    expect(hasBlockingIssues(measureSlide(result.deck, result.deck.slides.find((s) => s.id === 's-chapter')!))).toBe(true);
  });
});

describe('slot scope (C-02)', () => {
  it('repair of slide B never borrows slots declared only on slide A', () => {
    const broken = crossSlotDeck();
    const slideB = broken.slides.find((s) => s.id === 's-b')!;
    expect(hasBlockingIssues(measureSlide(broken, slideB))).toBe(true);

    const result = repairSlide(broken, 's-b', 3, true);
    expect(result.accepted).toBe(true);
    expect(result.converged).toBe(true);

    expect(result.warnings.some((w) => w.code === 'slot-scope-violation' && w.slot === 'subtitle')).toBe(true);
    const refused = result.operations.find((op) => op.code === 'repair-slot-scope-violation');
    expect(refused).toBeDefined();
    expect(refused?.approved).toBe(false);
    expect(refused?.requiresApproval).toBe(true);

    const appliedSlotRepairs = result.operations.filter(
      (op) => op.approved === true && op.code === 'repair-tighten-spacing',
    );
    expect(appliedSlotRepairs).toHaveLength(0);
    for (const op of result.operations) {
      if (op.approved === true && op.slot === 'subtitle') expect(op.code).toBe('repair-trim-text');
    }

    const repairedB = result.deck.slides.find((s) => s.id === 's-b')!;
    expect(repairedB.layoutBindings?.some((binding) => binding.slot === 'subtitle')).toBe(false);

    const repairedA = result.deck.slides.find((s) => s.id === 's-a')!;
    const aSub = repairedA.layoutBindings?.find((binding) => binding.slot === 'subtitle');
    expect(aSub?.blockIds).toEqual(['a-sub']);
  });
});

describe('semantic risk and approval (C-04)', () => {
  it('low-risk operations apply without approval and are tagged low', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const broken = { ...deck, slides: [overlong] };
    const result = repairSlide(broken, 's-test');

    const tighten = result.operations.find((op) => op.code === 'repair-tighten-spacing');
    expect(tighten).toBeDefined();
    expect(tighten?.semanticRisk).toBe('low');
    expect(tighten?.requiresApproval).toBe(false);
    expect(tighten?.approved).toBe(true);
  });

  it('medium-risk operations are not auto-applied when approveRisk is false', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const broken = { ...deck, slides: [overlong] };
    const result = repairSlide(broken, 's-test');

    expect(result.accepted).toBe(false);
    expect(result.blockedOnApproval).toBe(true);
    expect(result.semanticRisk).toBe('medium');

    const proposed = result.operations.filter((op) => op.requiresApproval);
    expect(proposed.length).toBeGreaterThan(0);
    for (const op of proposed) {
      expect(op.semanticRisk).toBe('medium');
      expect(op.approved).toBe(false);
    }

    const support = result.deck.slides.find((s) => s.id === 's-test')!.blocks.find((b) => b.id === 'b-support')!;
    expect(support.content).toBe(overlong.blocks[1].content);
    expect(hasBlockingIssues(measureSlide(result.deck, result.deck.slides[0]))).toBe(true);
  });

  it('medium-risk operations are applied when approveRisk is true', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const broken = { ...deck, slides: [overlong] };
    const result = repairSlide(broken, 's-test', 3, true);

    expect(result.accepted).toBe(true);
    expect(result.converged).toBe(true);
    expect(result.semanticRisk).toBe('medium');

    const trim = result.operations.find((op) => op.code === 'repair-trim-text');
    expect(trim).toBeDefined();
    expect(trim?.semanticRisk).toBe('medium');
    expect(trim?.requiresApproval).toBe(true);
    expect(trim?.approved).toBe(true);

    expect(hasBlockingIssues(measureSlide(result.deck, result.deck.slides[0]))).toBe(false);
  });
});

describe('immutability', () => {
  it('repair does not throw on a deep-frozen input and returns a distinct object', () => {
    const frozen = deepFreeze(loadSeedDeck());
    expect(() => repairSlide(frozen, frozen.slides[0].id)).not.toThrow();
    const result = repairSlide(frozen, frozen.slides[0].id);
    expect(result.deck).not.toBe(frozen);
    expect(result.deck.slides[0]).toEqual(frozen.slides[0]);
  });

  it('input deck is never mutated even when repairs are applied', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const frozen = deepFreeze({ ...deck, slides: [overlong] });
    const result = repairSlide(frozen, 's-test', 3, true);
    expect(result.accepted).toBe(true);
    expect(result.deck).not.toBe(frozen);
    expect(frozen.slides[0].blocks[1].content).toBe(sentences(6));
    expect(frozen.slides[0].layoutBindings?.[1].gap).toBe(8);
  });
});
