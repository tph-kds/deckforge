import { useEffect } from 'react';

export function useDeckHotkeys(actions: { next(): void; previous(): void; first(): void; last(): void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName ?? '')) return;
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') actions.next();
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') actions.previous();
      else if (event.key === 'Home') actions.first();
      else if (event.key === 'End') actions.last();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
