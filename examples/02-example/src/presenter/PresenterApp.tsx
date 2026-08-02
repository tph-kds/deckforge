import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DeckStore } from '../deck/useDeck';
import type { DeckSlide } from '../deck/types';
import { getTheme } from '../deck/themes';
import { PresenterSlideRenderer, ThumbnailSlideRenderer } from '../render/SlideRenderer';
import { SlideStage } from '../render/SlideStage';
import { ShortcutHelpDialog } from '../ui/ShortcutHelpDialog';
import { useHotkeys } from '../ui/hotkeys';
import { useDocumentScrollLock } from '../deck/scrollbars/scrollbarRuntime';
import { ScrollSurface } from '../deck/scrollbars/ScrollSurface';
import { useTimer } from './useTimer';
import { formatElapsed } from './timerMachine';

interface PresenterAppProps {
  store: DeckStore;
  navigate: (route: 'editor' | 'present') => void;
}

const HELP_ROWS = [
  { keys: 'ArrowRight + Space + PageDown', label: 'Next step / slide' },
  { keys: 'ArrowLeft + Shift+Space + PageUp', label: 'Previous step / slide' },
  { keys: 'Home', label: 'First slide' },
  { keys: 'End', label: 'Last slide' },
  { keys: 'O', label: 'Toggle overview' },
  { keys: 'F', label: 'Toggle fullscreen' },
  { keys: 'S', label: 'Open speaker view' },
  { keys: 'B', label: 'Toggle blackout' },
  { keys: 'T', label: 'Show / hide timer' },
  { keys: 'P', label: 'Pause / resume timer' },
  { keys: 'R', label: 'Reset timer' },
  { keys: 'G', label: 'Go to slide' },
  { keys: 'Escape', label: 'Exit dialog, overview, or fullscreen' },
];

function buildCountFor(slide: DeckSlide, defaultBuilds: boolean): number {
  const animated = slide.blocks.filter((b) => b.animation);
  const click = animated.filter((b) => b.animation?.trigger === 'on-click');
  const withPrev = animated.filter((b) => b.animation?.trigger === 'with-previous' || b.animation?.trigger === 'after-previous');
  const count = click.length + (withPrev.length ? 1 : 0) + (defaultBuilds ? 1 : 0);
  return Math.max(1, count + (click.length === 0 && (withPrev.length > 0 || defaultBuilds) ? 1 : 0));
}

