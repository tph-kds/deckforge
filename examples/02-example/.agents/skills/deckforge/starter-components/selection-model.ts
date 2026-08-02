import type { BlockId, DeckProject, EditorSelection, SlideId } from './deck-types';

export function selectBlock(slideId: SlideId, blockId: BlockId, current: EditorSelection | null, additive = false): EditorSelection {
  const existing = current?.slideId === slideId ? current.blockIds : [];
  const blockIds = additive
    ? existing.includes(blockId) ? existing.filter((id) => id !== blockId) : [...existing, blockId]
    : [blockId];
  return { slideId, blockIds, mode: 'block' };
}

export function normalizeSelection(deck: DeckProject, selection: EditorSelection | null): EditorSelection | null {
  if (!selection) return null;
  const slide = deck.slides.find((candidate) => candidate.id === selection.slideId);
  if (!slide) return null;
  const available = new Set(slide.blocks.map((block) => block.id));
  const blockIds = selection.blockIds.filter((id) => available.has(id));
  return blockIds.length ? { ...selection, blockIds } : null;
}
