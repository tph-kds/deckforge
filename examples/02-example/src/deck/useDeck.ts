import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyCommand, type Command } from './commands';
import { loadSeedDeck } from './seed';
import { deckStorageAvailable, loadDeck, saveDeck } from './persistence';
import type { DeckProject, EditorSelection, SaveState } from './types';

const HISTORY_LIMIT = 100;

export interface DeckStore {
  deck: DeckProject;
  selection: EditorSelection;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  select: (slideId: string, blockIds?: string[], additive?: boolean) => void;
  selectSlide: (slideId: string) => void;
  selectBlock: (slideId: string, blockId: string, additive?: boolean) => void;
  selectNone: () => void;
  commit: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  saveNow: () => SaveState;
}

function initialDeck(): DeckProject {
  const stored = deckStorageAvailable() ? loadDeck() : null;
  return stored ?? loadSeedDeck();
}

export function useDeck(): DeckStore {
  const [deck, setDeck] = useState<DeckProject>(initialDeck);
  const [selection, setSelection] = useState<EditorSelection>(() => ({
    slideId: initialDeck().slides[0]?.id ?? '',
    blockIds: [],
    mode: 'slide',
  }));
  const [saveState, setSaveState] = useState<SaveState>('clean');
  const [past, setPast] = useState<DeckProject[]>([]);
  const [future, setFuture] = useState<DeckProject[]>([]);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  const select = useCallback((slideId: string, blockIds: string[] = [], additive = false) => {
    setSelection((prev) => ({
      slideId,
      blockIds,
      mode: blockIds.length ? 'block' : 'slide',
      ...(additive ? {} : {}),
    }));
  }, []);

  const selectSlide = useCallback((slideId: string) => {
    setSelection({ slideId, blockIds: [], mode: 'slide' });
  }, []);

  const selectBlock = useCallback((slideId: string, blockId: string, additive = false) => {
    setSelection((prev) => {
      const already = prev.slideId === slideId && prev.blockIds.includes(blockId);
      const blockIds = additive ? (already ? prev.blockIds.filter((id) => id !== blockId) : [...prev.blockIds, blockId]) : [blockId];
      return { slideId, blockIds, mode: blockIds.length ? 'block' : 'slide' };
    });
  }, []);

  const selectNone = useCallback(() => {
    setSelection((prev) => ({ slideId: prev.slideId, blockIds: [], mode: 'none' }));
  }, []);

  const commit = useCallback((command: Command) => {
    setDeck((current) => {
      const next = applyCommand(current, command);
      setPast((history) => [...history.slice(-HISTORY_LIMIT + 1), current]);
      setFuture([]);
      setSaveState('dirty');
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((history) => {
      if (!history.length) return history;
      const previous = history[history.length - 1];
      setDeck((current) => {
        setFuture((f) => [...f.slice(-HISTORY_LIMIT + 1), current]);
        setSaveState('dirty');
        return previous;
      });
      return history.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((futureStack) => {
      if (!futureStack.length) return futureStack;
      const next = futureStack[futureStack.length - 1];
      setDeck((current) => {
        setPast((h) => [...h.slice(-HISTORY_LIMIT + 1), current]);
        setSaveState('dirty');
        return next;
      });
      return futureStack.slice(0, -1);
    });
  }, []);

  const saveNow = useCallback((): SaveState => {
    if (!deckStorageAvailable()) {
      setSaveState('failed');
      return 'failed';
    }
    const result = saveDeck(deckRef.current);
    const state: SaveState = result.ok ? 'saved' : 'failed';
    setSaveState(state);
    if (result.ok) {
      window.setTimeout(() => setSaveState('clean'), 1200);
    }
    return state;
  }, []);

  const saveTimeout = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (saveState !== 'dirty') return;
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => saveNow(), 600);
    return () => window.clearTimeout(saveTimeout.current);
  }, [saveState, saveNow]);

  const store = useMemo<DeckStore>(
    () => ({
      deck,
      selection,
      saveState,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      select,
      selectSlide,
      selectBlock,
      selectNone,
      commit,
      undo,
      redo,
      saveNow,
    }),
    [deck, selection, saveState, past.length, future.length, select, selectSlide, selectBlock, selectNone, commit, undo, redo, saveNow],
  );

  return store;
}
