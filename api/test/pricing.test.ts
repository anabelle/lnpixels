import { describe, it, expect } from 'vitest';
import { price } from '../src/pricing';

describe('price function', () => {
  it('should return 1 sat for basic pixel (no color, no letter)', () => {
    expect(price({ color: null, letter: null, lastPrice: null })).toBe(1);
  });

  it('should return 10 sats for color pixel (color, no letter)', () => {
    expect(price({ color: '#ff0000', letter: null, lastPrice: null })).toBe(10);
  });

  it('should return 100 sats for color + letter pixel', () => {
    expect(price({ color: '#ff0000', letter: 'A', lastPrice: null })).toBe(100);
  });

  it('should return 2x last price for overwrite on basic pixel', () => {
    expect(price({ color: null, letter: null, lastPrice: 1 })).toBe(2);
  });

  it('should return 2x last price for overwrite on color pixel', () => {
    expect(price({ color: '#ff0000', letter: null, lastPrice: 10 })).toBe(20);
  });

  it('should return 2x last price for overwrite on color + letter pixel', () => {
    expect(price({ color: '#ff0000', letter: 'A', lastPrice: 100 })).toBe(200);
  });
});