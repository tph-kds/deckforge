import React from 'react';

export type ToolbarAction = { id: string; label: string; disabled?: boolean; pressed?: boolean; run(): void };

export function Toolbar({ actions }: { actions: ToolbarAction[] }) {
  return (
    <div role="toolbar" aria-label="Deck editing tools">
      {actions.map((action) => (
        <button key={action.id} type="button" disabled={action.disabled} aria-pressed={action.pressed} onClick={action.run}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
