import { useEffect, useState } from 'react';
import { useDeck } from './deck/useDeck';
import { getTheme } from './deck/themes';
import { getMotionProfile, reducedMotionMode } from './deck/motion';
import { EditorApp } from './editor/EditorApp';
import { PresenterApp } from './presenter/PresenterApp';
import { ScrollbarProvider } from './deck/scrollbars/scrollbarRuntime';
import { ExportDialog } from './export/export-dialog';
import { readRoute, writeRoute, type AppRoute } from './routing';
import './styles.css';
import './deck/scrollbars/scrollbars.css';

export function App() {
  const store = useDeck();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [route, setRoute] = useState<AppRoute>(() => readRoute());

  const navigate = (next: AppRoute) => {
    writeRoute(next);
    setRoute(next);
  };

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  const theme = getTheme(store.deck.theme.id);
  const motion = getMotionProfile(store.deck.presentation.motionProfileId);
  const motionReduced = reducedMotionMode(store.deck);

  const reducedClass = motionReduced === 'always' ? 'is-reduced-motion' : motionReduced === 'never' ? 'is-animated' : '';

  const scrollbarOverrides = (store.deck.theme.overrides?.scrollbar as
    | import('./deck/scrollbars/resolveScrollbar').ScrollbarOverrideMap
    | undefined);

  return (
    <div
      className={`app app-${route} ${reducedClass}`}
      style={
        {
          '--theme-background': theme.tokens.background,
          '--theme-foreground': theme.tokens.foreground,
          '--theme-primary': theme.tokens.primary,
          '--theme-secondary': theme.tokens.secondary,
          '--theme-surface': theme.tokens.surface,
          '--theme-muted': theme.tokens.muted,
          '--theme-surface-elevated': theme.tokens.surfaceElevated,
          '--theme-border': theme.tokens.border,
          '--theme-focus': theme.tokens.focus,
          '--theme-canvas': theme.tokens.background,
          '--theme-accent': theme.tokens.secondary,
          '--theme-accent-secondary': theme.tokens.primary,
          '--theme-surface-muted': theme.tokens.muted,
          '--theme-text-secondary': theme.tokens.muted,
          '--theme-divider': theme.tokens.border,
          '--theme-gradient-hero': theme.gradients?.hero,
          '--theme-gradient-emphasis': theme.gradients?.emphasis,
          '--theme-gradient-progress': theme.gradients?.progress,
          '--theme-gradient-highlight': theme.gradients?.highlight,
          '--theme-gradient-accent': theme.gradients?.accent,
          '--font-heading': theme.typography.headingFont,
          '--font-body': theme.typography.bodyFont,
          '--font-code': theme.typography.codeFont,
          '--motion-slide-duration': `${motion.entranceDurationMs}ms`,
          '--motion-slide-easing': motion.easing,
        } as React.CSSProperties
      }
    >
      {route === 'editor' ? (
        <ScrollbarProvider mapping={theme.scrollbar} overrides={scrollbarOverrides}>
          <EditorApp
            store={store}
            navigate={navigate}
            onExport={() => setShowExportDialog(true)}
          />
        </ScrollbarProvider>
      ) : (
        <ScrollbarProvider mapping={theme.scrollbar} overrides={scrollbarOverrides}>
          <PresenterApp store={store} navigate={navigate} />
        </ScrollbarProvider>
      )}

      <ExportDialog
        deck={store.deck}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(blob) => console.log('Export complete', blob.size)}
        onError={(err) => console.error('Export failed', err)}
      />
    </div>
  );
}
