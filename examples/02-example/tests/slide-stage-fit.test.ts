import { describe, expect, it } from 'vitest';
import type { DeckProject } from '../src/deck/types';
import { computeScale } from '../src/render/SlideStage';

const CANVAS_16_9: DeckProject['canvas'] = { aspectRatio: '16:9', width: 1600, height: 900, safeMargin: 64 };

function deck(): DeckProject {
  return {
    schemaVersion: '2.1',
    meta: { id: 'fit', slug: 'fit', title: 'Fit', language: 'en' },
    canvas: CANVAS_16_9,
    theme: { id: 'editorial-cream' },
    presentation: { motionProfileId: 'none', defaultBuilds: false },
    editor: { enabled: false },
    slides: [],
  };
}

describe('presenter contain-fit scale (SlideStage computeScale)', () => {
  it('fits a 1600x900 canvas inside each target viewport without cropping', () => {
    const d = deck();
    const cases: Array<[availW: number, availH: number, expected: number]> = [
      [1920, 1080, 1.2], // 16:9 desktop: equal ratios (1920/1600=1.2, 1080/900=1.2)
      [1440, 900, 0.9], // 16:9 laptop: width-bound (1440/1600=0.9 < 900/900=1)
      [1366, 768, 0.853333], // 1366x768: height-bound (768/900=0.8533 < 1366/1600=0.85375)
      [1280, 720, 0.8], // 16:9 small: 1280/1600=0.8, 720/900=0.8
      [1024, 768, 0.64], // 4:3 window: width-bound (1024/1600=0.64 < 768/900=0.853)
      [2560, 1080, 1.2], // ultrawide: height-bound (1080/900=1.2 < 2560/1600=1.6)
    ];
    for (const [w, h, expected] of cases) {
      const s = computeScale(d, w, h);
      expect(s).toBeCloseTo(expected, 5);
      // contain-fit contract: scaled canvas fits inside the available area
      expect(s * d.canvas.width).toBeLessThanOrEqual(w + 1e-6);
      expect(s * d.canvas.height).toBeLessThanOrEqual(h + 1e-6);
    }
  });

  it('returns 1 when there is no measured viewport yet', () => {
    const d = deck();
    expect(computeScale(d, 0, 0)).toBe(1);
    expect(computeScale(d, -10, 5)).toBe(1);
  });

  it('is width-bound for narrow windows and height-bound for short ones', () => {
    const d = deck();
    // narrow but tall: width-bound
    expect(computeScale(d, 800, 1200)).toBeCloseTo(0.5, 6);
    // wide but short: height-bound
    expect(computeScale(d, 3200, 720)).toBeCloseTo(0.8, 6);
  });

  it('scales the canvas by the same ratio on both axes (no stretch)', () => {
    const d = deck();
    const s = computeScale(d, 1900, 920);
    // min(1900/1600, 920/900) = min(1.1875, 1.0222) = 1.02222...
    expect(s).toBeCloseTo(920 / 900, 6);
    // scaled canvas preserves the 16:9 aspect ratio
    expect(s * d.canvas.width).toBeCloseTo((s * d.canvas.height) * (16 / 9), 6);
    // and stays inside the available area
    expect(s * d.canvas.width).toBeLessThanOrEqual(1900);
    expect(s * d.canvas.height).toBeLessThanOrEqual(920);
  });
});
