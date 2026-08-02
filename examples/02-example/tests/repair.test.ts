import { describe, expect, it } from 'vitest';
import { loadSeedDeck } from '../src/deck/seed';
import { measureSlide, hasBlockingIssues } from '../src/deck/measure';
import { repairSlide, repairDeck } from '../src/deck/repair';
import type { DeckSlide } from '../src/deck/types';

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

describe('repairSlide', () => {
  it('returns accepted for an already-clean slide without mutations', () => {
    const slide = deck.slides[0];
    const result = repairSlide(deck, slide.id);
    expect(result.accepted).toBe(true);
    expect(result.attempts).toHaveLength(0);
    expect(result.deck.slides.find((s) => s.id === slide.id)).toEqual(slide);
  });

  it('trims overflowing supporting text into a valid slide', () => {
    const overlong = statementSlide('b-support', sentences(6));
    const broken = { ...deck, slides: [overlong] };
    expect(hasBlockingIssues(measureSlide(broken, overlong))).toBe(true);

    const result = repairSlide(broken, 's-test');
    expect(result.accepted).toBe(true);
    expect(result.attempts.length).toBeGreaterThan(0);

    const repaired = result.deck.slides.find((s) => s.id === 's-test')!;
    expect(hasBlockingIssues(measureSlide(result.deck, repaired))).toBe(false);
  });

  it('stops and rejects when no repair resolves the issue', () => {
    const hopeless = statementSlide('b-support', sentences(1, 700));
    const broken = { ...deck, slides: [hopeless] };
    expect(hasBlockingIssues(measureSlide(broken, hopeless))).toBe(true);

    const result = repairSlide(broken, 's-test');
    expect(result.accepted).toBe(false);
    expect(result.attempts).toHaveLength(3);
  });

  it('repairDeck processes every slide', () => {
    const results = repairDeck(deck);
    expect(results).toHaveLength(deck.slides.length);
    for (const result of results) {
      expect(result.accepted).toBe(true);
    }
  });
});
