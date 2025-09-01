// Types for pricing options
export interface PricingOptions {
  color: string | null;      // Hex color like '#ff0000' or null for basic pixel
  letter: string | null;     // Single character or null
  lastPrice: number | null;  // Previous price in sats, or null for new pixel
}

// Base prices as defined in design.md
const BASE_PRICES = {
  basic: 1,      // No color, no letter
  color: 10,     // Color only
  letter: 100    // Color + letter
} as const;

// Price calculation function implementing design.md rules
export function price(options: PricingOptions): number {
  // Determine base price for the new pixel type
  let basePrice: number;
  if (options.letter) {
    // Letter pixels are always 100 sats regardless of color
    basePrice = BASE_PRICES.letter;
  } else if (options.color && options.color !== '#000000') {
    // Colored pixels (not black) are 10 sats
    basePrice = BASE_PRICES.color;
  } else {
    // Basic pixels (no color or black color) are 1 sat
    basePrice = BASE_PRICES.basic;
  }

  // Overwrite rule: charge the maximum of (2x last sold price, base price for new pixel type)
  if (options.lastPrice !== null) {
    const doubleLastPrice = options.lastPrice * 2;
    return Math.max(doubleLastPrice, basePrice);
  }

  // New pixel: use base price
  return basePrice;
}