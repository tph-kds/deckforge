import { useEffect, useRef } from 'react';

interface ShortcutGroup {
  id: string;
  label: string;
  keys: string;
}

interface ShortcutRow {
  keys: string;
  label: string;
}

interface ShortcutHelpDialogProps {
  open: boolean;
  onClose: () => void;
  groups: ShortcutGroup[];
  rows: ShortcutRow[];
}

export function ShortcutHelpDialog({ open, onClose, groups, rows }: ShortcutHelpDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        const focusables = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [],
        ).filter((element) => !element.hasAttribute('disabled'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="dialog shortcut-help"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <h2>Keyboard shortcuts</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close shortcuts">
            ×
          </button>
        </div>
        <div className="shortcut-groups">
          {rows.map((row) => (
            <div key={row.label} className="shortcut-group">
              <div className="shortcut-group-label">{row.label}</div>
              <div className="shortcut-row">
                <span className="shortcut-keys">
                  {row.keys.split('+').map((key, index) => (
                    <span key={index}>
                      <kbd>{key.trim()}</kbd>
                      {index < row.keys.split('+').length - 1 ? <span className="shortcut-plus">+</span> : null}
                    </span>
                  ))}
                </span>
                <span className="shortcut-label">{row.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
