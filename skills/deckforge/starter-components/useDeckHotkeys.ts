import { useEffect } from 'react';

type Actions = { next(): void; previous(): void; first(): void; last(): void; overview(): void; fullscreen(): void; speaker(): void; blackout(): void; shortcuts(): void; exit(): void };
export function useDeckHotkeys(actions: Actions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName ?? '')) return;
      const key = event.key.toLowerCase();
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') actions.next();
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') actions.previous();
      else if (event.key === 'Home') actions.first();
      else if (event.key === 'End') actions.last();
      else if (key === 'o') actions.overview();
      else if (key === 'f') actions.fullscreen();
      else if (key === 's') actions.speaker();
      else if (key === 'b') actions.blackout();
      else if (event.key === '?') actions.shortcuts();
      else if (event.key === 'Escape') actions.exit();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
