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
  // Overwrite rule: 2x last sold price for any type
  if (options.lastPrice !== null) {
    return options.lastPrice * 2;
  }

  // Base pricing rules
  if (options.color && options.letter) {
    return BASE_PRICES.letter;
  } else if (options.color) {
    return BASE_PRICES.color;
  } else {
    return BASE_PRICES.basic;
  }
}