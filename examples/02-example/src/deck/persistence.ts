import type { DeckProject } from './types';

const STORAGE_KEY = 'deckforge:deck:v1';

export interface PersistenceResult {
  ok: boolean;
  error?: string;
}

export function saveDeck(deck: DeckProject): PersistenceResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown persistence error' };
  }
}

export function loadDeck(): DeckProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeckProject;
    if (!parsed.schemaVersion || !Array.isArray(parsed.slides)) return null;
    return parsed;
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
