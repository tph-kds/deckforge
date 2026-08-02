import { memo } from 'react';
import type { CSSProperties } from 'react';
import type { Block, DeckProject, DeckSlide } from '../deck/types';
import { resolveSlidePlacements } from '../deck/layout';
import { BlockRenderer } from './BlockRenderer';

interface SlideRendererProps {
  deck: DeckProject;
  slide: DeckSlide;
  scale?: number;
  interactive?: boolean;
  selectedBlockIds?: string[];
  onBlockSelect?: (blockId: string, additive: boolean) => void;
  buildIndex?: number;
}

function revealStepFor(block: Block, slide: DeckSlide, defaultBuilds: boolean): number {
  const anim = block.animation;
  if (anim) {
    if (anim.trigger === 'on-click') return anim.order ?? 0;
    if (anim.trigger === 'with-previous' || anim.trigger === 'after-previous') return (anim.order ?? 0) + 1;
    return 0;
  }
  return defaultBuilds ? 1 : 0;
}

function flowStyles(flow: string | undefined, gap: number | undefined): CSSProperties {
  switch (flow) {
    case 'row':
      return { display: 'flex', flexDirection: 'row', gap: gap ?? 12, alignItems: 'stretch', justifyContent: 'flex-start' };
    case 'grid':
      return { display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: gap ?? 12, alignItems: 'stretch' };
    case 'overlay':
      return { display: 'block' };
    case 'stack':
    default:
      return { display: 'flex', flexDirection: 'column', gap: gap ?? 12, alignItems: 'stretch', justifyContent: 'flex-start' };
  }
}

export const SlideRenderer = memo(function SlideRenderer({
  deck,
  slide,
  scale = 1,
  interactive = false,
  selectedBlockIds = [],
  onBlockSelect,
  buildIndex = Number.MAX_SAFE_INTEGER,
}: SlideRendererProps) {
  const placements = resolveSlidePlacements(slide, deck.canvas);
  const byId = new Map(slide.blocks.map((block) => [block.id, block]));

  const blocksBySlot = new Map<string, typeof placements>();
  for (const placement of placements) {
    const list = blocksBySlot.get(placement.slotId) ?? [];
    list.push(placement);
    blocksBySlot.set(placement.slotId, list);
  }
  const bindingBySlot = new Map((slide.layoutBindings ?? []).map((binding) => [binding.slot, binding]));

  return (
    <div
      className="deck-slide"
      style={{
        width: deck.canvas.width * scale,
        height: deck.canvas.height * scale,
        backgroundColor: 'var(--theme-background)',
        color: 'var(--theme-foreground)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
      }}
    >
      {placements.map((placement) => {
        const block = byId.get(placement.blockId);
        if (!block) return null;
        const binding = bindingBySlot.get(placement.slotId);
        const frame = placement.frame;
        const selected = selectedBlockIds.includes(block.id);
        const revealed = buildIndex >= revealStepFor(block, slide, deck.presentation.defaultBuilds ?? false);
        return (
          <div
            key={block.id}
            className={`deck-block-wrap ${selected ? 'is-selected' : ''} slot-${placement.slotId} ${revealed ? 'anim-in' : 'build-hidden'}`}
            style={{
              position: 'absolute',
              left: frame.x * scale,
              top: frame.y * scale,
              width: frame.w * scale,
              height: frame.h * scale,
              ...flowStyles(binding?.flow, binding?.gap),
              pointerEvents: interactive ? 'auto' : 'none',
              cursor: interactive ? 'pointer' : 'default',
              animationDelay: `${(block.animation?.order ?? 0) * 120}ms`,
            }}
            data-block-id={block.id}
            onClick={(event) => {
              if (!interactive || !onBlockSelect) return;
              event.stopPropagation();
              onBlockSelect(block.id, event.shiftKey || event.metaKey || event.ctrlKey);
            }}
            title={interactive ? `Select block ${block.id}` : undefined}
            aria-label={block.ariaLabel}
          >
            <BlockRenderer block={block} slide={slide} themeId={deck.theme.id} />
          </div>
        );
      })}
    </div>
  );
});
