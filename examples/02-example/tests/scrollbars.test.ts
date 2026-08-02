import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listScrollbarStyles, getScrollbarStyle } from '../src/deck/scrollbars/scrollbarRegistry';
import {
  DEFAULT_SCROLLBAR_STYLE,
  FALLBACK_SCROLLBAR_STYLE,
  resolveScrollbar,
  resolveScrollbarStyleId,
  scrollbarSupportsAutoHide,
  type ScrollbarOverrideMap,
} from '../src/deck/scrollbars/resolveScrollbar';
import type { ScrollbarStyleId, ScrollbarThemeMapping } from '../src/deck/scrollbars/scrollbarTypes';
import { listThemes } from '../src/deck/themes';

const MAPPING: ScrollbarThemeMapping = {
  default: 'gradient-slim',
  'app-page': 'minimal-thin',
  'slide-list': 'neon-edge',
  inspector: 'gradient-slim',
  grid: 'gradient-slim',
  'speaker-notes': 'minimal-thin',
  modal: 'gradient-slim',
  'asset-library': 'gradient-slim',
  'theme-library': 'gradient-slim',
  presenter: 'none',
  'slide-stage': 'none',
};

describe('scrollbar registry (manifest)', () => {
  it('loads all catalog profiles from the bundled manifest', () => {
    const styles = listScrollbarStyles();
    expect(styles.length).toBeGreaterThanOrEqual(8);
    const ids = styles.map((style) => style.id);
    expect(ids).toEqual(
      expect.arrayContaining(['gradient-slim', 'aurora-glow', 'minimal-thin', 'neon-edge', 'mono-ink', 'high-contrast', 'system-native', 'none']),
    );
  });

  it('exposes the catalog shape used by the resolver', () => {
    const style = getScrollbarStyle('minimal-thin');
    expect(style?.renderMode).toBe('native-themed');
    expect(style?.behavior).toMatchObject({ autoHide: true });
    expect(style?.supportedSurfaces).toContain('slide-list');
  });
});

describe('resolveScrollbarStyleId (plan §8.1 resolution order)', () => {
  it('always resolves presenter and slide-stage to "none"', () => {
    expect(resolveScrollbarStyleId(MAPPING, 'presenter')).toBe('none');
    expect(resolveScrollbarStyleId(MAPPING, 'slide-stage')).toBe('none');
    expect(resolveScrollbarStyleId(undefined, 'presenter', { presenter: 'aurora-glow' })).toBe('none');
  });

  it('prefers an explicit override over the theme mapping and default', () => {
    const overrides: ScrollbarOverrideMap = { 'slide-list': 'mono-ink' };
    expect(resolveScrollbarStyleId(MAPPING, 'slide-list', overrides)).toBe('mono-ink');
  });

  it('falls back to the surface mapping when no override exists', () => {
    expect(resolveScrollbarStyleId(MAPPING, 'app-page')).toBe('minimal-thin');
  });

  it('falls back to the theme default for unmapped surfaces', () => {
    expect(resolveScrollbarStyleId(MAPPING, 'theme-library')).toBe('gradient-slim');
  });

  it('uses the global default when no mapping is provided', () => {
    expect(resolveScrollbarStyleId(undefined, 'inspector')).toBe(DEFAULT_SCROLLBAR_STYLE);
  });
});

describe('resolveScrollbar (plan §8.3 fallback chain)', () => {
  it('returns "none" for non-scrollable surfaces regardless of mapping', () => {
    expect(resolveScrollbar({ ...MAPPING, presenter: 'aurora-glow' } as unknown as ScrollbarThemeMapping, 'presenter')).toBe('none');
    expect(resolveScrollbar(MAPPING, 'slide-stage')).toBe('none');
  });

  it('resolves a style whose renderMode is native-themed', () => {
    expect(resolveScrollbar(MAPPING, 'app-page')).toBe('minimal-thin');
  });

  it('follows the glow -> non-glow fallback for surfaces a glow style cannot cover', () => {
    const limited = getScrollbarStyle('aurora-glow');
    const unsupportedSurface = limited
      ? (['app-page', 'slide-list', 'inspector', 'grid', 'speaker-notes', 'modal', 'asset-library', 'theme-library'].find(
          (surface) => !limited.supportedSurfaces.includes(surface as never),
        ) as never)
      : undefined;
    if (unsupportedSurface) {
      const styleId = resolveScrollbar(MAPPING, unsupportedSurface as never);
      const style = getScrollbarStyle(styleId);
      expect(style).toBeTruthy();
      expect(style!.supportedSurfaces).toContain(unsupportedSurface);
      expect(style!.renderMode).toBe('native-themed');
    }
  });

  it('never loops on cyclic fallback ids and lands on system-native', () => {
    const cyclic: ScrollbarThemeMapping = {
      ...MAPPING,
      'app-page': 'none',
    };
    const resolved = resolveScrollbar(cyclic, 'app-page');
    const style = getScrollbarStyle(resolved);
    expect(style).toBeTruthy();
    expect(style!.supportedSurfaces).toContain('app-page');
  });

  it('falls back to system-native for unknown style ids', () => {
    const resolved = resolveScrollbar(MAPPING, 'app-page', { 'app-page': 'does-not-exist' as ScrollbarStyleId });
    expect(resolved).toBe(FALLBACK_SCROLLBAR_STYLE);
  });
});

describe('scrollbarSupportsAutoHide', () => {
  it('reports behavior flags from the catalog', () => {
    expect(scrollbarSupportsAutoHide('minimal-thin')).toBe(true);
    expect(scrollbarSupportsAutoHide('aurora-glow')).toBe(false);
    expect(scrollbarSupportsAutoHide('high-contrast')).toBe(false);
  });

  it('returns false for unknown styles', () => {
    expect(scrollbarSupportsAutoHide('does-not-exist' as ScrollbarStyleId)).toBe(false);
  });
});

describe('theme scrollbar mappings', () => {
  it('every theme maps presenter and slide-stage to "none"', () => {
    for (const theme of listThemes()) {
      expect(theme.scrollbar?.presenter, `${theme.id} presenter`).toBe('none');
      expect(theme.scrollbar?.['slide-stage'], `${theme.id} slide-stage`).toBe('none');
    }
  });

  it('every theme provides a default and resolvable surface styles', () => {
    for (const theme of listThemes()) {
      expect(theme.scrollbar?.default, `${theme.id} default`).toBeTruthy();
      for (const surface of ['app-page', 'slide-list', 'inspector', 'grid', 'speaker-notes', 'modal', 'asset-library', 'theme-library'] as const) {
        const styleId = resolveScrollbar(theme.scrollbar, surface);
        const style = getScrollbarStyle(styleId);
        expect(style, `${theme.id} ${surface} -> ${styleId}`).toBeTruthy();
        expect(style!.renderMode, `${theme.id} ${surface}`).toBe('native-themed');
      }
    }
  });
});

describe('document scroll lock (plan §19.3)', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      body: { style: { overflow: '' } },
      documentElement: { dataset: {} },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('window', {
      scrollX: 42,
      scrollY: 128,
      scrollTo: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks body overflow and restores previous scroll on unlock', async () => {
    const { lockDocumentScroll, unlockDocumentScroll } = await import('../src/deck/scrollbars/scrollbarRuntime');
    lockDocumentScroll();
    expect((document.body.style as { overflow: string }).overflow).toBe('hidden');
    expect(document.documentElement.dataset.presentationMode).toBe('fullscreen');

    unlockDocumentScroll();
    expect((document.body.style as { overflow: string }).overflow).toBe('');
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 128, left: 42, behavior: 'auto' });
  });
});
