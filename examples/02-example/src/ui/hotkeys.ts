import { useEffect } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface HotkeyBinding {
  keys: string[];
  handler: HotkeyHandler;
  /** When true, the handler runs even when focus is in an input. */
  allowWhileTyping?: boolean;
}

function keyName(event: KeyboardEvent): string {
  if (event.key === ' ') return 'space';
  if (event.key === 'Enter') return 'enter';
  if (event.key === 'Escape') return 'escape';
  if (event.key === 'ArrowLeft') return 'arrowleft';
  if (event.key === 'ArrowRight') return 'arrowright';
  if (event.key === 'ArrowUp') return 'arrowup';
  if (event.key === 'ArrowDown') return 'arrowdown';
  if (event.key === '?') return '?';
  return event.key.toLowerCase();
}

function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const ctrlExpected = parts.includes('ctrl');
  const altExpected = parts.includes('alt');
  const shiftExpected = parts.includes('shift');
  const ctrl = event.ctrlKey || event.metaKey;
  if (ctrl !== ctrlExpected) return false;
  if (event.altKey !== altExpected) return false;
  if (event.shiftKey !== shiftExpected) return false;
  return keyName(event) === key;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    target.hasAttribute('contenteditable')
  );
}

export function useHotkeys(bindings: HotkeyBinding[]): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      for (const binding of bindings) {
        const matched = binding.keys.some((combo) => matchesCombo(event, combo));
        if (!matched) continue;
        if (!binding.allowWhileTyping && isTypingTarget(event.target)) continue;
        event.preventDefault();
        event.stopPropagation();
        binding.handler(event);
        return;
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [bindings]);
}
