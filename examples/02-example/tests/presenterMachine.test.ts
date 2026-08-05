import { describe, expect, it } from 'vitest';
import {
  clampSlide,
  initialPresenterState,
  presenterReducer,
  type PresenterContext,
  type PresenterEvent,
  type PresenterState,
} from '../src/presenter/presenterMachine';

function contextWithBuilds(builds: number[]): PresenterContext {
  return {
    totalSlides: builds.length,
    buildCountFor: (index: number) => builds[Math.max(0, Math.min(builds.length - 1, index))] ?? 1,
  };
}

const RUNNING_TIMER = { status: 'running' as const, elapsedMs: 12_345 };

function makeState(partial: Partial<PresenterState> = {}): PresenterState {
  return {
    ...initialPresenterState(3, 3),
    ...partial,
  };
}

function reduce(state: PresenterState, event: PresenterEvent, builds: number[]): PresenterState {
  return presenterReducer(state, event, contextWithBuilds(builds));
}

describe('initialPresenterState', () => {
  it('starts on the first slide at the first build in stage mode', () => {
    expect(initialPresenterState(5, 2)).toEqual({
      slideIndex: 0,
      buildIndex: 0,
      mode: 'stage',
      fullscreen: false,
      blackout: 'none',
      timer: { status: 'idle', elapsedMs: 0 },
      helpVisible: false,
    });
  });
});

describe('clampSlide', () => {
  it('clamps out-of-range indexes to the slide range', () => {
    expect(clampSlide(-1, 3)).toBe(0);
    expect(clampSlide(0, 3)).toBe(0);
    expect(clampSlide(2, 3)).toBe(2);
    expect(clampSlide(9, 3)).toBe(2);
  });

  it('returns 0 for an empty deck', () => {
    expect(clampSlide(0, 0)).toBe(0);
  });
});

