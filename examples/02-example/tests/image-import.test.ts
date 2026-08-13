import { describe, expect, it } from 'vitest';
import {
  computeTargetSize,
  chooseOutputType,
  MAX_EDGE,
  JPEG_QUALITY,
} from '../src/deck/image-import';

describe('computeTargetSize', () => {
  it('does not upscale images smaller than the cap', () => {
    expect(computeTargetSize(800, 600)).toEqual({ w: 800, h: 600 });
  });

  it('downscales a landscape image to the max edge preserving aspect ratio', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ w: 1600, h: 1200 });
  });

  it('downscales a portrait image to the max edge preserving aspect ratio', () => {
    expect(computeTargetSize(2000, 4000)).toEqual({ w: 800, h: 1600 });
  });

  it('honors a custom max edge', () => {
    expect(computeTargetSize(4000, 3000, 1000)).toEqual({ w: 1000, h: 750 });
  });

  it('rounds fractional dimensions', () => {
    expect(computeTargetSize(3000, 2000)).toEqual({ w: 1600, h: 1067 });
  });

  it('clamps degenerate downscale so no dimension rounds to zero', () => {
    expect(computeTargetSize(1, 4000)).toEqual({ w: 1, h: 1600 });
  });

  it('exposes the default cap and quality as constants', () => {
    expect(MAX_EDGE).toBe(1600);
    expect(JPEG_QUALITY).toBe(0.85);
  });
});

describe('chooseOutputType', () => {
  it('encodes non-PNG sources as JPEG', () => {
    expect(chooseOutputType('image/jpeg', false)).toBe('image/jpeg');
  });

  it('encodes an opaque PNG as JPEG', () => {
    expect(chooseOutputType('image/png', false)).toBe('image/jpeg');
  });

  it('keeps PNG when the source PNG has transparency', () => {
    expect(chooseOutputType('image/png', true)).toBe('image/png');
  });
});
