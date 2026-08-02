import type { DeckProject, EditorSelection, SlideId } from './deck-types';

export type DeckCommand = {
  label: string;
  apply(deck: DeckProject): DeckProject;
  invert(before: DeckProject, after: DeckProject): DeckCommand;
};

export type DeckStoreState = {
  deck: DeckProject;
  selection: EditorSelection | null;
  activeSlideId: SlideId;
  undoStack: Array<{ command: DeckCommand; before: DeckProject }>;
  redoStack: Array<{ command: DeckCommand; before: DeckProject }>;
};

export function executeCommand(state: DeckStoreState, command: DeckCommand): DeckStoreState {
  const before = structuredClone(state.deck);
  const deck = command.apply(state.deck);
  return { ...state, deck, undoStack: [...state.undoStack, { command, before }], redoStack: [] };
}

export function undo(state: DeckStoreState): DeckStoreState {
  const entry = state.undoStack.at(-1);
  if (!entry) return state;
  return { ...state, deck: entry.before, undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, { command: entry.command, before: state.deck }] };
}
