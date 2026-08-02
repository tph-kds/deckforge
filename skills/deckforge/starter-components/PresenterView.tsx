import React, { useMemo, useState } from 'react';
import type { DeckProject } from './deck-types';
import { buildStepsForSlide } from './AnimationRuntime';
import { useDeckHotkeys } from './useDeckHotkeys';

export function PresenterView({ deck, renderSlide }: { deck: DeckProject; renderSlide(index: number, buildIndex: number): React.ReactNode }) {
  const visible = useMemo(() => deck.slides.filter((s) => !s.hidden), [deck.slides]);
  const [index, setIndex] = useState(0);
  const [buildIndex, setBuildIndex] = useState(0);
  const slide = visible[index];
  const buildCount = Math.max(1, buildStepsForSlide(slide?.blocks ?? [], !!deck.presentation.defaultBuilds).length);
  const go = (next: number) => { setIndex(Math.min(Math.max(next,0),visible.length-1)); setBuildIndex(0); };
  const next = () => { if (buildIndex + 1 < buildCount) setBuildIndex(buildIndex+1); else go(index+1); };
  const previous = () => { if (buildIndex > 0) setBuildIndex(buildIndex-1); else go(index-1); };
  useDeckHotkeys({
    next,
    previous,
    first: () => go(0),
    last: () => go(visible.length - 1),
    overview: () => {},
    fullscreen: () => {},
    speaker: () => {},
    blackout: () => {},
    shortcuts: () => {},
    exit: () => {},
  });
  return (
    <main className="presenter-view" aria-live="polite">
      <div className="presenter-stage">{renderSlide(index, buildIndex)}</div>
      <div className="presenter-chrome">
        <button onClick={() => go(index-1)} disabled={index===0}>‹</button>
        <span>{index+1} / {visible.length}</span>
        <button onClick={() => go(index+1)} disabled={index===visible.length-1}>›</button>
      </div>
    </main>
  );
}
