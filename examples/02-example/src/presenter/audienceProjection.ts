import type { DeckProject, DeckSlide } from '../deck/types';

/**
 * Audience-slide projection (P0-006 / DF-016).
 *
 * The presenter, overview, speaker view, progress, deep links, and export
 * selection must all consume the same projection so hidden slides never leak
 * to an audience. A hidden slide stays in the editor deck but is absent here.
 */
export interface AudienceSlide {
  sourceSlideId: string;
  audienceIndex: number;
  slide: DeckSlide;
}

export function projectAudienceSlides(deck: DeckProject): AudienceSlide[] {
  return deck.slides
    .filter((slide) => !slide.hidden)
    .map((slide, audienceIndex) => ({
      sourceSlideId: slide.id,
      audienceIndex,
      slide,
    }));
}

/** Map an audience index to its source slide id (used for deep links). */
export function sourceSlideIdAt(deck: DeckProject, audienceIndex: number): string | undefined {
  return projectAudienceSlides(deck)[audienceIndex]?.sourceSlideId;
}

/** Resolve a source slide id to an audience index, or -1 when hidden/missing. */
export function audienceIndexOf(deck: DeckProject, sourceSlideId: string): number {
  return projectAudienceSlides(deck).findIndex((entry) => entry.sourceSlideId === sourceSlideId);
}
