import React from 'react';
export type ToolbarAction = { id: string; label: string; shortcut?: string; disabled?: boolean; pressed?: boolean; run(): void };
export type ToolbarGroup = { id: string; label: string; actions: ToolbarAction[] };
export function Toolbar({ groups }: { groups: ToolbarGroup[] }) {
  return <div role="toolbar" aria-label="Deck editing tools" className="deck-toolbar-groups">{groups.map((group) => <div className="deck-toolbar-group" key={group.id} aria-label={group.label}>{group.actions.map((action) => <button key={action.id} type="button" disabled={action.disabled} aria-pressed={action.pressed} onClick={action.run} title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}>{action.label}{action.shortcut && <span className="sr-only"> Shortcut {action.shortcut}</span>}</button>)}</div>)}</div>;
}
