import { describe, expect, it, vi, afterEach } from "vitest";
import { saveDeck, loadDeck, clearDeck } from "../src/deck/persistence";
import { loadSeedDeck } from "../src/deck/seed";
import type { DeckProject } from "../src/deck/types";

const STORAGE_KEY = "deckforge:deck:v1";

function installStorage(): Map<string, string> {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  });
  return storage;
}

function seedVersion(): string {
  return loadSeedDeck().meta.seedVersion ?? "0";
}

afterEach(() => {
  clearDeck();
  vi.unstubAllGlobals();
});

describe("persistence seed-version invalidation", () => {
  it("saveDeck stamps the current seed version and loadDeck round-trips", () => {
    installStorage();
    const deck = loadSeedDeck();
    expect(saveDeck(deck).ok).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as { seedVersion: string; deck: DeckProject };
    expect(stored.seedVersion).toBe(seedVersion());

    const reloaded = loadDeck();
    expect(reloaded).not.toBeNull();
    expect(reloaded?.meta.title).toBe(deck.meta.title);
  });

  it("a stored deck with a mismatched seed version is discarded (falls back to seed)", () => {
    const storage = installStorage();
    const deck = loadSeedDeck();
    storage.set(STORAGE_KEY, JSON.stringify({ seedVersion: "999", deck }));

    expect(loadDeck()).toBeNull();
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it("a legacy unversioned stored deck is discarded", () => {
    const storage = installStorage();
    const deck = loadSeedDeck();
    storage.set(STORAGE_KEY, JSON.stringify(deck));

    expect(loadDeck()).toBeNull();
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it("a stored deck with a matching seed version is loaded", () => {
    const storage = installStorage();
    const deck = loadSeedDeck();
    storage.set(STORAGE_KEY, JSON.stringify({ seedVersion: seedVersion(), deck }));

    const reloaded = loadDeck();
    expect(reloaded).not.toBeNull();
    expect(reloaded?.meta.title).toBe(deck.meta.title);
  });

  it("a stored envelope with a matching seed version but a corrupt deck body is discarded", () => {
    const storage = installStorage();
    storage.set(STORAGE_KEY, JSON.stringify({ seedVersion: seedVersion(), deck: { meta: { title: "x" } } }));

    expect(loadDeck()).toBeNull();
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });
});
