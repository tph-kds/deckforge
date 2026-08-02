import type { SaveState } from '../deck/types';

interface SaveStatusProps {
  state: SaveState;
  onSave: () => void;
}

const LABELS: Record<SaveState, string> = {
  clean: 'Saved',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved just now',
  failed: 'Save failed',
  offline: 'Offline — changes not persisted',
  conflict: 'Conflict — review required',
};

export function SaveStatus({ state, onSave }: SaveStatusProps) {
  return (
    <div className={`save-status save-status-${state}`} role="status" aria-live="polite">
      <span className="save-status-dot" aria-hidden="true" />
      <span className="save-status-text">{LABELS[state]}</span>
      <button type="button" className="text-button" onClick={onSave} disabled={state === 'clean' || state === 'saving'}>
        Save now
      </button>
    </div>
  );
}
