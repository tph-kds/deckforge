import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Block, DeckProject } from '../src/deck/types';
import { assignBlocksToLayers } from '../src/deck/layout';
import { gridColumnsForItemCount, SlideRenderer } from '../src/render/SlideRenderer';
import { applyCommandWithResult } from '../src/deck/commands';

describe('deterministic grid columns (plan §6.3)', () => {
  it('uses one column for a single item', () => {
    expect(gridColumnsForItemCount(1)).toBe(1);
  });

  it('uses two columns for pairs and quads', () => {
    expect(gridColumnsForItemCount(2)).toBe(2);
    expect(gridColumnsForItemCount(4)).toBe(2);
  });

  it('uses three columns for triples and larger sets', () => {
    expect(gridColumnsForItemCount(3)).toBe(3);
    expect(gridColumnsForItemCount(5)).toBe(3);
    expect(gridColumnsForItemCount(6)).toBe(3);
    expect(gridColumnsForItemCount(9)).toBe(3);
  });

  it('is deterministic and stable across calls', () => {
    const a = Array.from({ length: 12 }, (_, i) => gridColumnsForItemCount(i + 1));
    const b = Array.from({ length: 12 }, (_, i) => gridColumnsForItemCount(i + 1));
    expect(a).toEqual(b);
  });
});

const SMOKE_CANVAS = { aspectRatio: '16:9' as const, width: 1600, height: 900, safeMargin: 64 };

