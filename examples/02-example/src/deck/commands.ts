import type { Block, DeckProject, DeckSlide } from './types';
import { migrateLayoutBindings, newId } from './seed';

export type Command =
  | { type: 'updateBlockContent'; slideId: string; blockId: string; content: unknown }
  | { type: 'updateBlockStyle'; slideId: string; blockId: string; style: Record<string, unknown> }
  | { type: 'updateBlockAlt'; slideId: string; blockId: string; alt: string }
  | { type: 'updateSlideTitle'; slideId: string; title: string }
  | { type: 'updateSlideNotes'; slideId: string; notes: string }
  | { type: 'updateSlideLayout'; slideId: string; layout: string }
  | { type: 'updateSlideTransition'; slideId: string; transition: string }
  | { type: 'addBlock'; slideId: string; block: Block; slot?: string }
  | { type: 'removeBlock'; slideId: string; blockId: string }
  | { type: 'duplicateBlock'; slideId: string; blockId: string }
  | { type: 'setTheme'; themeId: string }
  | { type: 'setCanvas'; canvas: DeckProject['canvas'] }
  | { type: 'setTransition'; transition: string }
  | { type: 'setMotionProfile'; motionProfileId: string }
  | { type: 'setReducedMotion'; reducedMotion: 'respect-system' | 'always' | 'never' }
  | { type: 'addSlide'; afterIndex?: number }
  | { type: 'duplicateSlide'; slideId: string }
  | { type: 'removeSlide'; slideId: string }
  | { type: 'moveSlide'; fromIndex: number; toIndex: number }
  | { type: 'updateMeta'; title?: string; description?: string }
  | { type: 'updateBlockAnimation'; slideId: string; blockId: string; animation: Block['animation'] | null }
  | { type: 'replaceDeck'; deck: DeckProject };

/**
 * Command outcome metadata (P0-007). Every mutation reports the IDs it created
 * and removed plus the slides it affected, so callers can drive selection,
 * repair, and AI provenance without re-deriving state.
 */
export interface DispatchResult {
  deck: DeckProject;
  createdIds: string[];
  removedIds: string[];
  affectedSlideIds: string[];
}

function result(deck: DeckProject): DispatchResult {
  return { deck, createdIds: [], removedIds: [], affectedSlideIds: [] };
}

function mapSlide(deck: DeckProject, slideId: string, fn: (slide: DeckSlide) => DeckSlide): DeckProject {
  return {
    ...deck,
    slides: deck.slides.map((slide) => (slide.id === slideId ? fn(slide) : slide)),
  };
}

function mapBlock(
  deck: DeckProject,
  slideId: string,
  blockId: string,
  fn: (block: Block) => Block,
): DeckProject {
  return mapSlide(deck, slideId, (slide) => ({
    ...slide,
    blocks: slide.blocks.map((block) => (block.id === blockId ? fn(block) : block)),
  }));
}

function addBlockToBinding(
  bindings: NonNullable<DeckSlide['layoutBindings']>,
  slot: string,
  blockId: string,
): NonNullable<DeckSlide['layoutBindings']> {
  const existing = bindings.find((binding) => binding.slot === slot);
  if (existing) {
    return bindings.map((binding) =>
      binding.slot === slot ? { ...binding, blockIds: [...binding.blockIds, blockId] } : binding,
    );
  }
  return [...bindings, { slot, blockIds: [blockId], flow: 'stack', gap: 8 }];
}

function newSlideTemplate(title: string): DeckSlide {
  const kicker = newId('b');
  const heading = newId('b');
  const body = newId('b');
  return {
    id: newId('s'),
    title,
    layout: 'two-column',
    blocks: [
      { id: kicker, type: 'text', content: 'SECTION', style: { variant: 'kicker' }, sourceIds: [], slot: 'kicker', positionMode: 'slot' },
      { id: heading, type: 'heading', content: title, style: { level: 1 }, sourceIds: [], slot: 'title', positionMode: 'slot' },
      { id: body, type: 'text', content: 'Add your content here.', style: {}, sourceIds: [], slot: 'left', positionMode: 'slot' },
    ],
    speakerNotes: '',
    sources: [],
    interactions: [],
    density: 'medium',
    layoutBindings: [
      { slot: 'kicker', blockIds: [kicker], flow: 'stack', gap: 8 },
      { slot: 'title', blockIds: [heading], flow: 'stack', gap: 8 },
      { slot: 'left', blockIds: [body], flow: 'stack', gap: 8 },
    ],
  };
}

/**
 * The canonical title block is the heading bound to the `title` slot (or the
 * first heading block when no title binding exists). This unifies slide
 * metadata with the visible heading so the inspector, canvas, and export stay
 * in sync (DF-014).
 */
