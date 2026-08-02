import { describe, expect, it } from 'vitest';
import { gridColumnsForItemCount } from '../src/render/SlideRenderer';

describe('deterministic grid columns (plan §6.3)', () => {
  it('uses one column for a single item', () => {
    expect(gridColumnsForItemCount(1)).toBe(1);
  });

  it('uses two columns for pairs and quads', () => {
    expect(gridColumnsForItemCount(2)).toBe(2);
    expect(gridColumnsForItemCount(4)).toBe(2);
  });

  it('uses three columns for triples and larger sets', () => {
    expect(gridColumnsForItemCount(3)).toBe(3);
    expect(gridColumnsForItemCount(5)).toBe(3);
    expect(gridColumnsForItemCount(6)).toBe(3);
    expect(gridColumnsForItemCount(9)).toBe(3);
  });

  it('is deterministic and stable across calls', () => {
    const a = Array.from({ length: 12 }, (_, i) => gridColumnsForItemCount(i + 1));
    const b = Array.from({ length: 12 }, (_, i) => gridColumnsForItemCount(i + 1));
    expect(a).toEqual(b);
  });
});
