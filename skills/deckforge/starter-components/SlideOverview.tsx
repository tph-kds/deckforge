import React from 'react';
import type { DeckProject, SlideId } from './deck-types';

export function SlideOverview({
  deck,
  activeSlideId,
  renderThumbnail,
  onChoose,
  onClose,
}: {
  deck: DeckProject;
  activeSlideId: SlideId;
  renderThumbnail(slideId: SlideId): React.ReactNode;
  onChoose(slideId: SlideId): void;
  onClose(): void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Slide overview" className="deck-overview">
      <button type="button" onClick={onClose}>Close overview</button>
      <ol>
        {deck.slides.filter((slide) => !slide.hidden).map((slide, index) => (
          <li key={slide.id}>
            <button
              type="button"
              aria-current={slide.id === activeSlideId ? 'page' : undefined}
              onClick={() => onChoose(slide.id)}
            >
              {renderThumbnail(slide.id)}
              <span>{index + 1}. {slide.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
