import type { BlockId, DeckBlock, DeckProject, DeckSlide, EditorSelection, SlideId } from './deck-types';

export type DeckCommand = {
  label: string;
  apply(deck: DeckProject): DeckProject;
};
export type HistoryEntry = { label: string; before: DeckProject; after: DeckProject };
export type DeckStoreState = {
  deck: DeckProject;
  selection: EditorSelection | null;
  activeSlideId: SlideId;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
};

export function executeCommand(state: DeckStoreState, command: DeckCommand): DeckStoreState {
  const before = structuredClone(state.deck);
  const after = command.apply(structuredClone(state.deck));
  return { ...state, deck: after, undoStack: [...state.undoStack, { label: command.label, before, after }], redoStack: [] };
}
export function undo(state: DeckStoreState): DeckStoreState {
  const entry = state.undoStack.at(-1);
  if (!entry) return state;
  return { ...state, deck: structuredClone(entry.before), undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, entry] };
}
export function redo(state: DeckStoreState): DeckStoreState {
  const entry = state.redoStack.at(-1);
  if (!entry) return state;
  return { ...state, deck: structuredClone(entry.after), undoStack: [...state.undoStack, entry], redoStack: state.redoStack.slice(0, -1) };
}

export function updateSlide(slideId: SlideId, patch: Partial<DeckSlide>, label = 'Update slide'): DeckCommand {
  return { label, apply(deck) { const slide = deck.slides.find((item) => item.id === slideId); if (!slide) return deck; Object.assign(slide, patch); return deck; } };
}
export function updateBlock(slideId: SlideId, blockId: BlockId, patch: Partial<DeckBlock>, label = 'Update block'): DeckCommand {
  return { label, apply(deck) { const block = deck.slides.find((item) => item.id === slideId)?.blocks.find((item) => item.id === blockId); if (!block) return deck; Object.assign(block, patch); return deck; } };
}
export function addBlock(slideId: SlideId, block: DeckBlock): DeckCommand {
  return { label: `Add ${block.type}`, apply(deck) { deck.slides.find((item) => item.id === slideId)?.blocks.push(block); return deck; } };
}
export function deleteBlocks(slideId: SlideId, blockIds: BlockId[]): DeckCommand {
  return { label: 'Delete blocks', apply(deck) { const slide = deck.slides.find((item) => item.id === slideId); if (slide) slide.blocks = slide.blocks.filter((item) => !blockIds.includes(item.id)); return deck; } };
}
