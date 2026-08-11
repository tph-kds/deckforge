import { describe, expect, it } from "vitest";
import {
  clampPan,
  computeFitScale,
  zoomStep,
} from "../src/render/viewport-math";

describe("viewport math: computeFitScale (Phase 9)", () => {
  it("fits a 1600x900 document into a 1280x720 viewport", () => {
    // avail = 1280-64, 720-64 -> min(1216/1600, 656/900) = min(0.76, 0.7288) = 0.7288
    const fit = computeFitScale({ w: 1280, h: 720 }, 1600, 900, 32);
    expect(fit).toBeCloseTo(656 / 900, 4);
    expect(fit).toBeLessThan(1);
  });

  it("is computed from real viewport size, never a constant", () => {
    const small = computeFitScale({ w: 800, h: 600 }, 1600, 900, 32);
    const large = computeFitScale({ w: 2000, h: 1400 }, 1600, 900, 32);
    expect(large).toBeGreaterThan(small);
    // A big viewport can fit the document at >1 scale (up to maxZoom).
    expect(large).toBeGreaterThan(1);
  });

  it("never exceeds maxZoom and never goes below minZoom", () => {
    expect(computeFitScale({ w: 20000, h: 20000 }, 1600, 900, 32, 0.05, 4)).toBe(4);
    // Degenerate (padding swallows the viewport) -> guard returns 1.
    expect(computeFitScale({ w: 10, h: 10 }, 1600, 900, 32, 0.05, 4)).toBe(1);
  });

  it("returns 1 when there is no viewport yet", () => {
    expect(computeFitScale(null, 1600, 900)).toBe(1);
  });
});

describe("viewport math: clampPan (Phase 10-11)", () => {
  it("locks pan at the origin when the document fits (zoom <= fit)", () => {
    const viewport = { w: 1280, h: 720 };
    const pan = clampPan(viewport, 1600, 900, 0.7, 0.72, 32, 400, -600);
    expect(pan).toEqual({ x: 0, y: 0 });
  });

  it("allows pan within clamped bounds when zoomed in", () => {
    const viewport = { w: 800, h: 600 };
    const fit = computeFitScale(viewport, 1600, 900, 32);
    const pan = clampPan(viewport, 1600, 900, 2, fit, 32, 5000, -5000);
    const slideW = 1600 * 2;
    const slideH = 900 * 2;
    const maxX = (slideW - viewport.w) / 2 + 32;
    const maxY = (slideH - viewport.h) / 2 + 32;
    expect(pan.x).toBeCloseTo(maxX, 4);
    expect(pan.y).toBeCloseTo(-maxY, 4);
  });

  it("keeps a strip visible: clamps from overshooting the edge", () => {
    const viewport = { w: 800, h: 600 };
    const fit = computeFitScale(viewport, 1600, 900, 32);
    const pan = clampPan(viewport, 1600, 900, 2, fit, 32, 0, 0);
    // At pan 0 the slide is centered; it must remain fully in reach.
    expect(pan).toEqual({ x: 0, y: 0 });
  });
});

describe("viewport math: zoomStep", () => {
  it("zooms in/out symmetrically and clamps", () => {
    expect(zoomStep(1, 1.15)).toBeCloseTo(1.15, 4);
    expect(zoomStep(1, 1 / 1.15)).toBeCloseTo(1 / 1.15, 4);
    expect(zoomStep(10, 1.15)).toBe(4);
    expect(zoomStep(0.01, 1.15)).toBe(0.05);
  });
});
