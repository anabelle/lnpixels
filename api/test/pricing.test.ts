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

  // New tests for the max() rule
  it('should charge base price when 2x last price is less than base price (basic -> color)', () => {
    expect(price({ color: '#ff0000', letter: null, lastPrice: 1 })).toBe(10); // max(2, 10) = 10
  });

  it('should charge base price when 2x last price is less than base price (basic -> letter)', () => {
    expect(price({ color: '#ff0000', letter: 'A', lastPrice: 1 })).toBe(100); // max(2, 100) = 100
  });

  it('should charge base price when 2x last price is less than base price (color -> letter)', () => {
    expect(price({ color: '#ff0000', letter: 'A', lastPrice: 10 })).toBe(100); // max(20, 100) = 100
  });

  it('should charge 2x last price when it is higher than base price', () => {
    expect(price({ color: '#ff0000', letter: null, lastPrice: 50 })).toBe(100); // max(100, 10) = 100
  });
});