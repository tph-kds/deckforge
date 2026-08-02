import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollSurface } from '../deck/scrollbars/ScrollSurface';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string;
  run: () => void;
  disabled?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const command = filtered[activeIndex];
        if (command && !command.disabled) {
          onClose();
          command.run();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  const groups = new Map<string, CommandItem[]>();
  for (const command of filtered) {
    const list = groups.get(command.group) ?? [];
    list.push(command);
    groups.set(command.group, list);
  }

  let runningIndex = 0;
  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="command-input"
          placeholder="Type a command…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ScrollSurface surface="modal" className="command-list">
          {Array.from(groups.entries()).map(([group, items]) => (
            <div key={group} className="command-group">
              <div className="command-group-label">{group}</div>
              {items.map((command) => {
                const index = runningIndex++;
                const active = index === activeIndex;
                return (
                  <button
                    key={command.id}
                    type="button"
                    className={`command-item ${active ? 'is-active' : ''}`}
                    disabled={command.disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (command.disabled) return;
                      onClose();
                      command.run();
                    }}
                  >
                    <span className="command-label">{command.label}</span>
                    {command.hint ? <span className="command-hint">{command.hint}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 ? <div className="command-empty">No commands match “{query}”.</div> : null}
        </ScrollSurface>
      </div>
    </div>
  );
}
