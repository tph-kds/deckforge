# Motion and Transitions

Motion must improve comprehension or presentation pacing. It is not a decoration quota.

## Select a motion profile

Read `assets/motion-profile-manifest.json`. Choose a profile based on presentation archetype, domain, audience, and delivery mode. Use one primary profile throughout the deck with rare justified exceptions.

## Motion layers

Treat motion as four separate systems:

1. **Slide transitions** — movement between slides.
2. **Build steps** — staged reveal or emphasis within one slide.
3. **Data/diagram animation** — line draw, bar grow, counter, path, or state transition.
4. **Editor feedback** — selection, drag, snap, save, panel, and command feedback.

Do not use presenter motion rules for editor chrome.

## Required editor controls

When animation editing is in scope, the inspector must support:

- animation type;
- trigger;
- order/build step;
- duration and delay;
- easing;
- replay/preview;
- remove animation;
- reduced-motion fallback;
- slide transition selection.

## Smoothness rules

- Prefer `transform` and `opacity`.
- Avoid layout-triggering animation of width, height, top, or left for large moving objects.
- Limit simultaneous movement.
- Keep transition durations consistent with the selected motion profile.
- Precompute diagram paths and chart geometry when possible.
- Cancel or settle animations cleanly when navigating quickly.
- Never make essential information available only after an animation the viewer cannot trigger.

## Builds

Navigation must consume build steps before advancing the slide. When moving backward, show the prior slide in completed state unless reverse builds are deliberately supported.

Use builds for sequence, causality, comparison, focus, or explanation. Do not reveal every bullet one by one merely because it is possible.

## Transformation and shared elements

Morph/shared-element transitions are appropriate only when the same semantic object changes state across adjacent slides. Preserve object identity, label, and spatial continuity. Fall back to crossfade if geometry or content does not match safely.

## Reduced motion

Respect the DeckProject setting and `prefers-reduced-motion`. Replace spatial transitions with `appear`, `none`, or a short opacity fade. The deck must remain understandable with all motion disabled.

## Verification

Test rapid next/previous navigation, interrupted builds, fullscreen, reduced motion, low-power devices, media slides, and presenter controls. Fix dropped frames, late content, stuck states, and motion that obscures reading.