function makeLayerDeck(): DeckProject {
  return {
    schemaVersion: '2.1',
    meta: { id: 'smoke', slug: 'smoke', title: 'Smoke', language: 'en' },
    canvas: SMOKE_CANVAS,
    theme: { id: 'editorial-cream' },
    presentation: { motionProfileId: 'none', defaultBuilds: false },
    editor: { enabled: false },
    slides: [
      {
        id: 's-layers',
        title: 'Layers',
        layout: 'title-hero',
        blocks: [
          { id: 'b-title', type: 'heading', content: 'SLOT-TITLE-MARKER', style: { level: 1 }, slot: 'title', positionMode: 'slot' },
          { id: 'b-float', type: 'text', content: 'FREEFORM-MARKER', slot: 'title', positionMode: 'freeform', frame: { x: 1000, y: 64, w: 400, h: 80 } },
          { id: 'b-bg', type: 'text', content: 'BACKGROUND-MARKER', positionMode: 'background' },
        ],
        layoutBindings: [{ slot: 'title', blockIds: ['b-title', 'b-float'], flow: 'stack', gap: 8 }],
      },
    ],
  };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('assignBlocksToLayers (P0-005 exclusive layers)', () => {
  it('keeps a freeform block carrying a slot value off the slot layer even when a binding lists it', () => {
    const deck = makeLayerDeck();
    const slide = deck.slides[0];
    const layers = assignBlocksToLayers(slide, deck.canvas);

    expect(layers.slotFlow.map((entry) => entry.block.id)).toEqual(['b-title']);
    expect(layers.freeform.map((entry) => entry.block.id)).toEqual(['b-float']);
    expect(layers.background.map((entry) => entry.block.id)).toEqual(['b-bg']);
  });

  it('assigns every block id to exactly one layer', () => {
    const deck = makeLayerDeck();
    const layers = assignBlocksToLayers(deck.slides[0], deck.canvas);
    const all = [...layers.slotFlow, ...layers.freeform, ...layers.background].map((entry) => entry.block.id);
    const counts = new Map<string, number>();
    for (const id of all) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect([...counts.values()].every((count) => count === 1)).toBe(true);
    expect(all).toHaveLength(deck.slides[0].blocks.length);
  });

  it('places slot/flow blocks in responsive (slot) order', () => {
    const deck = makeLayerDeck();
    const slide = deck.slides[0];
    slide.blocks = [
      { id: 'b-kicker', type: 'text', content: 'kicker', slot: 'kicker', positionMode: 'slot' },
      { id: 'b-title', type: 'heading', content: 'title', style: { level: 1 }, slot: 'title', positionMode: 'slot' },
      { id: 'b-float', type: 'text', content: 'freeform', slot: 'title', positionMode: 'freeform', frame: { x: 100, y: 100, w: 100, h: 100 } },
      { id: 'b-bg', type: 'text', content: 'bg', positionMode: 'background' },
    ];
    slide.layoutBindings = [
      { slot: 'kicker', blockIds: ['b-kicker'], flow: 'stack', gap: 8 },
      { slot: 'title', blockIds: ['b-title'], flow: 'stack', gap: 8 },
    ];
    const layers = assignBlocksToLayers(slide, deck.canvas);
    expect(layers.slotFlow.map((entry) => entry.block.id)).toEqual(['b-kicker', 'b-title']);
  });
});

describe('SlideRenderer exclusive-layer smoke render (P0-005)', () => {
  it('renders each block content exactly once on the presenter surface', () => {
    const deck = makeLayerDeck();
    const markup = renderToStaticMarkup(
      createElement(SlideRenderer, { deck, slide: deck.slides[0], surface: 'presenter' }),
    );
    expect(countOccurrences(markup, 'SLOT-TITLE-MARKER')).toBe(1);
    expect(countOccurrences(markup, 'FREEFORM-MARKER')).toBe(1);
    expect(countOccurrences(markup, 'BACKGROUND-MARKER')).toBe(1);
  });

  it('emits exactly one data-block-id per block on the editor surface', () => {
    const deck = makeLayerDeck();
    const markup = renderToStaticMarkup(
      createElement(SlideRenderer, { deck, slide: deck.slides[0], surface: 'editor', interactive: true }),
    );
    for (const id of ['b-title', 'b-float', 'b-bg']) {
      expect(countOccurrences(markup, `data-block-id="${id}"`)).toBe(1);
    }
  });

  it('renders background before slot groups before freeform in DOM order', () => {
    const deck = makeLayerDeck();
    const markup = renderToStaticMarkup(
      createElement(SlideRenderer, { deck, slide: deck.slides[0], surface: 'presenter' }),
    );
    const bgIndex = markup.indexOf('BACKGROUND-MARKER');
    const slotIndex = markup.indexOf('SLOT-TITLE-MARKER');
    const freeformIndex = markup.indexOf('FREEFORM-MARKER');
    expect(bgIndex).toBeGreaterThan(-1);
    expect(slotIndex).toBeGreaterThan(bgIndex);
    expect(freeformIndex).toBeGreaterThan(slotIndex);
  });
});

describe('media insert-and-render behavioral test (edit.media.insert)', () => {
  it('adds an image block, binds it to a visual slot, and renders its URL on the presenter surface', () => {
    const deck = makeLayerDeck();
    const imageBlock: Block = {
      id: 'b-media',
      type: 'image',
      content: { src: 'https://example.com/cover.png', fit: 'cover' },
      style: {},
      alt: 'Cover image',
      sourceIds: [],
      positionMode: 'slot',
    };
    const outcome = applyCommandWithResult(deck, {
      type: 'addBlock',
      slideId: 's-layers',
      block: imageBlock,
      slot: 'visual',
    });
    expect(outcome.createdIds).toContain('b-media');
    const slide = outcome.deck.slides[0];
    const bound = slide.layoutBindings?.find((binding) => binding.slot === 'visual');
    expect(bound?.blockIds).toContain('b-media');

    const markup = renderToStaticMarkup(
      createElement(SlideRenderer, { deck: outcome.deck, slide, surface: 'presenter' }),
    );
    expect(markup).toContain('https://example.com/cover.png');
  });

  it('renders a placeholder image block when inserted without an asset', () => {
    const deck = makeLayerDeck();
    const imageBlock: Block = {
      id: 'b-media-empty',
      type: 'image',
      content: { assetId: '', fit: 'cover' },
      style: {},
      alt: 'Image',
      sourceIds: [],
      positionMode: 'slot',
    };
    const outcome = applyCommandWithResult(deck, {
      type: 'addBlock',
      slideId: 's-layers',
      block: imageBlock,
      slot: 'visual',
    });
    const slide = outcome.deck.slides[0];
    const markup = renderToStaticMarkup(
      createElement(SlideRenderer, { deck: outcome.deck, slide, surface: 'presenter' }),
    );
    expect(markup).toContain('block-image is-placeholder');
  });
});
