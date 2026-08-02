import { describe, expect, it } from 'vitest';
import seed from '../deck.json';
import { loadSeedDeck } from '../src/deck/seed';
import type { Block, DeckProject } from '../src/deck/types';
import {
  clampFocalPoint,
  focalPointToCss,
  imageContentOf,
  resolveAsset,
  resolveImage,
  validateImageBlock,
  validateDeckAssets,
  aspectRatioOf,
} from '../src/deck/assets';

const deck = loadSeedDeck();

function imageBlock(partial: Partial<Block>): Block {
  return {
    id: 'img-test',
    type: 'image',
    content: {},
    style: {},
    sourceIds: [],
    slot: 'visual',
    positionMode: 'slot',
    ...partial,
  };
}

describe('image content normalization', () => {
  it('reads legacy string content as src', () => {
    const block = imageBlock({ content: 'https://example.com/a.png' });
    expect(imageContentOf(block).src).toBe('https://example.com/a.png');
  });

  it('reads object content as-is', () => {
    const block = imageBlock({ content: { assetId: 'a1', fit: 'contain' } });
    const content = imageContentOf(block);
    expect(content.assetId).toBe('a1');
    expect(content.fit).toBe('contain');
  });
});

describe('asset resolution', () => {
  it('resolves a ready asset from the manifest', () => {
    const block = imageBlock({ content: { assetId: 'asset-book-cover' } });
    const resolved = resolveImage(deck, block);
    expect(resolved.status).toBe('ready');
    expect(resolved.src).toContain('images.unsplash.com');
  });

  it('falls back to a bare src when no manifest entry exists', () => {
    const block = imageBlock({ content: { src: 'https://example.com/x.jpg' } });
    expect(resolveImage(deck, block).status).toBe('ready');
  });

  it('flags a missing asset reference as failed', () => {
    const block = imageBlock({ content: { assetId: 'does-not-exist' } });
    expect(resolveImage(deck, block).status).toBe('failed');
  });

  it('flags a manifest entry marked failed', () => {
    const local: DeckProject = {
      ...deck,
      assets: [{ id: 'bad', kind: 'image', src: 'https://example.com/bad.jpg', status: 'failed' }],
    };
    const block = imageBlock({ content: { assetId: 'bad' } });
    expect(resolveImage(local, block).status).toBe('failed');
  });

  it('returns placeholder when there is no source at all', () => {
    const block = imageBlock({ content: {} });
    expect(resolveImage(deck, block).status).toBe('placeholder');
  });
});

describe('focal points', () => {
  it('clamps out-of-range focal values', () => {
    expect(clampFocalPoint({ x: 1.5, y: -0.3 })).toEqual({ x: 1, y: 0 });
    expect(clampFocalPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 });
  });

  it('defaults to center', () => {
    expect(clampFocalPoint(undefined)).toEqual({ x: 0.5, y: 0.5 });
    expect(clampFocalPoint({ x: 'nope' as never, y: 2 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it('renders object-position strings', () => {
    expect(focalPointToCss({ x: 0, y: 0 })).toBe('0.0% 0.0%');
    expect(focalPointToCss({ x: 1, y: 1 })).toBe('100.0% 100.0%');
  });
});

describe('asset validation', () => {
  it('errors on a meaningful image with no alt text', () => {
    const slide = deck.slides[0];
    const block = imageBlock({ content: { assetId: 'asset-book-cover' }, alt: '' });
    const issues = validateImageBlock(deck, slide, block);
    expect(issues.some((issue) => issue.code === 'missing-alt')).toBe(true);
  });

  it('passes a decorative image without alt text', () => {
    const slide = deck.slides[0];
    const block = imageBlock({ content: { assetId: 'asset-book-cover', decorative: true }, alt: '' });
    const issues = validateImageBlock(deck, slide, block);
    expect(issues.some((issue) => issue.code === 'missing-alt')).toBe(false);
  });

  it('errors on a block referencing a missing asset', () => {
    const slide = deck.slides[0];
    const block = imageBlock({ content: { assetId: 'nope' }, alt: 'Alt text' });
    const issues = validateImageBlock(deck, slide, block);
    expect(issues.some((issue) => issue.code === 'unknown-asset')).toBe(true);
  });

  it('warns when a manifest asset lacks intrinsic dimensions', () => {
    const slide = deck.slides[0];
    const local: DeckProject = {
      ...deck,
      assets: [{ id: 'dimless', kind: 'image', src: 'https://example.com/a.png' }],
    };
    const block = imageBlock({ content: { assetId: 'dimless' }, alt: 'Alt' });
    const issues = validateImageBlock(local, slide, block);
    expect(issues.some((issue) => issue.code === 'unknown-dimensions')).toBe(true);
  });
});

describe('deck-wide asset validation', () => {
  it('reports no errors for the seed deck', () => {
    const issues = validateDeckAssets(deck);
    const errors = issues.filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('resolves the seed asset manifest', () => {
    const asset = resolveAsset(deck, 'asset-book-cover');
    expect(asset).toBeDefined();
    expect(aspectRatioOf(asset)).toBeCloseTo(720 / 480, 3);
  });

  it('keeps deck.json schema shape (seed has an assets array)', () => {
    expect(Array.isArray((seed as unknown as { assets?: unknown[] }).assets)).toBe(true);
  });
});
