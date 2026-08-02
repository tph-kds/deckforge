import React from 'react';
import type { DeckProject, SaveState, SlideId } from './deck-types';
import { SaveStatus } from './SaveStatus';

export type DeckEditorShellProps = {
  deck: DeckProject;
  activeSlideId: SlideId;
  saveState: SaveState;
  toolbar: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  notes: React.ReactNode;
  onSelectSlide(id: SlideId): void;
  onAddSlide(): void;
  onDuplicateSlide(id: SlideId): void;
  onDeleteSlide(id: SlideId): void;
  onPresent(): void;
  onOpenShortcuts(): void;
};

export function DeckEditorShell(props: DeckEditorShellProps) {
  const { deck, activeSlideId, saveState, toolbar, canvas, inspector, notes } = props;
  return (
    <div className="deck-editor-shell" data-testid="deck-editor-shell">
      <header className="deck-editor-appbar">
        <div className="deck-document-title"><strong>{deck.meta.title}</strong><SaveStatus state={saveState} /></div>
        <div className="deck-editor-toolbar">{toolbar}</div>
        <div className="deck-app-actions"><button type="button" onClick={props.onOpenShortcuts}>Shortcuts <kbd>?</kbd></button><button type="button" className="primary" onClick={props.onPresent}>Present</button></div>
      </header>
      <nav aria-label="Slides" className="deck-slide-rail">
        <div className="deck-rail-head"><strong>Slides</strong><button type="button" onClick={props.onAddSlide} aria-label="Add slide">＋</button></div>
        {deck.slides.map((slide, index) => (
          <div className="deck-slide-row" key={slide.id} data-active={slide.id === activeSlideId}>
            <button className="deck-thumbnail" aria-current={slide.id === activeSlideId ? 'page' : undefined} onClick={() => props.onSelectSlide(slide.id)}><span>{index + 1}</span><span>{slide.title}</span></button>
            <div className="deck-slide-row-actions"><button onClick={() => props.onDuplicateSlide(slide.id)} aria-label={`Duplicate ${slide.title}`}>⧉</button><button onClick={() => props.onDeleteSlide(slide.id)} aria-label={`Delete ${slide.title}`}>×</button></div>
          </div>
        ))}
      </nav>
      <main className="deck-editor-canvas">{canvas}</main>
      <aside className="deck-properties-panel">{inspector}</aside>
      <footer className="deck-notes-area">{notes}</footer>
    </div>
  );
}
