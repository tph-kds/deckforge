import React from 'react';
import type { DeckBlock, DeckProject, DeckSlide, Frame } from './deck-types';
import type { LayoutContract } from './layout-engine';
import { blocksBySlot, resolveSlotFrame } from './layout-engine';

export type DeckStageProps = {
  deck: DeckProject;
  slide: DeckSlide;
  layout: LayoutContract;
  mode: 'editor' | 'presenter' | 'viewer';
  selectedBlockIds?: string[];
  renderBlock(block: DeckBlock): React.ReactNode;
  onSelectBlock?(blockId: string): void;
};

function frameStyle(frame: Frame): React.CSSProperties {
  return { position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h };
}

export function DeckStage({ deck, slide, layout, mode, selectedBlockIds = [], renderBlock, onSelectBlock }: DeckStageProps) {
  const ratio = `${deck.canvas.width} / ${deck.canvas.height}`;
  const grouped = blocksBySlot(slide);
  const freeform = slide.blocks.filter((block) => block.positionMode === 'freeform' && block.frame);
  const backgrounds = slide.blocks.filter((block) => block.positionMode === 'background');

  return (
    <section aria-label={`Slide: ${slide.title}`} data-mode={mode} data-layout={slide.layout} className="deck-stage" style={{ aspectRatio: ratio }}>
      <div className="deck-content-layer" aria-label="Slide content">
        {backgrounds.map((block) => <div key={block.id} className="deck-background-block" aria-hidden={block.decorative || undefined}>{renderBlock(block)}</div>)}
        {layout.slots.map((slot) => {
          const blocks = grouped.get(slot.id) ?? [];
          if (!blocks.length) return null;
          const frame = resolveSlotFrame(deck, slot);
          const binding = slide.layoutBindings?.find((item) => item.slot === slot.id);
          return (
            <div key={slot.id} className={`deck-layout-slot deck-layout-slot--${binding?.flow ?? 'stack'}`} data-slot={slot.id} style={frameStyle(frame)}>
              {blocks.map((block) => (
                <div key={block.id} className="deck-block" data-block-id={block.id} data-selected={selectedBlockIds.includes(block.id) || undefined} onPointerDown={() => onSelectBlock?.(block.id)}>
                  {renderBlock(block)}
                </div>
              ))}
            </div>
          );
        })}
        {freeform.map((block) => <div key={block.id} className="deck-block deck-block--freeform" data-block-id={block.id} data-selected={selectedBlockIds.includes(block.id) || undefined} style={frameStyle(block.frame!)} onPointerDown={() => onSelectBlock?.(block.id)}>{renderBlock(block)}</div>)}
      </div>
      {mode === 'editor' && <div className="deck-editor-overlay" aria-hidden="true" />}
    </section>
  );
}
