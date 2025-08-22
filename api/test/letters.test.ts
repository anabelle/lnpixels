import { describe, it, expect } from 'vitest';
import { mapLettersToRectangle } from '../src/letters';

describe('mapLettersToRectangle function', () => {
  it('should assign letters left-to-right, top-to-bottom for exact match', () => {
    const result = mapLettersToRectangle({
      letters: 'ABCD',
      rect: { x1: 0, y1: 0, x2: 1, y2: 1 } // 2x2 rectangle = 4 cells
    });

    expect(result).toEqual([
      { x: 0, y: 0, letter: 'A' },
      { x: 1, y: 0, letter: 'B' },
      { x: 0, y: 1, letter: 'C' },
      { x: 1, y: 1, letter: 'D' }
    ]);
  });

  it('should handle fewer letters than cells (remaining cells get null)', () => {
    const result = mapLettersToRectangle({
      letters: 'AB',
      rect: { x1: 0, y1: 0, x2: 1, y2: 1 } // 2x2 rectangle = 4 cells
    });

    expect(result).toEqual([
      { x: 0, y: 0, letter: 'A' },
      { x: 1, y: 0, letter: 'B' },
      { x: 0, y: 1, letter: null },
      { x: 1, y: 1, letter: null }
    ]);
  });

  it('should ignore extra letters beyond rectangle size', () => {
    const result = mapLettersToRectangle({
      letters: 'ABCDE',
      rect: { x1: 0, y1: 0, x2: 1, y2: 1 } // 2x2 rectangle = 4 cells
    });

    expect(result).toEqual([
      { x: 0, y: 0, letter: 'A' },
      { x: 1, y: 0, letter: 'B' },
      { x: 0, y: 1, letter: 'C' },
      { x: 1, y: 1, letter: 'D' }
    ]);
  });

  it('should handle single cell rectangle', () => {
    const result = mapLettersToRectangle({
      letters: 'X',
      rect: { x1: 5, y1: 10, x2: 5, y2: 10 } // 1x1 rectangle
    });

    expect(result).toEqual([
      { x: 5, y: 10, letter: 'X' }
    ]);
  });

  it('should handle empty letters string', () => {
    const result = mapLettersToRectangle({
      letters: '',
      rect: { x1: 0, y1: 0, x2: 1, y2: 0 } // 2x1 rectangle = 2 cells
    });

    expect(result).toEqual([
      { x: 0, y: 0, letter: null },
      { x: 1, y: 0, letter: null }
    ]);
  });

  it('should handle non-zero origin rectangle', () => {
    const result = mapLettersToRectangle({
      letters: 'XY',
      rect: { x1: 10, y1: 20, x2: 11, y2: 20 } // 2x1 rectangle starting at (10,20)
    });

    expect(result).toEqual([
      { x: 10, y: 20, letter: 'X' },
      { x: 11, y: 20, letter: 'Y' }
    ]);
  });
});