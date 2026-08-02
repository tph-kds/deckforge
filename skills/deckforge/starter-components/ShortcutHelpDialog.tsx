import React, { useEffect, useRef } from 'react';

export type ShortcutItem = { id: string; keys: string[]; label: string };
export function ShortcutHelpDialog({ open, editor, presenter, onClose }: { open: boolean; editor: ShortcutItem[]; presenter: ShortcutItem[]; onClose(): void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const group = (title: string, items: ShortcutItem[]) => <section><h3>{title}</h3><dl>{items.map((item) => <div key={item.id}><dt>{item.label}</dt><dd>{item.keys.map((key) => <kbd key={key}>{key}</kbd>)}</dd></div>)}</dl></section>;
  return (
    <div className="deck-dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <div className="deck-shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
        <header><h2 id="shortcut-title">Keyboard shortcuts</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close shortcuts">×</button></header>
        <div className="deck-shortcut-groups">{group('Editor', editor)}{group('Presenter', presenter)}</div>
      </div>
    </div>
  );
}
