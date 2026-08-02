import scrollbarManifest from './scrollbar-manifest.json';

export interface ScrollbarStyleEntry {
  id: string;
  renderMode: 'native-themed' | 'system-native' | 'none';
  behavior: {
    autoHide: boolean;
    hideDelayMs: number;
    smoothProgrammaticScroll: boolean;
    reserveGutter: boolean;
  };
  fallbackStyleId: string;
  supportedSurfaces: string[];
}

const STYLES = scrollbarManifest as unknown as ScrollbarStyleEntry[];
const BY_ID = new Map(STYLES.map((style) => [style.id, style]));

export function getScrollbarStyle(id: string): ScrollbarStyleEntry | undefined {
  return BY_ID.get(id);
}

export function listScrollbarStyles(): ScrollbarStyleEntry[] {
  return STYLES;
}
