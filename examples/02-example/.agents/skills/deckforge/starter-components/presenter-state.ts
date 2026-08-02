import type { DeckProject, SlideId } from './deck-types';

export type PresenterState = {
  slideIndex: number;
  buildIndex: number;
  overviewOpen: boolean;
  blackout: 'none' | 'black' | 'white';
  notesVisible: boolean;
  timerStartedAt: number | null;
};

export type PresenterAction =
  | { type: 'NEXT'; buildCount: number }
  | { type: 'PREVIOUS'; previousBuildCount: number }
  | { type: 'GO_TO'; slideIndex: number; buildIndex?: number }
  | { type: 'TOGGLE_OVERVIEW' }
  | { type: 'SET_BLACKOUT'; value: PresenterState['blackout'] }
  | { type: 'TOGGLE_NOTES' }
  | { type: 'START_TIMER'; now: number }
  | { type: 'RESET_TIMER' };

export function presenterReducer(
  state: PresenterState,
  action: PresenterAction,
  slideCount: number,
): PresenterState {
  switch (action.type) {
    case 'NEXT':
      if (state.buildIndex < action.buildCount - 1) return { ...state, buildIndex: state.buildIndex + 1 };
      return { ...state, slideIndex: Math.min(state.slideIndex + 1, slideCount - 1), buildIndex: 0 };
    case 'PREVIOUS':
      if (state.buildIndex > 0) return { ...state, buildIndex: state.buildIndex - 1 };
      return {
        ...state,
        slideIndex: Math.max(state.slideIndex - 1, 0),
        buildIndex: state.slideIndex > 0 ? Math.max(action.previousBuildCount - 1, 0) : 0,
      };
    case 'GO_TO':
      return { ...state, slideIndex: Math.min(Math.max(action.slideIndex, 0), slideCount - 1), buildIndex: action.buildIndex ?? 0, overviewOpen: false };
    case 'TOGGLE_OVERVIEW':
      return { ...state, overviewOpen: !state.overviewOpen };
    case 'SET_BLACKOUT':
      return { ...state, blackout: action.value };
    case 'TOGGLE_NOTES':
      return { ...state, notesVisible: !state.notesVisible };
    case 'START_TIMER':
      return { ...state, timerStartedAt: state.timerStartedAt ?? action.now };
    case 'RESET_TIMER':
      return { ...state, timerStartedAt: null };
  }
}

export function slideIndexFromDeepLink(deck: DeckProject, id: SlideId): number {
  return Math.max(deck.slides.filter((slide) => !slide.hidden).findIndex((slide) => slide.id === id), 0);
}
