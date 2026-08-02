import React, { useMemo, useState } from 'react';
import type { DeckProject } from './deck-types';
import { useDeckHotkeys } from './useDeckHotkeys';

export function PresenterView({ deck, renderSlide }: { deck: DeckProject; renderSlide(index: number): React.ReactNode }) {
  const visible = useMemo(() => deck.slides.filter((slide) => !slide.hidden), [deck.slides]);
  const [index, setIndex] = useState(0);
  const go = (next: number) => setIndex(Math.min(Math.max(next, 0), visible.length - 1));
  useDeckHotkeys({ next: () => go(index + 1), previous: () => go(index - 1), first: () => go(0), last: () => go(visible.length - 1) });

  return (
    <main className="presenter-view" aria-live="polite">
      {renderSlide(index)}
      <div className="presenter-progress" aria-label={`Slide ${index + 1} of ${visible.length}`}>
        {index + 1} / {visible.length}
      </div>
    </main>
  );
}
