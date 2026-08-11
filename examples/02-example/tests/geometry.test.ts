import { describe, expect, it } from "vitest";
import {
  aspectMatches,
  aspectOf,
  browserFontSizeToPptPt,
  derivePptxSlideSize,
  documentRectToPptxRect,
  documentUnitToPptxInches,
  fontSizeFromCqw,
  isUsableFrame,
  validateFrame,
  validateRectWithinSlide,
} from "../src/export/geometry";

describe("geometry layer: aspect ratio (Phase 4)", () => {
  it("derives an aspect-preserving PPTX size for 16:9", () => {
    const { width, height } = derivePptxSlideSize(1600, 900);
    expect(width).toBeCloseTo(13.333, 3);
    expect(height).toBeCloseTo(7.5, 3);
    expect(aspectMatches(width, height, 1600, 900)).toBe(true);
  });

  it("derives an aspect-preserving PPTX size for a non-16:9 wide canvas", () => {
    // A 1920x800 "wide" canvas must NOT be forced to 13.333x7.5.
    const { width, height } = derivePptxSlideSize(1920, 800);
    expect(aspectMatches(width, height, 1920, 800)).toBe(true);
    expect(aspectMatches(width, height, 1600, 900)).toBe(false);
    expect(width / height).toBeCloseTo(2.4, 6);
  });

  it("preserves aspect for a portrait canvas too", () => {
    const { width, height } = derivePptxSlideSize(900, 1600);
    expect(aspectMatches(width, height, 900, 1600)).toBe(true);
    expect(width).toBeLessThan(height);
  });

  it("never produces NaN/zero sizes from degenerate input", () => {
    expect(derivePptxSlideSize(NaN, 0).width).toBeGreaterThan(0);
    expect(derivePptxSlideSize(-5, -5).height).toBeGreaterThan(0);
  });
});

describe("geometry layer: document-to-PPTX mapping (Phase 5)", () => {
  it("maps a document rect by pure ratio", () => {
    const rect = documentRectToPptxRect(
      { x: 160, y: 90, w: 320, h: 180 },
      1600,
      900,
      13.333,
      7.5,
    );
    expect(rect.x).toBeCloseTo(1.333, 3);
    expect(rect.y).toBeCloseTo(0.75, 3);
    expect(rect.w).toBeCloseTo(2.667, 3);
    expect(rect.h).toBeCloseTo(1.5, 3);
  });

  it("maps a document unit to inches proportionally per axis", () => {
    expect(documentUnitToPptxInches(320, 1600, 13.333)).toBeCloseTo(2.667, 3);
    expect(documentUnitToPptxInches(180, 900, 7.5)).toBeCloseTo(1.5, 3);
  });

  it("converts a browser font size to PPT points scaled with the slide", () => {
    // 24px at 1600x900 -> (7.5*72)/900 = 0.6 pt/px -> 14.4pt
    expect(browserFontSizeToPptPt(24, 900, 7.5)).toBeCloseTo(14.4, 3);
  });

  it("mirrors the browser clamp() for container-query font sizes", () => {
    expect(fontSizeFromCqw(4.2, 34, 52, 1600)).toBe(52); // clamped to max
    expect(fontSizeFromCqw(4.2, 34, 52, 400)).toBe(34); // clamped to min (34 wins)
    expect(fontSizeFromCqw(1.2, 10, 13, 400)).toBe(10); // clamped to min
  });
});

describe("geometry layer: frame validation (no silent 0,0)", () => {
  it("accepts a legitimate x=0/y=0 coordinate", () => {
    expect(validateFrame({ x: 0, y: 0, w: 100, h: 100 })).toEqual([]);
    expect(isUsableFrame({ x: 0, y: 0, w: 100, h: 100 })).toBe(true);
  });

  it("rejects a missing frame", () => {
    const errors = validateFrame({});
    expect(errors.some((e) => e.includes("missing"))).toBe(true);
    expect(isUsableFrame({})).toBe(false);
  });

  it("rejects zero/negative size frames", () => {
    expect(validateFrame({ x: 0, y: 0, w: 0, h: 100 }).some((e) => e.includes("w"))).toBe(true);
    expect(validateFrame({ x: 0, y: 0, w: 100, h: -1 }).some((e) => e.includes("h"))).toBe(true);
    expect(isUsableFrame({ x: 0, y: 0, w: 0, h: 100 })).toBe(false);
  });

  it("rejects NaN geometry", () => {
    expect(isUsableFrame({ x: NaN, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("flags rects that overflow the slide", () => {
    expect(validateRectWithinSlide({ x: 1500, y: 0, w: 200, h: 100 }, 1600, 900).length).toBeGreaterThan(0);
    expect(validateRectWithinSlide({ x: 0, y: 800, w: 100, h: 200 }, 1600, 900).length).toBeGreaterThan(0);
    expect(validateRectWithinSlide({ x: 100, y: 100, w: 200, h: 100 }, 1600, 900)).toEqual([]);
  });
});