export function PresenterApp({ store, navigate }: PresenterAppProps) {
  const { deck } = store;
  const [index, setIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const timer = useTimer();
  const [timerVisible, setTimerVisible] = useState(true);
  const [speakerOpen, setSpeakerOpen] = useState(false);
  const [buildIndex, setBuildIndex] = useState(0);
  const [chromeActive, setChromeActive] = useState(true);
  const chromeTimer = useRef<number | undefined>(undefined);

  const slides = deck.slides;
  const total = slides.length;
  const safeIndex = Math.min(index, total - 1);
  const slide = slides[safeIndex];
  const theme = getTheme(deck.theme.id);

  useDocumentScrollLock(true);

  const buildCount = useMemo(
    () => buildCountFor(slide, deck.presentation.defaultBuilds ?? false),
    [slide, deck.presentation.defaultBuilds],
  );

  const syncFromHash = useCallback(() => {
    const match = window.location.hash.match(/^#\/(\d+)$/);
    if (match) {
      const parsed = Number(match[1]);
      if (parsed >= 0 && parsed < total) {
        setIndex(parsed);
        setBuildIndex(0);
      }
    }
  }, [total]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    window.history.replaceState({}, '', `#/${safeIndex}`);
  }, [safeIndex]);

  useEffect(() => {
    const onMove = () => {
      setChromeActive(true);
      window.clearTimeout(chromeTimer.current);
      chromeTimer.current = window.setTimeout(() => {
        if (document.fullscreenElement) setChromeActive(false);
      }, 2500);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearTimeout(chromeTimer.current);
    };
  }, []);

  const advance = (step: number) => {
    let nextIndex = safeIndex;
    let nextBuild = buildIndex + step;
    if (nextBuild < 0) {
      nextIndex = Math.max(safeIndex - 1, 0);
      const prevSlide = nextIndex < safeIndex ? slides[nextIndex] : undefined;
      nextBuild = prevSlide ? Math.max(0, buildCountFor(prevSlide, deck.presentation.defaultBuilds ?? false) - 1) : 0;
    } else if (nextBuild >= buildCount) {
      if (safeIndex === total - 1) return;
      nextIndex = Math.min(safeIndex + 1, total - 1);
      nextBuild = 0;
    }
    setIndex(nextIndex);
    setBuildIndex(nextBuild);
  };

  const next = useCallback(
    () => {
      setBlackout(false);
      advance(+1);
    },
    [buildIndex, safeIndex, buildCount, slides, total, deck.presentation.defaultBuilds],
  );

  const previous = useCallback(
    () => {
      setBlackout(false);
      advance(-1);
    },
    [buildIndex, safeIndex, buildCount, slides, total, deck.presentation.defaultBuilds],
  );

  const first = useCallback(() => {
    setBlackout(false);
    setIndex(0);
    setBuildIndex(0);
  }, []);

  const last = useCallback(() => {
    setBlackout(false);
    setIndex(total - 1);
    setBuildIndex(buildCountFor(slides[total - 1], deck.presentation.defaultBuilds ?? false) - 1);
  }, [total, slides, deck.presentation.defaultBuilds]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  useHotkeys([
    { keys: ['arrowright', ' ', 'pagedown'], handler: () => next() },
    { keys: ['arrowleft', 'shift+space', 'pageup'], handler: () => previous() },
    { keys: ['home'], handler: () => first() },
    { keys: ['end'], handler: () => last() },
    { keys: ['o'], handler: () => setOverview((value) => !value) },
    { keys: ['f'], handler: () => toggleFullscreen() },
    { keys: ['s'], handler: () => setSpeakerOpen((value) => !value) },
    { keys: ['b'], handler: () => setBlackout((value) => !value) },
    { keys: ['t'], handler: () => setTimerVisible((value) => !value) },
    { keys: ['p'], handler: () => timer.toggleRunning() },
    { keys: ['r'], handler: () => timer.reset() },
    { keys: ['?'], handler: () => setHelpOpen(true) },
    {
      keys: ['escape'],
      handler: () => {
        if (helpOpen) setHelpOpen(false);
        else if (overview) setOverview(false);
        else if (speakerOpen) setSpeakerOpen(false);
        else if (document.fullscreenElement) void document.exitFullscreen();
      },
    },
  ]);

  const goTo = (target: number) => {
    setIndex(Math.max(0, Math.min(total - 1, target)));
    setBuildIndex(0);
    setOverview(false);
  };

  const progress = total > 1 ? (safeIndex / (total - 1)) * 100 : 0;
  const timerStatus = timer.status === 'idle' ? 'idle' : timer.isRunning ? 'running' : 'paused';

  return (
    <div className={`presenter-shell ${overview ? 'is-overview' : ''} ${blackout ? 'is-blackout' : ''} ${chromeActive ? 'is-chrome-active' : ''}`}>
      {blackout ? (
        <div className="presenter-blackout" role="presentation">
          <div className="blackout-message">Paused — press <kbd>B</kbd> to resume</div>
        </div>
      ) : (
        <>
          <div className="presenter-stage">
            <SlideStage deck={deck} className="presenter-stage-slide">
              {(stageScale) => (
                <div key={safeIndex} className="is-current slide-enter">
                  <PresenterSlideRenderer deck={deck} slide={slide} scale={stageScale} buildIndex={buildIndex} />
                </div>
              )}
            </SlideStage>
          </div>
          <div className="presenter-chrome">
            <div className="presenter-controls" role="toolbar" aria-label="Presenter controls">
              <button type="button" onClick={() => first()} disabled={safeIndex === 0} aria-label="First slide" title="Home">⏮</button>
              <button type="button" onClick={() => previous()} disabled={safeIndex === 0} aria-label="Previous slide" title="←">◀</button>
              <span className="presenter-position">
                {safeIndex + 1} / {total}
              </span>
              <button type="button" onClick={() => next()} disabled={safeIndex === total - 1} aria-label="Next slide" title="→">▶</button>
              <button type="button" onClick={() => last()} disabled={safeIndex === total - 1} aria-label="Last slide" title="End">⏭</button>
              <span className="controls-divider" aria-hidden="true" />
              <button type="button" onClick={() => setOverview((value) => !value)} aria-pressed={overview} aria-label="Toggle overview" title="O">Grid</button>
              <button type="button" onClick={() => setSpeakerOpen((value) => !value)} aria-pressed={speakerOpen} aria-label="Speaker view" title="S">Notes</button>
              <button type="button" onClick={() => setBlackout(true)} aria-label="Blackout" title="B">Pause</button>
              <button type="button" onClick={() => toggleFullscreen()} aria-label="Toggle fullscreen" title="F">⛶</button>
              <button type="button" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="?">?</button>
              <button type="button" onClick={() => navigate('editor')} aria-label="Back to editor" title="Back to editor">
                Edit
              </button>
            </div>
            <div className="presenter-timer">
              {timerVisible ? (
                <div className="timer-display" title={`Timer (${timerStatus})`}>
                  <span className="timer-status-dot" data-status={timerStatus} aria-hidden="true" />
                  <span className="timer-label">{formatElapsed(timer.elapsedMs)}</span>
                  <button
                    type="button"
                    className="timer-control"
                    onClick={timer.toggleRunning}
                    aria-label={timer.status === 'idle' ? 'Start timer' : timer.isRunning ? 'Pause timer' : 'Resume timer'}
                    title="P"
                  >
                    {timer.status === 'idle' ? 'Start' : timer.isRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    className="timer-control"
                    onClick={timer.reset}
                    aria-label="Reset timer"
                    title="R"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <span className="timer-label timer-hidden">T to show timer</span>
              )}
            </div>
          </div>
          <div className="presenter-progress" aria-hidden="true">
            <div className={`presenter-progress-bar is-gradient-progress`} style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {overview && !blackout ? (
        <ScrollSurface surface="grid" className="presenter-overview" aria-label="Slide overview">
          {slides.map((slideItem, slideIndex) => (
            <button
              type="button"
              key={slideItem.id}
              className={`overview-item ${slideIndex === safeIndex ? 'is-active' : ''}`}
              onClick={() => goTo(slideIndex)}
            >
              <div className="overview-thumb">
                <SlideStage deck={deck}>
                  {(stageScale) => <ThumbnailSlideRenderer deck={deck} slide={slideItem} scale={stageScale} />}
                </SlideStage>
              </div>
              <span className="overview-number">{slideIndex + 1}</span>
              <span className="overview-title">{slideItem.title}</span>
            </button>
          ))}
        </ScrollSurface>
      ) : null}

      {speakerOpen && !blackout ? (
        <SpeakerPanel store={store} currentIndex={safeIndex} elapsedMs={timer.elapsedMs} onClose={() => setSpeakerOpen(false)} />
      ) : null}

      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} groups={[]} rows={HELP_ROWS} />
      <style>{`#presenter-fonts{font-family:'${theme.typography.headingFont}'}`}</style>
    </div>
  );
}

interface SpeakerPanelProps {
  store: DeckStore;
  currentIndex: number;
  elapsedMs: number;
  onClose: () => void;
}

function SpeakerPanel({ store, currentIndex, elapsedMs, onClose }: SpeakerPanelProps) {
  const { deck } = store;
  const slide = deck.slides[currentIndex];
  const nextSlide = deck.slides[currentIndex + 1];
  return (
    <div className="speaker-panel" role="dialog" aria-modal="true" aria-label="Speaker view">
      <div className="speaker-panel-header">
        <strong>Speaker view</strong>
        <span className="speaker-clock">{formatElapsed(elapsedMs)}</span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close speaker view">×</button>
      </div>
      <div className="speaker-grid">
        <div className="speaker-current">
          <SlideStage deck={deck}>
            {(stageScale) => <PresenterSlideRenderer deck={deck} slide={slide} scale={stageScale} />}
          </SlideStage>
          <ScrollSurface surface="speaker-notes" className="speaker-notes">
            <h4>Notes</h4>
            <p>{slide.speakerNotes || 'No notes for this slide.'}</p>
          </ScrollSurface>
        </div>
        <div className="speaker-next">
          <h4>Up next</h4>
          {nextSlide ? (
            <div className="speaker-next-thumb">
              <SlideStage deck={deck}>
                {(stageScale) => <ThumbnailSlideRenderer deck={deck} slide={nextSlide} scale={stageScale} />}
              </SlideStage>
              <p>{nextSlide.title}</p>
            </div>
          ) : (
            <p className="speaker-end">End of deck.</p>
          )}
        </div>
      </div>
    </div>
  );
}
