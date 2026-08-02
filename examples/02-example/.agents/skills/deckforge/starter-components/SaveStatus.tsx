import React from 'react';
import type { SaveState } from './deck-types';

const labels: Record<SaveState, string> = {
  clean: 'Saved', dirty: 'Unsaved changes', saving: 'Saving…', saved: 'Saved', failed: 'Save failed', offline: 'Offline', conflict: 'Version conflict',
};

export function SaveStatus({ state }: { state: SaveState }) {
  return <output className="deck-save-status" data-state={state} aria-live="polite">{labels[state]}</output>;
}
