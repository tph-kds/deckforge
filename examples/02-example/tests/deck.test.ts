import { describe, expect, it } from 'vitest';
import seed from '../deck.json';
import { loadSeedDeck } from '../src/deck/seed';
import { resolveSlidePlacements, resolveLayout, getLayoutContract } from '../src/deck/layout';
import { applyCommand, applyCommandWithResult } from '../src/deck/commands';
import type { Block } from '../src/deck/types';
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

describe('duplicate slide (P0-002 / DF-011)', () => {
  it('inserts a deep copy after the source slide', () => {
    const deck = loadSeedDeck();
    const sourceIndex = deck.slides.findIndex((slide) => slide.id === 's1');
    const outcome = applyCommandWithResult(deck, { type: 'duplicateSlide', slideId: 's1' });
    expect(outcome.deck.slides).toHaveLength(deck.slides.length + 1);
    expect(outcome.deck.slides[sourceIndex + 1].title).toContain('(copy)');
    expect(outcome.deck.slides[sourceIndex + 1].id).not.toBe('s1');
    expect(outcome.createdIds).toContain(outcome.deck.slides[sourceIndex + 1].id);
  });

  it('keeps the original slide untouched', () => {
    const deck = loadSeedDeck();
    const before = deck.slides[0];
    const outcome = applyCommandWithResult(deck, { type: 'duplicateSlide', slideId: 's1' });
    expect(outcome.deck.slides[0]).toBe(before);
    expect(outcome.deck.slides[0].id).toBe('s1');
    expect(outcome.deck.slides[0].blocks).toEqual(before.blocks);
  });

  it('gives every block in the copy a unique id and rebinds to it', () => {
    const deck = loadSeedDeck();
    const outcome = applyCommandWithResult(deck, { type: 'duplicateSlide', slideId: 's1' });
    const copy = outcome.deck.slides[deck.slides.findIndex((slide) => slide.id === 's1') + 1];
    const ids = copy.blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
    const allIds = deck.slides.flatMap((slide) => slide.blocks.map((block) => block.id));
    for (const id of ids) {
      expect(allIds).not.toContain(id);
    }
    const bound = copy.layoutBindings?.flatMap((binding) => binding.blockIds) ?? [];
    for (const id of ids) {
      expect(bound).toContain(id);
    }
  });

  it('remaps the focal block to the copy id', () => {
    const deck = loadSeedDeck();
    const source = deck.slides.find((slide) => slide.id === 's1')!;
    const withFocal = { ...source, focalBlockId: source.blocks[1].id };
    const patched = { ...deck, slides: deck.slides.map((slide) => (slide.id === 's1' ? withFocal : slide)) };
    const outcome = applyCommandWithResult(patched, { type: 'duplicateSlide', slideId: 's1' });
    const copy = outcome.deck.slides[0 + 1];
    expect(copy.focalBlockId).toBeDefined();
    expect(copy.focalBlockId).not.toBe(withFocal.focalBlockId);
    expect(copy.blocks.some((block) => block.id === copy.focalBlockId)).toBe(true);
  });

  it('undo removes the duplicate and redo restores the same logical copy', () => {
    const deck = loadSeedDeck();
    const duplicated = applyCommandWithResult(deck, { type: 'duplicateSlide', slideId: 's1' }).deck;
    const undone = applyCommandWithResult(duplicated, { type: 'replaceDeck', deck }).deck;
    expect(undone.slides).toHaveLength(deck.slides.length);
    const redone = applyCommandWithResult(undone, { type: 'replaceDeck', deck: duplicated }).deck;
    expect(redone.slides).toHaveLength(deck.slides.length + 1);
  });
});

