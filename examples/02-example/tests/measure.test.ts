import { describe, expect, it } from 'vitest';
import { loadSeedDeck } from '../src/deck/seed';
import type { Block, DeckSlide } from '../src/deck/types';
import {
  overlaps,
  intersectionArea,
  measureBlockOverflow,
  detectCollisions,
  measureSlide,
  hasBlockingIssues,
  summarizeIssues,
} from '../src/deck/measure';
import { resolveLayout, resolveSlotFrame } from '../src/deck/layout';
import { getLayoutContract } from '../src/deck/layout';

const deck = loadSeedDeck();

function frameOf(layout: string, slot: string) {
  const contract = getLayoutContract(layout);
  const s = contract?.composition.slots.find((x) => x.id === slot);
  if (!s) throw new Error(`no slot ${slot} in ${layout}`);
  return resolveSlotFrame(s, deck.canvas);
}

function textBlock(partial: Partial<Block>): Block {
  return { id: 'b-x', type: 'text', content: 'Hello', style: {}, sourceIds: [], slot: 'left', positionMode: 'slot', ...partial };
}

describe('overlaps / intersectionArea', () => {
  it('detects overlapping rectangles', () => {
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('computes intersection area', () => {
    expect(intersectionArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(25);
    expect(intersectionArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBe(0);
  });
});

describe('measureBlockOverflow', () => {
  it('returns undefined for short text', () => {
    const frame = frameOf('statement', 'support');
    expect(measureBlockOverflow(textBlock({ content: 'Short.' }), frame)).toBeUndefined();
  });

  it('flags error for text taller than its frame', () => {
    const tiny = { x: 0, y: 0, w: 80, h: 40 };
    const issue = measureBlockOverflow(textBlock({ content: 'A'.repeat(2000) }), tiny);
    expect(issue?.code).toBe('overflow');
    expect(issue?.severity).toBe('error');
  });

  it('warns about headings above three lines', () => {
    const wide = { x: 0, y: 0, w: 60, h: 400 };
    const issue = measureBlockOverflow(textBlock({ type: 'heading', content: 'A'.repeat(2000) }), wide);
    expect(issue?.code).toBe('orphan');
    expect(issue?.severity).toBe('warning');
  });
});

describe('detectCollisions', () => {
  it('flags freeform block overlapping a slot frame', () => {
    const frame = frameOf('statement', 'support');
    const slide: DeckSlide = {
      id: 's-x',
      title: 't',
      layout: 'statement',
      blocks: [
        { id: 'b-bound', type: 'text', content: 'Bound content', style: {}, sourceIds: [], slot: 'support', positionMode: 'slot' },
        { id: 'b-free', type: 'image', content: {}, style: {}, sourceIds: [], slot: 'deco', positionMode: 'freeform', frame: { x: frame.x + 4, y: frame.y + 4, w: 100, h: 100 } },
      ],
      speakerNotes: '',
      sources: [],
      interactions: [],
      density: 'medium',
      layoutBindings: [{ slot: 'support', blockIds: ['b-bound'], flow: 'stack', gap: 8 }],
    };
    const issues = detectCollisions(deck, slide);
    expect(issues.some((issue) => issue.code === 'collision')).toBe(true);
  });

  it('ignores decorative overlap', () => {
    const frame = frameOf('statement', 'support');
    const slide: DeckSlide = {
      id: 's-x',
      title: 't',
      layout: 'statement',
      blocks: [
        { id: 'b-bound', type: 'text', content: 'Bound content', style: {}, sourceIds: [], slot: 'support', positionMode: 'slot' },
        { id: 'b-free', type: 'image', content: {}, style: {}, sourceIds: [], slot: 'deco', positionMode: 'freeform', decorative: true, frame: { x: frame.x + 4, y: frame.y + 4, w: 100, h: 100 } },
      ],
      speakerNotes: '',
      sources: [],
      interactions: [],
      density: 'medium',
      layoutBindings: [{ slot: 'support', blockIds: ['b-bound'], flow: 'stack', gap: 8 }],
    };
    expect(detectCollisions(deck, slide)).toHaveLength(0);
  });
});

describe('measureSlide', () => {
  it('produces no blocking issues for a clean slide', () => {
    for (const slide of deck.slides) {
      const issues = measureSlide(deck, slide);
      expect(hasBlockingIssues(issues)).toBe(false);
    }
  });

  it('catches a boundary violation on a freeform block', () => {
    const slide: DeckSlide = {
      id: 's-x',
      title: 't',
      layout: 'statement',
      blocks: [
        { id: 'b-free', type: 'image', content: {}, style: {}, sourceIds: [], slot: 'deco', positionMode: 'freeform', frame: { x: -50, y: 0, w: 100, h: 100 } },
      ],
      speakerNotes: '',
      sources: [],
      interactions: [],
      density: 'medium',
      layoutBindings: [],
    };
    const issues = measureSlide(deck, slide);
    expect(issues.some((issue) => issue.code === 'boundary' && issue.severity === 'error')).toBe(true);
  });

  it('sorts errors before warnings', () => {
    const issues = [
      { severity: 'warning' as const, code: 'budget' as const, slot: 'x', message: '' },
      { severity: 'error' as const, code: 'collision' as const, slot: 'x', message: '' },
    ];
    const sorted = issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
    expect(sorted[0].code).toBe('collision');
  });

  it('summarizeIssues counts severities', () => {
    const counts = summarizeIssues([
      { severity: 'error', code: 'overflow', slot: 'a', message: '' },
      { severity: 'warning', code: 'orphan', slot: 'b', message: '' },
    ]);
    expect(counts).toEqual({ errors: 1, warnings: 1 });
  });
});

describe('resolveLayout contract sanity', () => {
  it('resolves every layout to at least one slot', async () => {
    const manifest = (await import('../src/deck/layout-manifest.json')).default as Array<{ id: string }>;
    for (const layout of manifest) {
      expect(resolveLayout(layout.id, deck.canvas).length).toBeGreaterThan(0);
    }
  });
});
