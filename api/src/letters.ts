// Types for letters mapping
export interface Rectangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MappedLetter {
  x: number;
  y: number;
  letter: string | null;
}

/**
 * Maps letters string to rectangle coordinates following design.md rules:
 * - Letters assigned left-to-right, top-to-bottom (row-major order)
 * - If fewer letters than cells, remaining cells get null (color-only)
 * - If more letters than cells, extras are ignored
 *
 * @param options.letters - String of letters to assign
 * @param options.rect - Rectangle bounds (inclusive coordinates)
 * @returns Array of coordinate-letter mappings
 */
export function mapLettersToRectangle(options: {
  letters: string;
  rect: Rectangle;
}): MappedLetter[] {
  const { letters, rect } = options;

  // Calculate rectangle dimensions
  const width = rect.x2 - rect.x1 + 1;
  const height = rect.y2 - rect.y1 + 1;

  const result: MappedLetter[] = [];
  let letterIndex = 0;

  // Iterate through each cell in row-major order (left-to-right, top-to-bottom)
  // This matches the natural reading order specified in design.md
  for (let y = rect.y1; y <= rect.y2; y++) {
    for (let x = rect.x1; x <= rect.x2; x++) {
      // Assign next letter or null if we've exhausted the letters string
      const letter = letterIndex < letters.length ? letters[letterIndex] : null;
      result.push({ x, y, letter });
      letterIndex++;
    }
  }

  return result;
}