import { useState } from 'react';
import { useDeck } from './deck/useDeck';
import { getTheme } from './deck/themes';
import { EditorApp } from './editor/EditorApp';
import { PresenterApp } from './presenter/PresenterApp';
import './styles.css';

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

  return (
    <div
      className={`app app-${route}`}
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
          '--font-heading': theme.typography.headingFont,
          '--font-body': theme.typography.bodyFont,
          '--font-code': theme.typography.codeFont,
        } as React.CSSProperties
      }
    >
      {route === 'editor' ? (
        <EditorApp store={store} navigate={navigate} />
      ) : (
        <PresenterApp store={store} navigate={navigate} />
      )}
    </div>
  );
}