function titleBlockId(slide: DeckSlide): string | undefined {
  const titleBinding = (slide.layoutBindings ?? []).find((binding) => binding.slot === 'title');
  const boundId = titleBinding?.blockIds[0];
  const boundBlock = boundId ? slide.blocks.find((block) => block.id === boundId) : undefined;
  if (boundBlock?.type === 'heading') return boundBlock.id;
  return slide.blocks.find((block) => block.type === 'heading')?.id;
}

/**
 * Apply a command and return both the new deck and its metadata.
 * `applyCommand` is a thin wrapper kept for callers that only need the deck.
 */
export function applyCommandWithResult(deck: DeckProject, command: Command): DispatchResult {
  switch (command.type) {
    case 'updateBlockContent': {
      const next = mapSlide(deck, command.slideId, (slide) => {
        const blocks = slide.blocks.map((block) =>
          block.id === command.blockId ? { ...block, content: command.content } : block,
        );
        // Keep slide title metadata in sync with the visible heading (DF-014).
        if (command.blockId === titleBlockId(slide)) {
          return { ...slide, title: typeof command.content === 'string' ? command.content : slide.title, blocks };
        }
        return { ...slide, blocks };
      });
      return { ...result(next), affectedSlideIds: [command.slideId] };
    }
    case 'updateBlockStyle':
      return {
        ...result(mapBlock(deck, command.slideId, command.blockId, (block) => ({ ...block, style: { ...block.style, ...command.style } }))),
        affectedSlideIds: [command.slideId],
      };
    case 'updateBlockAlt':
      return {
        ...result(mapBlock(deck, command.slideId, command.blockId, (block) => ({ ...block, alt: command.alt }))),
        affectedSlideIds: [command.slideId],
      };
    case 'updateSlideTitle':
      return {
        ...result(mapSlide(deck, command.slideId, (slide) => {
          const titleId = titleBlockId(slide);
          const blocks = titleId
            ? slide.blocks.map((block) => (block.id === titleId ? { ...block, content: command.title } : block))
            : slide.blocks;
          return { ...slide, title: command.title, blocks };
        })),
        affectedSlideIds: [command.slideId],
      };
    case 'updateSlideNotes':
      return {
        ...result(mapSlide(deck, command.slideId, (slide) => ({ ...slide, speakerNotes: command.notes }))),
        affectedSlideIds: [command.slideId],
      };
    case 'updateSlideLayout':
      return {
        ...result(mapSlide(deck, command.slideId, (slide) => migrateLayoutBindings(slide, command.layout))),
        affectedSlideIds: [command.slideId],
      };
    case 'updateSlideTransition':
      return {
        ...result(mapSlide(deck, command.slideId, (slide) => ({ ...slide, transition: command.transition }))),
        affectedSlideIds: [command.slideId],
      };
    case 'addBlock': {
      const block = command.slot ? { ...command.block, slot: command.slot } : command.block;
      const next = mapSlide(deck, command.slideId, (slide) => ({
        ...slide,
        blocks: [...slide.blocks, block],
        layoutBindings: command.slot
          ? addBlockToBinding(slide.layoutBindings ?? [], command.slot, block.id)
          : slide.layoutBindings,
      }));
      return {
        ...result(next),
        createdIds: [block.id],
        affectedSlideIds: [command.slideId],
      };
    }
    case 'removeBlock': {
      const next = mapSlide(deck, command.slideId, (slide) => ({
        ...slide,
        blocks: slide.blocks.filter((block) => block.id !== command.blockId),
        layoutBindings: (slide.layoutBindings ?? []).map((binding) => ({
          ...binding,
          blockIds: binding.blockIds.filter((id) => id !== command.blockId),
        })),
        focalBlockId: slide.focalBlockId === command.blockId ? undefined : slide.focalBlockId,
      }));
      return {
        ...result(next),
        removedIds: [command.blockId],
        affectedSlideIds: [command.slideId],
      };
    }
    case 'duplicateBlock': {
      let createdId = '';
      const next = mapSlide(deck, command.slideId, (slide) => {
        const source = slide.blocks.find((block) => block.id === command.blockId);
        if (!source) return slide;
        const copy: Block = { ...structuredClone(source), id: newId('b'), slot: source.slot, positionMode: source.slot ? 'slot' : source.positionMode };
        createdId = copy.id;
        return {
          ...slide,
          blocks: [...slide.blocks, copy],
          layoutBindings: (slide.layoutBindings ?? []).map((binding) =>
            binding.blockIds.includes(command.blockId)
              ? { ...binding, blockIds: [...binding.blockIds, copy.id] }
              : binding,
          ),
        };
      });
      return {
        ...result(next),
        createdIds: createdId ? [createdId] : [],
        affectedSlideIds: [command.slideId],
      };
    }
    case 'setTheme':
      return result({ ...deck, theme: { ...deck.theme, id: command.themeId } });
    case 'setCanvas': {
      const prev = deck.canvas;
      const next = command.canvas;
      const scaleX = next.width / prev.width;
      const scaleY = next.height / prev.height;
      const needsRescale = scaleX !== 1 || scaleY !== 1;
      if (!needsRescale) return result({ ...deck, canvas: next });
      const rescaled: DeckProject = {
        ...deck,
        canvas: next,
        slides: deck.slides.map((slide) => ({
          ...slide,
          blocks: slide.blocks.map((block) => {
            if (!block.frame) return block;
            const f = block.frame;
            return {
              ...block,
              frame: {
                x: Math.round(f.x * scaleX),
                y: Math.round(f.y * scaleY),
                w: Math.round(f.w * scaleX),
                h: Math.round(f.h * scaleY),
              },
            };
          }),
        })),
      };
      return { ...result(rescaled), affectedSlideIds: deck.slides.map((s) => s.id) };
    }
    case 'setTransition':
      return result({ ...deck, presentation: { ...deck.presentation, transition: command.transition } });
    case 'setMotionProfile':
      return result({ ...deck, presentation: { ...deck.presentation, motionProfileId: command.motionProfileId } });
    case 'setReducedMotion':
      return result({ ...deck, presentation: { ...deck.presentation, reducedMotion: command.reducedMotion } });
    case 'addSlide': {
      const afterIndex = command.afterIndex ?? deck.slides.length - 1;
      const nextSlide = newSlideTemplate('Untitled slide');
      const slides = [
        ...deck.slides.slice(0, afterIndex + 1),
        nextSlide,
        ...deck.slides.slice(afterIndex + 1),
      ];
      return {
        deck: { ...deck, slides },
        createdIds: [nextSlide.id],
        removedIds: [],
        affectedSlideIds: [nextSlide.id],
      };
    }
    case 'duplicateSlide': {
      const sourceIndex = deck.slides.findIndex((slide) => slide.id === command.slideId);
      if (sourceIndex < 0) return result(deck);
      const copy: DeckSlide = structuredClone(deck.slides[sourceIndex]);
      copy.id = newId('s');
      copy.title = `${copy.title} (copy)`;
      const remap = new Map<string, string>();
      for (const block of copy.blocks) {
        const old = block.id;
        block.id = newId('b');
        remap.set(old, block.id);
      }
      copy.layoutBindings = (copy.layoutBindings ?? []).map((binding) => ({
        ...binding,
        blockIds: binding.blockIds.map((id) => remap.get(id) ?? id),
      }));
      copy.focalBlockId = copy.focalBlockId ? remap.get(copy.focalBlockId) : undefined;
      const slides = [...deck.slides];
      slides.splice(sourceIndex + 1, 0, copy);
      return {
        deck: { ...deck, slides },
        createdIds: [copy.id, ...copy.blocks.map((block) => block.id)],
        removedIds: [],
        affectedSlideIds: [copy.id],
      };
    }
    case 'removeSlide': {
      if (deck.slides.length <= 1) return result(deck);
      return {
        deck: { ...deck, slides: deck.slides.filter((slide) => slide.id !== command.slideId) },
        createdIds: [],
        removedIds: [command.slideId],
        affectedSlideIds: deck.slides
          .filter((slide) => slide.id !== command.slideId)
          .map((slide) => slide.id),
      };
    }
    case 'moveSlide': {
      const slides = [...deck.slides];
      const [moved] = slides.splice(command.fromIndex, 1);
      if (!moved) return result(deck);
      slides.splice(command.toIndex, 0, moved);
      return { deck: { ...deck, slides }, createdIds: [], removedIds: [], affectedSlideIds: [moved.id] };
    }
    case 'updateMeta':
      return result({
        ...deck,
        meta: { ...deck.meta, ...(command.title != null ? { title: command.title } : {}), ...(command.description != null ? { description: command.description } : {}) },
      });
    case 'updateBlockAnimation':
      return {
        ...result(mapBlock(deck, command.slideId, command.blockId, (block) => {
          if (command.animation === null) {
            const { animation: _removed, ...rest } = block;
            return rest as Block;
          }
          return { ...block, animation: command.animation };
        })),
        affectedSlideIds: [command.slideId],
      };
    case 'replaceDeck':
      return { deck: command.deck, createdIds: [], removedIds: [], affectedSlideIds: [] };
    default:
      return result(deck);
  }
}

export function applyCommand(deck: DeckProject, command: Command): DeckProject {
  return applyCommandWithResult(deck, command).deck;
}
