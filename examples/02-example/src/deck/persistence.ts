import type { DeckProject } from './types';
import { loadSeedDeck } from './seed';

const STORAGE_KEY = 'deckforge:deck:v1';

interface PersistedDeck {
  seedVersion: string;
  deck: DeckProject;
}

export interface PersistenceResult {
  ok: boolean;
  error?: string;
}

export function saveDeck(deck: DeckProject): PersistenceResult {
  try {
    const envelope: PersistedDeck = {
      seedVersion: loadSeedDeck().meta.seedVersion ?? '0',
      deck,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown persistence error' };
  }
}

export function loadDeck(): DeckProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDeck;
    const currentSeedVersion = loadSeedDeck().meta.seedVersion ?? '0';
    const isEnvelope =
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.seedVersion === 'string' &&
      parsed.deck &&
      typeof parsed.deck === 'object';
    if (!isEnvelope) {
      clearDeck();
      return null;
    }
    if (parsed.seedVersion !== currentSeedVersion) {
      clearDeck();
      return null;
    }
    const deck = parsed.deck;
    if (!deck.schemaVersion || !Array.isArray(deck.slides)) return null;
    return deck;
  } catch {
    return null;
  }
}

export function clearDeck(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota/security errors on clear
  }
}

export function deckStorageAvailable(): boolean {
  try {
    localStorage.setItem('__deckforge_probe__', '1');
    localStorage.removeItem('__deckforge_probe__');
    return true;
  } catch {
    return false;
  }
}
