import type { DeckProject } from './types';

/**
 * Curated motion profiles (plan §14.1). Motion is a governed manifest, not ad
 * hoc animation: each profile defines a slide transition plus the timing and
 * easing used for entrance and emphasis effects, with a reduced-motion
 * fallback per plan §14.5.
 */

export interface MotionProfile {
  id: string;
  name: string;
  description: string;
  slideTransition: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'zoom';
  entranceDurationMs: number;
  emphasisDurationMs: number;
  staggerDelayMs: number;
  easing: string;
  reducedMotionFallback: string;
}

export const MOTION_PROFILES: MotionProfile[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No motion at all; instant transitions for dense or technical decks.',
    slideTransition: 'none',
    entranceDurationMs: 0,
    emphasisDurationMs: 0,
    staggerDelayMs: 0,
    easing: 'linear',
    reducedMotionFallback: 'none',
  },
  {
    id: 'subtle',
    name: 'Subtle',
    description: 'Short, quiet fades that never delay reading (plan §14.3).',
    slideTransition: 'fade',
    entranceDurationMs: 320,
    emphasisDurationMs: 260,
    staggerDelayMs: 60,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotionFallback: 'fade',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Slow, cinematic cross-fades for narrative decks.',
    slideTransition: 'fade',
    entranceDurationMs: 560,
    emphasisDurationMs: 420,
    staggerDelayMs: 90,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    reducedMotionFallback: 'fade',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Clean slide-up entrances for product storytelling.',
    slideTransition: 'slide-up',
    entranceDurationMs: 420,
    emphasisDurationMs: 300,
    staggerDelayMs: 70,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotionFallback: 'fade',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'Faster, more pronounced motion for launch-style decks.',
    slideTransition: 'slide-left',
    entranceDurationMs: 480,
    emphasisDurationMs: 360,
    staggerDelayMs: 100,
    easing: 'cubic-bezier(0.34, 1.3, 0.64, 1)',
    reducedMotionFallback: 'fade',
  },
  {
    id: 'data-story',
    name: 'Data Story',
    description: 'Zoom into data points; chart-heavy decks keep transitions calm.',
    slideTransition: 'zoom',
    entranceDurationMs: 460,
    emphasisDurationMs: 380,
    staggerDelayMs: 80,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    reducedMotionFallback: 'fade',
  },
];

const PROFILE_INDEX = new Map<string, MotionProfile>(MOTION_PROFILES.map((profile) => [profile.id, profile]));

/** Aliases from the skill-level motion-profile-manifest to the runtime profiles. */
const PROFILE_ALIASES: Record<string, string> = {
  'executive-subtle': 'subtle',
  'technical-precise': 'subtle',
  'education-guided': 'editorial',
  'pitch-dynamic': 'energetic',
  'seminar-editorial': 'editorial',
  'portfolio-showcase': 'product',
  'self-guided-calm': 'none',
  'none-accessible': 'none',
};

export function getMotionProfile(id?: string): MotionProfile {
  if (!id) return MOTION_PROFILES[1];
  const direct = PROFILE_INDEX.get(id);
  if (direct) return direct;
  const alias = PROFILE_ALIASES[id];
  if (alias) return PROFILE_INDEX.get(alias) ?? MOTION_PROFILES[1];
  return MOTION_PROFILES[1];
}

export function listMotionProfiles(): MotionProfile[] {
  return MOTION_PROFILES;
}

export function isMotionEnabled(profile: MotionProfile): boolean {
  return profile.entranceDurationMs > 0;
}

/**
 * Resolve the effective reduced-motion mode for a deck (plan §14.5).
 * Returns 'always', 'never', or 'system'.
 */
export function reducedMotionMode(deck: DeckProject): 'always' | 'never' | 'system' {
  const setting = deck.presentation?.reducedMotion ?? 'respect-system';
  if (setting === 'always' || setting === 'never') return setting;
  return 'system';
}
