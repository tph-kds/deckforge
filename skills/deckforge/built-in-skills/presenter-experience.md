# Presenter Experience

The presenter surface is an audience-facing product, not a full-screen editor. It must be calm, predictable, fast, and safe to operate under pressure.

## Audience view

Render only the slide, intentional progress affordances, and controls that appear on demand. Hide selection outlines, comments, autosave, edit panels, and authoring metadata. Support keyboard, click/tap, touch gestures, and visible controls without stealing browser-reserved shortcuts unnecessarily.

Navigation must distinguish build-step progress from slide progress. Support next, previous, first, last, overview, fullscreen, exit, and deep-linked slide entry. Define behavior when a slide contains interactive content so clicking a control does not accidentally advance the deck.

## Speaker view

Provide current slide, next-slide preview, private notes, timer, elapsed/remaining time where configured, progress, and direct navigation. Keep speaker notes and private sources out of the audience route and public API. Synchronize windows through a robust channel with reconnection and stale-session handling.

## Presentation reliability

Preload adjacent slide assets, surface broken media before presenting, keep controls available when fullscreen is denied, and provide a clear exit. Restore focus after overview and dialogs. Pause outgoing media and preserve intentional state when navigating backward.

## Modes

Support canonical horizontal flow first. Add vertical chapters, 3D transitions, autoplay, kiosk, or audience interaction only when the product calls for them. Every optional mode needs a keyboard and reduced-motion equivalent.

## Verification

Run a rehearsal path: open from a shared link, enter fullscreen, advance through every build, use overview, open speaker view, recover from a disconnected second window, resize the browser, navigate by touch, exit, and resume editing. Test deep links and browser back/forward behavior. Presenter navigation failures are blocking.
