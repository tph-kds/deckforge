import React from 'react';
import type { DeckProject, SlideId } from './deck-types';

export type DeckEditorShellProps = {
  deck: DeckProject;
  activeSlideId: SlideId;
  toolbar: React.ReactNode;
  canvas: React.ReactNode;
  properties: React.ReactNode;
  onSelectSlide(id: SlideId): void;
};

export function DeckEditorShell({ deck, activeSlideId, toolbar, canvas, properties, onSelectSlide }: DeckEditorShellProps) {
  return (
    <div className="deck-editor-shell">
      <header className="deck-editor-toolbar">{toolbar}</header>
      <nav aria-label="Slides" className="deck-slide-rail">
        {deck.slides.map((slide, index) => (
          <button key={slide.id} aria-current={slide.id === activeSlideId ? 'page' : undefined} onClick={() => onSelectSlide(slide.id)}>
            <span>{index + 1}</span> {slide.title}
          </button>
        ))}
      </nav>
      <main className="deck-editor-canvas">{canvas}</main>
      <aside aria-label="Properties" className="deck-properties-panel">{properties}</aside>
    </div>
  );
}
