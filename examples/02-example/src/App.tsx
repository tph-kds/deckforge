import { useState } from 'react';
import { useDeck } from './deck/useDeck';
import { getTheme } from './deck/themes';
import { getMotionProfile, reducedMotionMode } from './deck/motion';
import { EditorApp } from './editor/EditorApp';
import { PresenterApp } from './presenter/PresenterApp';
import { ScrollbarProvider } from './deck/scrollbars/scrollbarRuntime';
import './styles.css';
import './deck/scrollbars/scrollbars.css';

export function App() {
  const store = useDeck();
  const [route, setRoute] = useState<'editor' | 'present'>(
    () => (window.location.pathname.endsWith('/present') ? 'present' : 'editor'),
  );

  const navigate = (next: 'editor' | 'present') => {
    window.history.pushState({}, '', next === 'present' ? '/present' : '/editor');
    setRoute(next);
  };

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
          <EditorApp store={store} navigate={navigate} />
        </ScrollbarProvider>
      ) : (
        <ScrollbarProvider mapping={theme.scrollbar} overrides={scrollbarOverrides}>
          <PresenterApp store={store} navigate={navigate} />
        </ScrollbarProvider>
      )}
    </div>
  );
}
