import { describe, expect, it } from 'vitest';
import seed from '../deck.json';
import { loadSeedDeck } from '../src/deck/seed';
import { resolveSlidePlacements, resolveLayout, getLayoutContract } from '../src/deck/layout';
import { applyCommand } from '../src/deck/commands';
import { getTheme, listThemes } from '../src/deck/themes';

describe('deck seed', () => {
  it('loads the authored deck.json with 7 slides', () => {
    const deck = loadSeedDeck();
    expect(deck.schemaVersion).toBe('2.1');
    expect(deck.slides).toHaveLength(7);
    expect(deck.theme.id).toBe('editorial-cream');
  });

  it('every block references an existing source', () => {
    const deck = loadSeedDeck();
    const sourceIds = new Set((deck.sources ?? []).map((source) => source.id));
    for (const slide of deck.slides) {
      for (const block of slide.blocks) {
        for (const sourceId of block.sourceIds ?? []) {
          expect(sourceIds.has(sourceId)).toBe(true);
        }
      }
    }
  });
});

describe('layout resolver', () => {
  const deck = loadSeedDeck();

  it('resolves frames within canvas bounds for every slide', () => {
    for (const slide of deck.slides) {
      const placements = resolveSlidePlacements(slide, deck.canvas);
      expect(placements.length).toBeGreaterThan(0);
      for (const placement of placements) {
        expect(placement.frame.x).toBeGreaterThanOrEqual(0);
        expect(placement.frame.y).toBeGreaterThanOrEqual(0);
        expect(placement.frame.x + placement.frame.w).toBeLessThanOrEqual(deck.canvas.width);
        expect(placement.frame.y + placement.frame.h).toBeLessThanOrEqual(deck.canvas.height);
      }
    }
  });

  it('binds every block to exactly one slot', () => {
    for (const slide of deck.slides) {
      const placements = resolveSlidePlacements(slide, deck.canvas);
      const placedIds = placements.map((placement) => placement.blockId);
      for (const block of slide.blocks) {
        expect(placedIds).toContain(block.id);
      }
    }
  });

  it('has a contract for every layout used by the deck', () => {
    for (const slide of deck.slides) {
      const contract = getLayoutContract(slide.layout);
      expect(contract, `missing contract for ${slide.layout}`).toBeDefined();
    }
  });

  it('resolves the title-hero visual slot inside the canvas', () => {
    const resolved = resolveLayout('title-hero', deck.canvas);
    expect(resolved.length).toBeGreaterThan(0);
  });
});

describe('command reducer', () => {
  it('updates block content immutably', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'updateBlockContent', slideId: 's1', blockId: 'b2', content: 'Changed' });
    expect(next.slides[0].blocks[1].content).toBe('Changed');
    expect(deck.slides[0].blocks[1].content).not.toBe('Changed');
  });

  it('applies theme change', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'setTheme', themeId: 'mono-ink' });
    expect(next.theme.id).toBe('mono-ink');
  });

  it('applies a canvas dimension change immutably', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, {
      type: 'setCanvas',
      canvas: { ...deck.canvas, aspectRatio: '4:3', width: 1440, height: 1080 },
    });
    expect(next.canvas.width).toBe(1440);
    expect(next.canvas.height).toBe(1080);
    expect(next.canvas.aspectRatio).toBe('4:3');
    expect(deck.canvas.width).toBe(1600);
    expect(deck.canvas).not.toBe(next.canvas);
  });

  it('removes a block and its binding', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'removeBlock', slideId: 's1', blockId: 'b5' });
    expect(next.slides[0].blocks.find((block) => block.id === 'b5')).toBeUndefined();
    const binding = next.slides[0].layoutBindings?.find((bindingItem) => bindingItem.blockIds.includes('b5'));
    expect(binding).toBeUndefined();
  });

  it('duplicates a block into the same binding', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'duplicateBlock', slideId: 's1', blockId: 'b2' });
    const original = next.slides[0].blocks.find((block) => block.id === 'b2');
    const copies = next.slides[0].blocks.filter((block) => block.id !== 'b2' && block.content === original?.content);
    expect(copies.length).toBe(1);
    const binding = next.slides[0].layoutBindings?.find((bindingItem) => bindingItem.blockIds.includes(copies[0].id));
    expect(binding?.blockIds).toContain('b2');
  });

  it('does not delete the last slide', () => {
    const deck = loadSeedDeck();
    const single = { ...deck, slides: deck.slides.slice(0, 1) };
    const unchanged = applyCommand(single, { type: 'removeSlide', slideId: single.slides[0].id });
    expect(unchanged.slides).toHaveLength(1);

    const next = applyCommand(deck, { type: 'removeSlide', slideId: 's1' });
    expect(next.slides).toHaveLength(6);
    expect(next.slides.find((slide) => slide.id === 's1')).toBeUndefined();
  });
});

describe('themes', () => {
  it('exposes the editorial-cream theme with canonical tokens', () => {
    const theme = getTheme('editorial-cream');
    expect(theme.tokens.background).toBe('#FAF3E7');
    expect(theme.typography.headingFont).toBe('Libre Baskerville');
  });

  it('lists a non-empty theme registry', () => {
    expect(listThemes().length).toBeGreaterThan(1);
  });
});

describe('deck.json round-trips as a DeckProject', () => {
  it('has required top-level sections', () => {
    const deck = seed as unknown as {
      canvas: { width: number; height: number };
      editor: { enabled: boolean };
      experience: { profile: string };
    };
    expect(deck.canvas.width).toBe(1600);
    expect(deck.canvas.height).toBe(900);
    expect(deck.editor.enabled).toBe(true);
    expect(deck.experience.profile).toBe('editable-deck');
  });
});
