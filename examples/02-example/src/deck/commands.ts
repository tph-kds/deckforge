import type { Block, DeckProject, DeckSlide } from './types';
import { newId } from './seed';

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

export function applyCommand(deck: DeckProject, command: Command): DeckProject {
  switch (command.type) {
    case 'updateBlockContent':
      return mapBlock(deck, command.slideId, command.blockId, (block) => ({ ...block, content: command.content }));
    case 'updateBlockStyle':
      return mapBlock(deck, command.slideId, command.blockId, (block) => ({ ...block, style: { ...block.style, ...command.style } }));
    case 'updateBlockAlt':
      return mapBlock(deck, command.slideId, command.blockId, (block) => ({ ...block, alt: command.alt }));
    case 'updateSlideTitle':
      return mapSlide(deck, command.slideId, (slide) => ({ ...slide, title: command.title }));
    case 'updateSlideNotes':
      return mapSlide(deck, command.slideId, (slide) => ({ ...slide, speakerNotes: command.notes }));
    case 'updateSlideLayout':
      return mapSlide(deck, command.slideId, (slide) => ({ ...slide, layout: command.layout }));
    case 'updateSlideTransition':
      return mapSlide(deck, command.slideId, (slide) => ({ ...slide, transition: command.transition }));
    case 'addBlock':
      return mapSlide(deck, command.slideId, (slide) => {
        const block = command.slot ? { ...command.block, slot: command.slot } : command.block;
        const bindings = command.slot
          ? addBlockToBinding(slide.layoutBindings ?? [], command.slot, block.id)
          : slide.layoutBindings;
        return {
          ...slide,
          blocks: [...slide.blocks, block],
          layoutBindings: bindings,
        };
      });
    case 'removeBlock':
      return mapSlide(deck, command.slideId, (slide) => {
        const blockIds = slide.blocks.filter((block) => block.id !== command.blockId).map((block) => block.id);
        return {
          ...slide,
          blocks: slide.blocks.filter((block) => block.id !== command.blockId),
          layoutBindings: (slide.layoutBindings ?? []).map((binding) => ({
            ...binding,
            blockIds: binding.blockIds.filter((id) => id !== command.blockId),
          })),
          focalBlockId: slide.focalBlockId === command.blockId ? undefined : slide.focalBlockId,
          ...(blockIds.length ? {} : {}),
        };
      });
    case 'duplicateBlock':
      return mapSlide(deck, command.slideId, (slide) => {
        const source = slide.blocks.find((block) => block.id === command.blockId);
        if (!source) return slide;
        const copy: Block = { ...structuredClone(source), id: newId('b'), slot: source.slot, positionMode: source.slot ? 'slot' : source.positionMode };
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
    case 'setTheme':
      return { ...deck, theme: { ...deck.theme, id: command.themeId } };
    case 'setTransition':
      return { ...deck, presentation: { ...deck.presentation, transition: command.transition } };
    case 'setMotionProfile':
      return { ...deck, presentation: { ...deck.presentation, motionProfileId: command.motionProfileId } };
    case 'setReducedMotion':
      return { ...deck, presentation: { ...deck.presentation, reducedMotion: command.reducedMotion } };
    case 'addSlide':
      return {
        ...deck,
        slides: [...deck.slides.slice(0, (command.afterIndex ?? deck.slides.length - 1) + 1), newSlideTemplate('Untitled slide'), ...deck.slides.slice((command.afterIndex ?? deck.slides.length - 1) + 1)],
      };
    case 'duplicateSlide':
      return mapSlide(deck, command.slideId, (slide) => {
        const copy: DeckSlide = structuredClone({ ...slide, id: newId('s'), title: `${slide.title} (copy)` });
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
        copy.focalBlockId = copy.focalBlockId ? remap.get(copy.focalBlockId) : copy.focalBlockId;
        return { ...slide };
      });
    case 'removeSlide': {
      if (deck.slides.length <= 1) return deck;
      return { ...deck, slides: deck.slides.filter((slide) => slide.id !== command.slideId) };
    }
    case 'moveSlide': {
      const slides = [...deck.slides];
      const [moved] = slides.splice(command.fromIndex, 1);
      if (!moved) return deck;
      slides.splice(command.toIndex, 0, moved);
      return { ...deck, slides };
    }
    case 'updateMeta':
      return { ...deck, meta: { ...deck.meta, ...(command.title != null ? { title: command.title } : {}), ...(command.description != null ? { description: command.description } : {}) } };
    case 'updateBlockAnimation':
      return mapBlock(deck, command.slideId, command.blockId, (block) => {
        if (command.animation === null) {
          const { animation: _removed, ...rest } = block;
          return rest as Block;
        }
        return { ...block, animation: command.animation };
      });
    case 'replaceDeck':
      return command.deck;
    default:
      return deck;
  }
}
