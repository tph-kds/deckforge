import React from 'react';
import type { DeckSlide } from './deck-types';

export function SpeakerView({
  current,
  next,
  elapsedLabel,
  renderPreview,
  onPrevious,
  onNext,
}: {
  current: DeckSlide;
  next?: DeckSlide;
  elapsedLabel: string;
  renderPreview(slide: DeckSlide): React.ReactNode;
  onPrevious(): void;
  onNext(): void;
}) {
  return (
    <main className="speaker-view">
      <section aria-label="Current slide">{renderPreview(current)}</section>
      <section aria-label="Next slide">{next ? renderPreview(next) : <p>End of deck</p>}</section>
      <aside aria-label="Speaker notes"><h2>Notes</h2><p>{current.speakerNotes || 'No notes'}</p></aside>
      <footer>
        <time aria-label="Elapsed presentation time">{elapsedLabel}</time>
        <button type="button" onClick={onPrevious}>Previous</button>
        <button type="button" onClick={onNext}>Next</button>
      </footer>
    </main>
  );
}
