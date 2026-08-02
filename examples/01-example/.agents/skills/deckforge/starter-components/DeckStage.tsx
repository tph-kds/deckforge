import React from 'react';
import type { DeckProject, DeckSlide } from './deck-types';

export type DeckStageProps = {
  deck: DeckProject;
  slide: DeckSlide;
  mode: 'editor' | 'presenter' | 'viewer';
  renderBlock: (block: DeckSlide['blocks'][number]) => React.ReactNode;
};

export function DeckStage({ deck, slide, mode, renderBlock }: DeckStageProps) {
  const ratio = `${deck.canvas.width} / ${deck.canvas.height}`;
  return (
    <section
      aria-label={`Slide: ${slide.title}`}
      data-mode={mode}
      className="deck-stage"
      style={{ aspectRatio: ratio, position: 'relative', overflow: 'hidden' }}
    >
      {slide.blocks.map((block) => (
        <div key={block.id} data-block-id={block.id} className="deck-block">
          {renderBlock(block)}
        </div>
      ))}
    </section>
  );
}
