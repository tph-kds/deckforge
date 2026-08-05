import type { TimerStatus } from './timerMachine';

export type PresenterMode = 'stage' | 'overview' | 'speaker';

export type BlackoutState = 'none' | 'black' | 'white';

export interface PresenterTimer {
  status: TimerStatus;
  elapsedMs: number;
}

export interface PresenterState {
  slideIndex: number;
  buildIndex: number;
  mode: PresenterMode;
  fullscreen: boolean;
  blackout: BlackoutState;
  timer: PresenterTimer;
  helpVisible: boolean;
}

/**
 * Per-deck facts the pure reducer needs to bound navigation.
 * `buildCountFor(slideIndex)` returns the number of build steps (>= 1) for the
 * slide at that index, so buildIndex can be bounded per slide.
 */
export interface PresenterContext {
  totalSlides: number;
  buildCountFor: (slideIndex: number) => number;
}

export type PresenterEvent =
  | { type: 'NEXT_BUILD' }
  | { type: 'PREVIOUS_BUILD' }
  | { type: 'NEXT_SLIDE' }
  | { type: 'PREVIOUS_SLIDE' }
  | { type: 'GO_TO_SLIDE'; index: number }
  | { type: 'FIRST_SLIDE' }
  | { type: 'LAST_SLIDE' }
  | { type: 'TOGGLE_OVERVIEW' }
  | { type: 'TOGGLE_SPEAKER' }
  | { type: 'ENTER_FULLSCREEN' }
  | { type: 'EXIT_FULLSCREEN' }
  | { type: 'SET_BLACKOUT'; blackout: BlackoutState }
  | { type: 'TOGGLE_BLACKOUT' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SET_TIMER'; status: TimerStatus; elapsedMs: number }
  | { type: 'RESET_TIMER' }
  | { type: 'EXIT_PRESENTATION' };

export function clampSlide(index: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return Math.max(0, Math.min(totalSlides - 1, index));
}

export function clampBuild(buildIndex: number, buildCount: number): number {
  const count = Math.max(1, buildCount);
  return Math.max(0, Math.min(count - 1, buildIndex));
}

export function initialPresenterState(totalSlides: number, totalBuilds: number): PresenterState {
  return {
    slideIndex: clampSlide(0, totalSlides),
    buildIndex: clampBuild(0, totalBuilds),
    mode: 'stage',
    fullscreen: false,
    blackout: 'none',
    timer: { status: 'idle', elapsedMs: 0 },
    helpVisible: false,
  };
}

/** Advance one build; when the final build of the slide is reached, move to the next slide. */
export function nextBuild(state: PresenterState, context: PresenterContext): PresenterState {
  const buildCount = context.buildCountFor(state.slideIndex);
  if (state.buildIndex + 1 < buildCount) {
    return { ...state, buildIndex: state.buildIndex + 1, blackout: 'none' };
  }
  const nextSlideIndex = clampSlide(state.slideIndex + 1, context.totalSlides);
  if (nextSlideIndex === state.slideIndex) {
    return { ...state, blackout: 'none' };
  }
  return { ...state, slideIndex: nextSlideIndex, buildIndex: 0, blackout: 'none' };
}

/** Back up one build; at the first build, move to the previous slide at its final build. */
export function prevBuild(state: PresenterState, context: PresenterContext): PresenterState {
  if (state.buildIndex > 0) {
    return { ...state, buildIndex: state.buildIndex - 1, blackout: 'none' };
  }
  const prevSlideIndex = clampSlide(state.slideIndex - 1, context.totalSlides);
  if (prevSlideIndex === state.slideIndex) {
    return { ...state, blackout: 'none' };
  }
  const prevBuildCount = context.buildCountFor(prevSlideIndex);
  return {
    ...state,
    slideIndex: prevSlideIndex,
    buildIndex: clampBuild(prevBuildCount - 1, prevBuildCount),
    blackout: 'none',
  };
}

function nextSlide(state: PresenterState, context: PresenterContext): PresenterState {
  const target = clampSlide(state.slideIndex + 1, context.totalSlides);
  if (target === state.slideIndex) return { ...state, blackout: 'none' };
  return { ...state, slideIndex: target, buildIndex: 0, blackout: 'none' };
}

function previousSlide(state: PresenterState, context: PresenterContext): PresenterState {
  const target = clampSlide(state.slideIndex - 1, context.totalSlides);
  if (target === state.slideIndex) return { ...state, blackout: 'none' };
  return { ...state, slideIndex: target, buildIndex: 0, blackout: 'none' };
}

function goToSlide(state: PresenterState, index: number, context: PresenterContext): PresenterState {
  const target = clampSlide(index, context.totalSlides);
  return {
    ...state,
    slideIndex: target,
    buildIndex: 0,
    mode: state.mode === 'overview' ? 'stage' : state.mode,
    blackout: 'none',
  };
}

function firstSlide(state: PresenterState, _context: PresenterContext): PresenterState {
  return { ...state, slideIndex: 0, buildIndex: 0, blackout: 'none' };
}

function lastSlide(state: PresenterState, context: PresenterContext): PresenterState {
  const target = clampSlide(context.totalSlides - 1, context.totalSlides);
  const buildCount = context.buildCountFor(target);
  return {
    ...state,
    slideIndex: target,
    buildIndex: clampBuild(buildCount - 1, buildCount),
    blackout: 'none',
  };
}

/** Bound slideIndex to the slide count and buildIndex to the current slide's build count. */
function normalizeBounds(state: PresenterState, context: PresenterContext): PresenterState {
  const slideIndex = clampSlide(state.slideIndex, context.totalSlides);
  const buildIndex = clampBuild(state.buildIndex, context.buildCountFor(slideIndex));
  if (slideIndex === state.slideIndex && buildIndex === state.buildIndex) return state;
  return { ...state, slideIndex, buildIndex };
}

/**
 * Pure presenter state machine (P0-006). Navigation and toggles only ever
 * replace state; the timer snapshot is updated exclusively by SET_TIMER /
 * RESET_TIMER and is never touched by blackout, speaker, overview, help, or
 * fullscreen events.
 */
export function presenterReducer(
  state: PresenterState,
  event: PresenterEvent,
  context: PresenterContext,
): PresenterState {
  const current = normalizeBounds(state, context);
  switch (event.type) {
    case 'NEXT_BUILD':
      return nextBuild(current, context);
    case 'PREVIOUS_BUILD':
      return prevBuild(current, context);
    case 'NEXT_SLIDE':
      return nextSlide(current, context);
    case 'PREVIOUS_SLIDE':
      return previousSlide(current, context);
    case 'GO_TO_SLIDE':
      return goToSlide(current, event.index, context);
    case 'FIRST_SLIDE':
      return firstSlide(current, context);
    case 'LAST_SLIDE':
      return lastSlide(current, context);
    case 'TOGGLE_OVERVIEW':
      return { ...current, mode: current.mode === 'overview' ? 'stage' : 'overview' };
    case 'TOGGLE_SPEAKER':
      return { ...current, mode: current.mode === 'speaker' ? 'stage' : 'speaker' };
    case 'ENTER_FULLSCREEN':
      return { ...current, fullscreen: true };
    case 'EXIT_FULLSCREEN':
      return { ...current, fullscreen: false };
    case 'SET_BLACKOUT':
      return { ...current, blackout: event.blackout };
    case 'TOGGLE_BLACKOUT':
      return { ...current, blackout: current.blackout === 'none' ? 'black' : 'none' };
    case 'TOGGLE_HELP':
      return { ...current, helpVisible: !current.helpVisible };
    case 'SET_TIMER':
      return { ...current, timer: { status: event.status, elapsedMs: Math.max(0, event.elapsedMs) } };
    case 'RESET_TIMER':
      return { ...current, timer: { status: 'idle', elapsedMs: 0 } };
    case 'EXIT_PRESENTATION':
      return initialPresenterState(context.totalSlides, context.buildCountFor(0));
    default:
      return current;
  }
}
