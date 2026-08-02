# Motion and Transitions

Motion should explain sequence, causality, hierarchy, or comparison. It must never become a default decorative layer applied to every object.

## Authoring model

Create the final static composition first. Then define serializable build steps and transitions using `assets/animation-manifest.json`. Each step should identify targets, trigger, order, duration, delay, easing, and reduced-motion fallback. Keep timing deterministic so forward navigation, backward navigation, deep links, and presenter synchronization produce the same state.

## Appropriate uses

- reveal evidence in the order it is discussed;
- transform one state into another to explain change;
- highlight a relationship or path in a diagram;
- compare before/after states;
- stage a complex chart without changing the underlying values;
- transition between strongly related slides.

Avoid constant floating elements, excessive parallax, spinning objects, randomized motion, and long cinematic transitions that delay the presenter. Do not animate large amounts of text line by line unless the pacing requires it.

## Runtime behavior

Use transform and opacity where possible. Pause or clean up media and animation when leaving a slide. Preload adjacent assets. Ensure builds can be skipped, reversed, or entered at a specific step. Speaker view and audience view must remain synchronized.

## Reduced motion and static output

Respect system preference and user overrides. Replace spatial movement with immediate appearance or a brief crossfade while preserving narrative order. Static, print, and export modes must show the intended final state or a clearly selected build state.

## Verification

Test forward/backward navigation, rapid key presses, direct deep links, overview exit, reduced motion, browser back/forward, and low-performance devices. Confirm that animation never obscures focus, changes data meaning, or blocks access to content.
