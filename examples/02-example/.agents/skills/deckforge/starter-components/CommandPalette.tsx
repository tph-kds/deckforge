import React, { useEffect, useMemo, useRef, useState } from 'react';
export type PaletteCommand = { id: string; label: string; group: string; shortcut?: string; disabled?: boolean; run(): void };
export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: PaletteCommand[]; onClose(): void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQuery(''); queueMicrotask(() => inputRef.current?.focus()); } }, [open]);
  const visible = useMemo(() => commands.filter((command) => `${command.label} ${command.group}`.toLowerCase().includes(query.toLowerCase())), [commands, query]);
  if (!open) return null;
  return <div className="deck-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="deck-command-palette" role="dialog" aria-modal="true" aria-label="Command palette"><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" aria-label="Search commands"/><ul>{visible.map((command) => <li key={command.id}><button disabled={command.disabled} onClick={() => { command.run(); onClose(); }}><span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button></li>)}</ul></section></div>;
}
