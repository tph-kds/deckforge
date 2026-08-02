import type { DeckProject, SaveState } from './deck-types';

export type DeckPersistence = {
  load(): Promise<DeckProject | null>;
  save(deck: DeckProject): Promise<void>;
  clear(): Promise<void>;
};

export function localStoragePersistence(key: string): DeckPersistence {
  return {
    async load() {
      const value = window.localStorage.getItem(key);
      return value ? (JSON.parse(value) as DeckProject) : null;
    },
    async save(deck) {
      window.localStorage.setItem(key, JSON.stringify(deck));
    },
    async clear() {
      window.localStorage.removeItem(key);
    },
  };
}

export async function persistWithStatus(deck: DeckProject, persistence: DeckPersistence, setStatus: (status: SaveState) => void) {
  setStatus('saving');
  try {
    await persistence.save(deck);
    setStatus('saved');
  } catch (error) {
    setStatus(navigator.onLine ? 'failed' : 'offline');
    throw error;
  }
}
