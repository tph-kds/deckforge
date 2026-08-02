import { describe, expect, it } from 'vitest';
import { loadSeedDeck } from '../src/deck/seed';
import {
  getMotionProfile,
  listMotionProfiles,
  isMotionEnabled,
  reducedMotionMode,
} from '../src/deck/motion';
import type { MotionProfile } from '../src/deck/motion';

describe('motion profiles (plan §14.1)', () => {
  it('exposes the full curated set', () => {
    const ids = listMotionProfiles().map((profile) => profile.id);
    expect(ids).toEqual(expect.arrayContaining(['none', 'subtle', 'editorial', 'product', 'energetic', 'data-story']));
  });

  it('defaults to the subtle profile for unknown ids', () => {
    expect(getMotionProfile('does-not-exist').id).toBe('subtle');
  });

  it('honors a stored profile id', () => {
    expect(getMotionProfile('energetic').slideTransition).toBe('slide-left');
    expect(getMotionProfile('data-story').slideTransition).toBe('zoom');
  });

  it('every profile defines a reduced-motion fallback (plan §14.5)', () => {
    for (const profile of listMotionProfiles()) {
      expect(profile.reducedMotionFallback).toBeTruthy();
    }
  });

  it('all non-none profiles animate transform/opacity, never layout properties', () => {
    const forbidden = ['width', 'height', 'margin', 'padding', 'font-size', 'grid-template'];
    const transitionValues = listMotionProfiles()
      .map((profile) => profile.slideTransition)
      .filter((value) => value !== 'none');
    for (const value of transitionValues) {
      for (const property of forbidden) {
        expect(value, `${property} must not appear in ${value}`).not.toContain(property);
      }
    }
  });
});

describe('reducedMotionMode (plan §14.5)', () => {
  it('returns system by default', () => {
    const deck = loadSeedDeck();
    expect(reducedMotionMode(deck)).toBe('system');
  });

  it('returns always/never when explicitly configured', () => {
    const deck = loadSeedDeck();
    expect(reducedMotionMode({ ...deck, presentation: { ...deck.presentation, reducedMotion: 'always' } })).toBe('always');
    expect(reducedMotionMode({ ...deck, presentation: { ...deck.presentation, reducedMotion: 'never' } })).toBe('never');
  });
});

describe('isMotionEnabled', () => {
  it('treats the none profile as disabled', () => {
    expect(isMotionEnabled(getMotionProfile('none'))).toBe(false);
    expect(isMotionEnabled(getMotionProfile('subtle'))).toBe(true);
  });

  it('uses entranceDurationMs as the gate', () => {
    const custom: MotionProfile = { ...getMotionProfile('subtle'), id: 'x', entranceDurationMs: 0 };
    expect(isMotionEnabled(custom)).toBe(false);
  });
});