describe('lossless layout migration (P0-003 / DF-012)', () => {
  it('migrates bindings when the layout changes and keeps every block', () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const next = applyCommand(deck, { type: 'updateSlideLayout', slideId: slide.id, layout: 'big-number' });
    const migrated = next.slides[0];
    expect(migrated.layout).toBe('big-number');
    expect(migrated.blocks).toHaveLength(slide.blocks.length);
    const bound = new Set(migrated.layoutBindings?.flatMap((binding) => binding.blockIds) ?? []);
    for (const block of migrated.blocks) {
      if (block.positionMode === 'background' || block.positionMode === 'freeform') continue;
      expect(bound.has(block.id), `block ${block.id} must stay bound`).toBe(true);
    }
  });

  it('keeps the title heading bound to a title slot when available', () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const next = applyCommand(deck, { type: 'updateSlideLayout', slideId: slide.id, layout: 'two-column' });
    const migrated = next.slides[0];
    const titleBinding = migrated.layoutBindings?.find((binding) => binding.slot === 'title');
    expect(titleBinding?.blockIds.length).toBe(1);
    const titleBlock = migrated.blocks.find((block) => block.id === titleBinding!.blockIds[0]);
    expect(titleBlock?.type).toBe('heading');
  });

  it('does not drop blocks when switching to a layout without a visual slot', () => {
    const deck = loadSeedDeck();
    const slide = deck.slides[0];
    const next = applyCommand(deck, { type: 'updateSlideLayout', slideId: slide.id, layout: 'statement' });
    const migrated = next.slides[0];
    expect(migrated.blocks).toHaveLength(slide.blocks.length);
    const bound = new Set(migrated.layoutBindings?.flatMap((binding) => binding.blockIds) ?? []);
    for (const block of migrated.blocks) {
      if (block.positionMode === 'background' || block.positionMode === 'freeform') continue;
      expect(bound.has(block.id)).toBe(true);
    }
  });
});

describe('title/heading unification (P0-004 / DF-014)', () => {
  it('updates the visible heading when the slide title changes', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'updateSlideTitle', slideId: 's1', title: 'Renamed title' });
    expect(next.slides[0].title).toBe('Renamed title');
    const heading = next.slides[0].blocks.find((block) => block.type === 'heading');
    expect(heading?.content).toBe('Renamed title');
  });

  it('keeps slide title in sync when the visible heading is edited', () => {
    const deck = loadSeedDeck();
    const next = applyCommand(deck, { type: 'updateBlockContent', slideId: 's1', blockId: 'b2', content: 'Edited on canvas' });
    expect(next.slides[0].title).toBe('Edited on canvas');
    expect(next.slides[0].blocks.find((block) => block.id === 'b2')?.content).toBe('Edited on canvas');
  });
});

describe('command results (P0-007 / DF-015)', () => {
  it('reports created ids for addBlock', () => {
    const deck = loadSeedDeck();
    const block = { id: 'b-new', type: 'text', content: 'x', style: {}, sourceIds: [], slot: 'left' } as Block;
    const outcome = applyCommandWithResult(deck, { type: 'addBlock', slideId: 's1', block, slot: 'left' });
    expect(outcome.createdIds).toEqual(['b-new']);
    expect(outcome.affectedSlideIds).toEqual(['s1']);
  });

  it('reports created ids for duplicateBlock so the editor can select the copy', () => {
    const deck = loadSeedDeck();
    const outcome = applyCommandWithResult(deck, { type: 'duplicateBlock', slideId: 's1', blockId: 'b2' });
    expect(outcome.createdIds).toHaveLength(1);
    const copy = outcome.deck.slides[0].blocks.find((block) => block.id === outcome.createdIds[0]);
    expect(copy).toBeDefined();
    expect(copy?.content).toBe('The page you ship has a weight.');
  });

  it('reports removed ids for removeBlock', () => {
    const deck = loadSeedDeck();
    const outcome = applyCommandWithResult(deck, { type: 'removeBlock', slideId: 's1', blockId: 'b3' });
    expect(outcome.removedIds).toEqual(['b3']);
  });
});

describe('style change (edit.style.change)', () => {
  it('merges style patches onto a block and reports the affected slide', () => {
    const deck = loadSeedDeck();
    const before = deck.slides[0].blocks.find((block) => block.id === 'b2')!;
    const outcome = applyCommandWithResult(deck, { type: 'updateBlockStyle', slideId: 's1', blockId: 'b2', style: { level: 2 } });
    const after = outcome.deck.slides[0].blocks.find((block) => block.id === 'b2')!;
    expect(after.style).toEqual({ ...before.style, level: 2 });
    expect(outcome.affectedSlideIds).toEqual(['s1']);
  });

  it('keeps unrelated block styles unchanged', () => {
    const deck = loadSeedDeck();
    const other = deck.slides[0].blocks.find((block) => block.id === 'b1')!;
    const outcome = applyCommandWithResult(deck, { type: 'updateBlockStyle', slideId: 's1', blockId: 'b2', style: { level: 2 } });
    expect(outcome.deck.slides[0].blocks.find((block) => block.id === 'b1')!.style).toEqual(other.style);
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
