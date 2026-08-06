import { describe, expect, it } from 'vitest';
import { loadSeedDeck } from '../src/deck/seed';
import {
  audienceIndexOf,
  projectAudienceSlides,
  sourceSlideIdAt,
} from '../src/presenter/audienceProjection';

describe('audience projection (P0-006 / DF-016)', () => {
  it('projects every visible slide in order with audience indices', () => {
    const deck = loadSeedDeck();
    const projected = projectAudienceSlides(deck);
    expect(projected).toHaveLength(deck.slides.length);
    projected.forEach((entry, index) => {
      expect(entry.audienceIndex).toBe(index);
      expect(entry.sourceSlideId).toBe(deck.slides[index].id);
      expect(entry.slide).toBe(deck.slides[index]);
    });
  });

  it('omits hidden slides from the audience projection', () => {
    const deck = loadSeedDeck();
    const hidden = deck.slides[2];
    const patched = { ...deck, slides: deck.slides.map((slide) => (slide.id === hidden.id ? { ...slide, hidden: true } : slide)) };
    const projected = projectAudienceSlides(patched);
    expect(projected).toHaveLength(deck.slides.length - 1);
    expect(projected.some((entry) => entry.sourceSlideId === hidden.id)).toBe(false);
    expect(projected[2].sourceSlideId).toBe(deck.slides[3].id);
    expect(projected[2].audienceIndex).toBe(2);
  });

  it('resolves source slide ids to audience indices and back', () => {
    const deck = loadSeedDeck();
    expect(audienceIndexOf(deck, deck.slides[0].id)).toBe(0);
    expect(audienceIndexOf(deck, deck.slides[deck.slides.length - 1].id)).toBe(deck.slides.length - 1);
    expect(sourceSlideIdAt(deck, 0)).toBe(deck.slides[0].id);
    expect(sourceSlideIdAt(deck, 999)).toBeUndefined();
  });

  it('maps a deep link to a hidden slide to -1', () => {
    const deck = loadSeedDeck();
    const hidden = deck.slides[1];
    const patched = { ...deck, slides: deck.slides.map((slide) => (slide.id === hidden.id ? { ...slide, hidden: true } : slide)) };
    expect(audienceIndexOf(patched, hidden.id)).toBe(-1);
  });
});