describe('NEXT_BUILD', () => {
  it('advances builds within the current slide', () => {
    let state = makeState();
    state = reduce(state, { type: 'NEXT_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
    expect(state.buildIndex).toBe(1);
    state = reduce(state, { type: 'NEXT_BUILD' }, [3, 2, 1]);
    expect(state.buildIndex).toBe(2);
  });

  it('advances the slide and resets the build when the last build is reached', () => {
    let state = makeState({ slideIndex: 0, buildIndex: 2 });
    state = reduce(state, { type: 'NEXT_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(1);
    expect(state.buildIndex).toBe(0);
  });

  it('stays on the last slide at its final build', () => {
    const state = reduce(makeState({ slideIndex: 2, buildIndex: 0 }), { type: 'NEXT_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(2);
    expect(state.buildIndex).toBe(0);
  });

  it('clears blackout when advancing', () => {
    const state = reduce(makeState({ slideIndex: 0, buildIndex: 0, blackout: 'black' }), { type: 'NEXT_BUILD' }, [3, 2, 1]);
    expect(state.blackout).toBe('none');
  });
});

describe('PREVIOUS_BUILD', () => {
  it('backs up one build within the current slide', () => {
    const state = reduce(makeState({ slideIndex: 1, buildIndex: 1 }), { type: 'PREVIOUS_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(1);
    expect(state.buildIndex).toBe(0);
  });

  it('crosses to the previous slide at its final build', () => {
    const state = reduce(makeState({ slideIndex: 1, buildIndex: 0 }), { type: 'PREVIOUS_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
    expect(state.buildIndex).toBe(2);
  });

  it('stays on the first slide at its first build', () => {
    const state = reduce(makeState({ slideIndex: 0, buildIndex: 0 }), { type: 'PREVIOUS_BUILD' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
    expect(state.buildIndex).toBe(0);
  });
});

describe('NEXT_SLIDE / PREVIOUS_SLIDE', () => {
  it('moves to the next slide at build zero and stays at the end', () => {
    let state = reduce(makeState({ slideIndex: 1, buildIndex: 1 }), { type: 'NEXT_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(2);
    expect(state.buildIndex).toBe(0);
    state = reduce(state, { type: 'NEXT_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(2);
  });

  it('moves to the previous slide at build zero and stays at the start', () => {
    let state = reduce(makeState({ slideIndex: 1, buildIndex: 1 }), { type: 'PREVIOUS_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
    expect(state.buildIndex).toBe(0);
    state = reduce(state, { type: 'PREVIOUS_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
  });
});

describe('GO_TO_SLIDE', () => {
  it('clamps out-of-range targets and resets the build index', () => {
    const fromHigh = reduce(makeState({ slideIndex: 1, buildIndex: 1 }), { type: 'GO_TO_SLIDE', index: 99 }, [3, 2, 1]);
    expect(fromHigh.slideIndex).toBe(2);
    expect(fromHigh.buildIndex).toBe(0);
    const fromLow = reduce(makeState({ slideIndex: 1, buildIndex: 1 }), { type: 'GO_TO_SLIDE', index: -5 }, [3, 2, 1]);
    expect(fromLow.slideIndex).toBe(0);
    expect(fromLow.buildIndex).toBe(0);
  });

  it('jumps to a valid slide at build zero', () => {
    const state = reduce(makeState({ slideIndex: 0, buildIndex: 2 }), { type: 'GO_TO_SLIDE', index: 1 }, [3, 2, 1]);
    expect(state.slideIndex).toBe(1);
    expect(state.buildIndex).toBe(0);
  });

  it('exits overview mode', () => {
    const state = reduce(makeState({ mode: 'overview' }), { type: 'GO_TO_SLIDE', index: 2 }, [3, 2, 1]);
    expect(state.mode).toBe('stage');
  });
});

describe('FIRST_SLIDE / LAST_SLIDE', () => {
  it('FIRST_SLIDE goes to the first slide at build zero', () => {
    const state = reduce(makeState({ slideIndex: 2, buildIndex: 1 }), { type: 'FIRST_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(0);
    expect(state.buildIndex).toBe(0);
  });

  it('LAST_SLIDE goes to the last slide at its final build', () => {
    const state = reduce(makeState(), { type: 'LAST_SLIDE' }, [3, 2, 1]);
    expect(state.slideIndex).toBe(2);
    expect(state.buildIndex).toBe(0);
  });
});

describe('mode toggles', () => {
  it('TOGGLE_OVERVIEW enters and exits overview mode', () => {
    let state = reduce(makeState(), { type: 'TOGGLE_OVERVIEW' }, [3, 2, 1]);
    expect(state.mode).toBe('overview');
    state = reduce(state, { type: 'TOGGLE_OVERVIEW' }, [3, 2, 1]);
    expect(state.mode).toBe('stage');
  });

  it('TOGGLE_SPEAKER enters and exits speaker mode', () => {
    let state = reduce(makeState(), { type: 'TOGGLE_SPEAKER' }, [3, 2, 1]);
    expect(state.mode).toBe('speaker');
    state = reduce(state, { type: 'TOGGLE_SPEAKER' }, [3, 2, 1]);
    expect(state.mode).toBe('stage');
  });

  it('blackout, speaker, overview, fullscreen, and help toggles never touch the timer', () => {
    const events: PresenterEvent[] = [
      { type: 'TOGGLE_OVERVIEW' },
      { type: 'TOGGLE_SPEAKER' },
      { type: 'SET_BLACKOUT', blackout: 'black' },
      { type: 'SET_BLACKOUT', blackout: 'white' },
      { type: 'TOGGLE_BLACKOUT' },
      { type: 'ENTER_FULLSCREEN' },
      { type: 'EXIT_FULLSCREEN' },
      { type: 'TOGGLE_HELP' },
    ];
    for (const event of events) {
      const next = reduce(makeState({ timer: RUNNING_TIMER }), event, [3, 2, 1]);
      expect(next.timer).toEqual(RUNNING_TIMER);
    }
  });
});

describe('timer events', () => {
  it('SET_TIMER stores the latest snapshot', () => {
    const state = reduce(makeState(), { type: 'SET_TIMER', status: 'paused', elapsedMs: 5_000 }, [3, 2, 1]);
    expect(state.timer).toEqual({ status: 'paused', elapsedMs: 5_000 });
  });

  it('SET_TIMER clamps a negative elapsed value to zero', () => {
    const state = reduce(makeState(), { type: 'SET_TIMER', status: 'running', elapsedMs: -10 }, [3, 2, 1]);
    expect(state.timer).toEqual({ status: 'running', elapsedMs: 0 });
  });

  it('RESET_TIMER returns the timer to idle at zero', () => {
    const state = reduce(makeState({ timer: RUNNING_TIMER }), { type: 'RESET_TIMER' }, [3, 2, 1]);
    expect(state.timer).toEqual({ status: 'idle', elapsedMs: 0 });
  });
});

describe('FULLSCREEN', () => {
  it('ENTER_FULLSCREEN and EXIT_FULLSCREEN set the fullscreen flag', () => {
    let state = reduce(makeState(), { type: 'ENTER_FULLSCREEN' }, [3, 2, 1]);
    expect(state.fullscreen).toBe(true);
    state = reduce(state, { type: 'EXIT_FULLSCREEN' }, [3, 2, 1]);
    expect(state.fullscreen).toBe(false);
  });
});

describe('EXIT_PRESENTATION', () => {
  it('returns the initial presenter state', () => {
    const state = reduce(
      makeState({
        slideIndex: 2,
        buildIndex: 1,
        mode: 'overview',
        fullscreen: true,
        blackout: 'black',
        timer: RUNNING_TIMER,
        helpVisible: true,
      }),
      { type: 'EXIT_PRESENTATION' },
      [3, 2, 1],
    );
    expect(state).toEqual(initialPresenterState(3, 3));
  });
});
