import { memo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Block, DeckProject, DeckSlide, Frame, LayoutBinding } from '../deck/types';
import { resolveSlidePlacements } from '../deck/layout';
import { BlockRenderer } from './BlockRenderer';

/**
 * Rendering surface for a slide.
 * - `editor`     — carries selection, block ids, interactive hints.
 * - `presenter`  — audience-only: no editor metadata, no block ids.
 * - `thumbnail`  — static, clipped, animation-free, no metadata.
 */
export type RenderSurface = 'editor' | 'presenter' | 'thumbnail';

interface SlideRendererProps {
  deck: DeckProject;
  slide: DeckSlide;
  surface?: RenderSurface;
  /** Scale factor applied to the whole slide as a transform (logical coords preserved). */
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

/** Deterministic grid columns for a slot binding (plan §6.3). */
export function gridColumnsForItemCount(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  return 3;
}

function flowStyles(
  flow: LayoutBinding['flow'],
  gap: number | undefined,
  itemCount: number,
): CSSProperties {
  switch (flow) {
    case 'row':
      return { display: 'flex', flexDirection: 'row', gap: gap ?? 12, alignItems: 'stretch', justifyContent: 'flex-start' };
    case 'grid':
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumnsForItemCount(itemCount)}, minmax(0, 1fr))`,
        gridAutoRows: '1fr',
        gap: gap ?? 12,
        alignItems: 'stretch',
      };
    case 'overlay':
      return { position: 'relative' };
    case 'stack':
    default:
      return { display: 'flex', flexDirection: 'column', gap: gap ?? 12, alignItems: 'stretch', justifyContent: 'flex-start' };
  }
}

interface SlotGroup {
  slotId: string;
  frame: Frame;
  binding?: LayoutBinding;
  placements: { block: Block; placementIndex: number }[];
}

export const SlideRenderer = memo(function SlideRenderer({
  deck,
  slide,
  surface = 'editor',
  scale = 1,
  interactive = false,
  selectedBlockIds = [],
  onBlockSelect,
  buildIndex,
}: SlideRendererProps) {
  const placements = resolveSlidePlacements(slide, deck.canvas);
  const byId = new Map(slide.blocks.map((block) => [block.id, block]));
  const bindingBySlot = new Map<string, LayoutBinding>();
  for (const binding of slide.layoutBindings ?? []) bindingBySlot.set(binding.slot, binding);

  const groups = new Map<string, SlotGroup>();
  placements.forEach((placement, placementIndex) => {
    const block = byId.get(placement.blockId);
    if (!block) return;
    const group = groups.get(placement.slotId);
    if (group) {
      group.placements.push({ block, placementIndex });
    } else {
      groups.set(placement.slotId, {
        slotId: placement.slotId,
        frame: placement.frame,
        binding: bindingBySlot.get(placement.slotId),
        placements: [{ block, placementIndex }],
      });
    }
  });

  const isEditor = surface === 'editor';
  const isThumbnail = surface === 'thumbnail';
  const defaultBuilds = deck.presentation.defaultBuilds ?? false;
  const isBuildAware = buildIndex !== undefined;

  const children = [...groups.values()].map((group) => {
    const slotFlow = group.binding?.flow ?? 'stack';
    const slotGap = group.binding?.gap;
    const containerStyle: CSSProperties = {
      position: 'absolute',
      left: group.frame.x,
      top: group.frame.y,
      width: group.frame.w,
      height: group.frame.h,
      ...flowStyles(slotFlow, slotGap, group.placements.length),
    };

    return (
      <div key={group.slotId} className={`deck-slot slot-${group.slotId}`} style={containerStyle}>
        {group.placements.map(({ block }) => {
          const selected = selectedBlockIds.includes(block.id);
          const revealed = isBuildAware ? buildIndex >= revealStepFor(block, slide, defaultBuilds) : true;
          const stateClass = isBuildAware ? (revealed ? 'anim-in' : 'build-hidden') : '';
          const isOverlay = slotFlow === 'overlay';

          const blockStyles: CSSProperties = {
            ...(isOverlay
              ? { position: 'absolute', inset: 0 }
              : { position: 'relative', width: '100%', minWidth: 0, minHeight: 0 }),
            ...(slotFlow === 'stack' || slotFlow === 'row' ? { flex: '1 1 0%' } : {}),
            ...(isBuildAware ? { animationDelay: `${(block.animation?.order ?? 0) * 120}ms` } : {}),
          };

          const wrapperProps: Record<string, unknown> = {
            className: `deck-block-wrap slot-${group.slotId}${stateClass ? ` ${stateClass}` : ''}${selected && isEditor ? ' is-selected' : ''}`,
            style: blockStyles,
          };

          if (isEditor) {
            wrapperProps['data-block-id'] = block.id;
            wrapperProps.pointerEvents = interactive ? 'auto' : 'none';
            wrapperProps.cursor = interactive ? 'pointer' : 'default';
            wrapperProps.title = interactive ? `Select block ${block.id}` : undefined;
            wrapperProps.onClick = (event: React.MouseEvent) => {
              if (!interactive || !onBlockSelect) return;
              event.stopPropagation();
              onBlockSelect(block.id, event.shiftKey || event.metaKey || event.ctrlKey);
            };
          }

          return (
            <div key={block.id} {...wrapperProps}>
              <BlockRenderer block={block} slide={slide} deck={deck} themeId={deck.theme.id} surface={surface} />
            </div>
          );
        })}
      </div>
    );
  });

  const logicalStyle: CSSProperties = {
    width: deck.canvas.width,
    height: deck.canvas.height,
    backgroundColor: 'var(--theme-background)',
    color: 'var(--theme-foreground)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'var(--font-body)',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };

  const frameStyle: CSSProperties = {
    width: deck.canvas.width * scale,
    height: deck.canvas.height * scale,
    overflow: 'hidden',
    ...(isThumbnail ? { contain: 'layout paint size' as const, pointerEvents: 'none' as const } : {}),
  };

  return (
    <div className={`deck-slide-frame ${isThumbnail ? 'is-thumbnail' : ''}`} style={frameStyle}>
      <div className="deck-slide" style={logicalStyle}>
        {children}
      </div>
    </div>
  );
});

interface SlideRenderViewProps {
  deck: DeckProject;
  slide: DeckSlide;
  scale?: number;
  buildIndex?: number;
}

/** Audience-facing renderer: no selection, no ids, no editor hints. */
export function PresenterSlideRenderer({ deck, slide, scale = 1, buildIndex }: SlideRenderViewProps): ReactNode {
  return <SlideRenderer deck={deck} slide={slide} surface="presenter" scale={scale} buildIndex={buildIndex} />;
}

/** Static, clipped, animation-free renderer for thumbnails/grid. */
export function ThumbnailSlideRenderer({ deck, slide, scale = 1 }: SlideRenderViewProps): ReactNode {
  return <SlideRenderer deck={deck} slide={slide} surface="thumbnail" scale={scale} />;
}

interface EditorSlideRendererProps extends SlideRenderViewProps {
  interactive?: boolean;
  selectedBlockIds?: string[];
  onBlockSelect?: (blockId: string, additive: boolean) => void;
  buildIndex?: number;
}

/** Editor renderer: carries selection state, block ids, and interaction hooks. */
export function EditorSlideRenderer({
  deck,
  slide,
  scale = 1,
  interactive = false,
  selectedBlockIds = [],
  onBlockSelect,
  buildIndex,
}: EditorSlideRendererProps): ReactNode {
  return (
    <SlideRenderer
      deck={deck}
      slide={slide}
      surface="editor"
      scale={scale}
      interactive={interactive}
      selectedBlockIds={selectedBlockIds}
      onBlockSelect={onBlockSelect}
      buildIndex={buildIndex}
    />
  );
}
