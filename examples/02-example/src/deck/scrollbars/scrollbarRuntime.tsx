import { createContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ScrollbarOverrideMap } from './resolveScrollbar';
import type { ScrollbarThemeMapping } from './scrollbarTypes';

let previousOverflow = '';
let previousScrollX = 0;
let previousScrollY = 0;

/**
 * Lock the document so the presenter viewport can never scroll. Stores the
 * previous body overflow and window scroll position so they can be restored
 * exactly when presentation mode ends (plan §19.3).
 */
export function lockDocumentScroll(): void {
  previousOverflow = document.body.style.overflow;
  previousScrollX = window.scrollX;
  previousScrollY = window.scrollY;
  document.documentElement.dataset.presentationMode = 'fullscreen';
  document.body.style.overflow = 'hidden';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export function unlockDocumentScroll(): void {
  delete document.documentElement.dataset.presentationMode;
  document.body.style.overflow = previousOverflow;
  window.scrollTo({ top: previousScrollY, left: previousScrollX, behavior: 'auto' });
}

/**
 * Hook that locks document scrolling while the presenter is mounted and
 * restores it on unmount, on fullscreen change, or on route change. The
 * listener also covers the browser emitting fullscreenchange directly.
 */
export function useDocumentScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    lockDocumentScroll();

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        unlockDocumentScroll();
      } else {
        lockDocumentScroll();
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      unlockDocumentScroll();
    };
  }, [active]);
}

export interface ScrollbarContextValue {
  mapping?: ScrollbarThemeMapping;
  overrides?: ScrollbarOverrideMap;
}

export const ScrollbarContext = createContext<ScrollbarContextValue>({});

export interface ScrollbarProviderProps {
  mapping?: ScrollbarThemeMapping;
  overrides?: ScrollbarOverrideMap;
  children: ReactNode;
}

export function ScrollbarProvider({ mapping, overrides, children }: ScrollbarProviderProps) {
  const value = useMemo(() => ({ mapping, overrides }), [mapping, overrides]);
  return <ScrollbarContext.Provider value={value}>{children}</ScrollbarContext.Provider>;
}
