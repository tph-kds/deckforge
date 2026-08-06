import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { audienceIndexOf, projectAudienceSlides } from './audienceProjection';
import {
  clampSlide,
  initialPresenterState,
  presenterReducer,
  type PresenterContext,
  type PresenterEvent,
  type PresenterState,
} from './presenterMachine';

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
  { keys: 'P', label: 'Pause / resume timer' },
  { keys: 'R', label: 'Reset timer' },
  { keys: 'Escape', label: 'Exit dialog, overview, or fullscreen' },
];

function countBuildsForSlide(slide: DeckSlide, defaultBuilds: boolean): number {
  const animated = slide.blocks.filter((b) => b.animation);
  const click = animated.filter((b) => b.animation?.trigger === 'on-click');
  const withPrev = animated.filter((b) => b.animation?.trigger === 'with-previous' || b.animation?.trigger === 'after-previous');
  const count = click.length + (withPrev.length ? 1 : 0) + (defaultBuilds ? 1 : 0);
  return Math.max(1, count + (click.length === 0 && (withPrev.length > 0 || defaultBuilds) ? 1 : 0));
}

export function PresenterApp({ store, navigate }: PresenterAppProps) {
  const { deck } = store;
  const audienceSlides = useMemo(() => projectAudienceSlides(deck), [deck]);
  const slides = useMemo(() => audienceSlides.map((entry) => entry.slide), [audienceSlides]);
  const totalSlides = slides.length;
  const defaultBuilds = deck.presentation.defaultBuilds ?? false;
  const theme = getTheme(deck.theme.id);

  const [chromeActive, setChromeActive] = useState(true);
  const chromeTimer = useRef<number | undefined>(undefined);

  useDocumentScrollLock(true);

  const timer = useTimer();

  const buildCounts = useMemo(
    () => slides.map((slide) => countBuildsForSlide(slide, defaultBuilds)),
    [slides, defaultBuilds],
  );

  const getBuildCountFor = useCallback(
    (slideIndex: number): number =>
      buildCounts[Math.max(0, Math.min(buildCounts.length - 1, slideIndex))] ?? 1,
    [buildCounts],
  );

  const context: PresenterContext = useMemo(
    () => ({ totalSlides, buildCountFor: getBuildCountFor }),
    [totalSlides, getBuildCountFor],
  );

  const reducer = useCallback(
    (prev: PresenterState, event: PresenterEvent) => presenterReducer(prev, event, context),
    [context],
  );

  const [state, dispatch] = useReducer(reducer, initialPresenterState(totalSlides, getBuildCountFor(0)));

  const safeIndex = clampSlide(state.slideIndex, totalSlides);
  const slide = slides[safeIndex];
  const buildCount = getBuildCountFor(safeIndex);
  const buildIndex = Math.max(0, Math.min(buildCount - 1, state.buildIndex));
  const overview = state.mode === 'overview';
  const speakerOpen = state.mode === 'speaker';
  const blackoutActive = state.blackout !== 'none';
  const helpOpen = state.helpVisible;
  const timerStatus = state.timer.status;
  const progress = totalSlides > 1 ? (safeIndex / (totalSlides - 1)) * 100 : 0;

  // Build-aware navigation selectors (P0-007 / DF-017): previous is possible
  // when an earlier build exists or an earlier audience slide exists; next is
  // possible when an unrevealed build exists or a later audience slide exists.
  const canGoPrevious = buildIndex > 0 || safeIndex > 0;
  const canGoNext = buildIndex < buildCount - 1 || safeIndex < totalSlides - 1;

  useEffect(() => {
    dispatch({ type: 'SET_TIMER', status: timer.status, elapsedMs: timer.elapsedMs });
  }, [dispatch, timer.status, timer.elapsedMs]);

  const syncFromHash = useCallback(() => {
    const match = window.location.hash.match(/^#\/present\/slide\/(.+)$/);
    if (match) {
      const index = audienceIndexOf(deck, decodeURIComponent(match[1]));
      if (index >= 0) {
        dispatch({ type: 'GO_TO_SLIDE', index });
      }
    }
  }, [deck, dispatch]);

  useEffect(() => {
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [syncFromHash]);

  useEffect(() => {
    const sourceSlideId = audienceSlides[safeIndex]?.sourceSlideId;
    if (sourceSlideId) {
      window.history.replaceState({}, '', `#/present/slide/${encodeURIComponent(sourceSlideId)}`);
    }
  }, [safeIndex, audienceSlides]);

  useEffect(() => {
    const onFullscreenChange = () => {
      dispatch(document.fullscreenElement ? { type: 'ENTER_FULLSCREEN' } : { type: 'EXIT_FULLSCREEN' });
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [dispatch]);

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

  const enterFullscreen = useCallback(() => {
    dispatch({ type: 'ENTER_FULLSCREEN' });
    void document.documentElement.requestFullscreen().catch(() => {
      dispatch({ type: 'EXIT_FULLSCREEN' });
    });
  }, [dispatch]);

  const exitFullscreen = useCallback(() => {
    dispatch({ type: 'EXIT_FULLSCREEN' });
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [dispatch]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) exitFullscreen();
    else enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  const handleTimerToggle = useCallback(() => {
    timer.toggleRunning();
  }, [timer]);

  const handleTimerReset = useCallback(() => {
    timer.reset();
    dispatch({ type: 'RESET_TIMER' });
  }, [timer, dispatch]);

  const exitPresentation = useCallback(() => {
    dispatch({ type: 'EXIT_PRESENTATION' });
    navigate('editor');
  }, [dispatch, navigate]);

  const goTo = useCallback((target: number) => dispatch({ type: 'GO_TO_SLIDE', index: target }), [dispatch]);

  useHotkeys([
    { keys: ['arrowright', ' ', 'pagedown'], handler: () => dispatch({ type: 'NEXT_BUILD' }) },
    { keys: ['arrowleft', 'shift+space', 'pageup'], handler: () => dispatch({ type: 'PREVIOUS_BUILD' }) },
    { keys: ['home'], handler: () => dispatch({ type: 'FIRST_SLIDE' }) },
    { keys: ['end'], handler: () => dispatch({ type: 'LAST_SLIDE' }) },
    { keys: ['o'], handler: () => dispatch({ type: 'TOGGLE_OVERVIEW' }) },
    { keys: ['f'], handler: () => toggleFullscreen() },
    { keys: ['s'], handler: () => dispatch({ type: 'TOGGLE_SPEAKER' }) },
    { keys: ['b'], handler: () => dispatch({ type: 'TOGGLE_BLACKOUT' }) },
    { keys: ['p'], handler: () => handleTimerToggle() },
    { keys: ['r'], handler: () => handleTimerReset() },
    { keys: ['?'], handler: () => dispatch({ type: 'TOGGLE_HELP' }) },
    {
      keys: ['escape'],
      handler: () => {
        if (state.helpVisible) dispatch({ type: 'TOGGLE_HELP' });
        else if (state.mode === 'overview') dispatch({ type: 'TOGGLE_OVERVIEW' });
        else if (state.mode === 'speaker') dispatch({ type: 'TOGGLE_SPEAKER' });
        else if (document.fullscreenElement) exitFullscreen();
      },
    },
  ]);

  const timerButtonLabel =
    timerStatus === 'idle' ? 'Start timer' : timerStatus === 'running' ? 'Pause timer' : 'Resume timer';
  const timerButtonText = timerStatus === 'idle' ? 'Start' : timerStatus === 'running' ? 'Pause' : 'Resume';

  return (
    <div className={`presenter-shell ${overview ? 'is-overview' : ''} ${blackoutActive ? 'is-blackout' : ''} ${chromeActive ? 'is-chrome-active' : ''}`}>
      {blackoutActive ? (
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
              <button type="button" onClick={() => dispatch({ type: 'FIRST_SLIDE' })} disabled={!canGoPrevious} aria-label="First slide" title="Home">⏮</button>
              <button type="button" onClick={() => dispatch({ type: 'PREVIOUS_BUILD' })} disabled={!canGoPrevious} aria-label="Previous slide" title="←">◀</button>
              <span className="presenter-position">
                {safeIndex + 1} / {totalSlides}
              </span>
              <button type="button" onClick={() => dispatch({ type: 'NEXT_BUILD' })} disabled={!canGoNext} aria-label="Next slide" title="→">▶</button>
              <button type="button" onClick={() => dispatch({ type: 'LAST_SLIDE' })} disabled={!canGoNext} aria-label="Last slide" title="End">⏭</button>
              <span className="controls-divider" aria-hidden="true" />
              <button type="button" onClick={() => dispatch({ type: 'TOGGLE_OVERVIEW' })} aria-pressed={overview} aria-label="Toggle overview" title="O">Grid</button>
              <button type="button" onClick={() => dispatch({ type: 'TOGGLE_SPEAKER' })} aria-pressed={speakerOpen} aria-label="Speaker view" title="S">Notes</button>
              <button type="button" onClick={() => dispatch({ type: 'TOGGLE_BLACKOUT' })} aria-label="Blackout" title="B">Pause</button>
              <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="F">⛶</button>
              <button type="button" onClick={() => dispatch({ type: 'TOGGLE_HELP' })} aria-label="Keyboard shortcuts" title="?">?</button>
              <button type="button" onClick={exitPresentation} aria-label="Back to editor" title="Back to editor">
                Edit
              </button>
            </div>
            <div className="presenter-timer">
              <div className="timer-display" title={`Timer (${timerStatus})`}>
                <span className="timer-status-dot" data-status={timerStatus} aria-hidden="true" />
                <span className="timer-label">{formatElapsed(state.timer.elapsedMs)}</span>
                <button
                  type="button"
                  className="timer-control"
                  onClick={handleTimerToggle}
                  aria-label={timerButtonLabel}
                  title="P"
                >
                  {timerButtonText}
                </button>
                <button
                  type="button"
                  className="timer-control"
                  onClick={handleTimerReset}
                  aria-label="Reset timer"
                  title="R"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <div className="presenter-progress" aria-hidden="true">
            <div className={`presenter-progress-bar is-gradient-progress`} style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {overview && !blackoutActive ? (
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

      {speakerOpen && !blackoutActive ? (
        <SpeakerPanel store={store} slides={slides} currentIndex={safeIndex} elapsedMs={state.timer.elapsedMs} onClose={() => dispatch({ type: 'TOGGLE_SPEAKER' })} />
      ) : null}

      <ShortcutHelpDialog open={helpOpen} onClose={() => dispatch({ type: 'TOGGLE_HELP' })} groups={[]} rows={HELP_ROWS} />
      <style>{`#presenter-fonts{font-family:'${theme.typography.headingFont}'}`}</style>
    </div>
  );
}

interface SpeakerPanelProps {
  store: DeckStore;
  slides: DeckSlide[];
  currentIndex: number;
  elapsedMs: number;
  onClose: () => void;
}

function SpeakerPanel({ store, slides, currentIndex, elapsedMs, onClose }: SpeakerPanelProps) {
  const { deck } = store;
  const slide = slides[currentIndex];
  const nextSlide = slides[currentIndex + 1];
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
