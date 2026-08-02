import { describe, expect, it } from 'vitest';
import { listThemes } from '../src/deck/themes';
import {
  contrastRatio,
  relativeLuminance,
  validateThemeContrast,
} from '../src/deck/contrast';

describe('relativeLuminance', () => {
  it('computes luminance for a mid-gray', () => {
    const l = relativeLuminance('#808080');
    expect(l).toBeGreaterThan(0.2);
    expect(l).toBeLessThan(0.3);
  });

  it('returns 0 for malformed input', () => {
    expect(relativeLuminance('nope')).toBe(0);
    expect(relativeLuminance('#abc')).toBe(0);
  });

  it('is monotonic: white > gray > black', () => {
    expect(relativeLuminance('#FFFFFF')).toBeGreaterThan(relativeLuminance('#808080'));
    expect(relativeLuminance('#808080')).toBeGreaterThan(relativeLuminance('#000000'));
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colors', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 6);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#F97316', '#FFF7ED')).toBeCloseTo(contrastRatio('#FFF7ED', '#F97316'), 6);
  });
});

describe('validateThemeContrast', () => {
  it('passes every curated theme (plan §10.4)', () => {
    for (const theme of listThemes()) {
      const issues = validateThemeContrast(theme);
      expect(issues, `${theme.id}: ${issues.map((issue) => issue.message).join('; ')}`).toHaveLength(0);
    }
  });

  it('flags a low-contrast foreground', () => {
    const theme = listThemes()[0];
    const broken = {
      ...theme,
      tokens: { ...theme.tokens, foreground: '#F8F8F8', background: '#FFFFFF' },
    };
    const issues = validateThemeContrast(broken);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].pair).toContain('foreground');
  });
});
