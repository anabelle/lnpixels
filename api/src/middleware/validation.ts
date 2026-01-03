export const MAX_COLOR_LENGTH = 7;
export const MAX_LETTER_LENGTH = 1;

export function validateCoordinates(x: number, y: number): boolean {
  return (
    typeof x === 'number' &&
    !isNaN(x) &&
    Number.isInteger(x) &&
    typeof y === 'number' &&
    !isNaN(y) &&
    Number.isInteger(y)
  );
}

export function validateColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function validateLetter(letter?: string): boolean {
  if (letter === undefined || letter === null || letter === '') return true;
  if (typeof letter !== 'string') return false;
  return letter.length <= MAX_LETTER_LENGTH && /^[A-Za-z0-9]$/.test(letter);
}

export function validateRectangleCoordinates(x1: number, y1: number, x2: number, y2: number): boolean {
  return (
    validateCoordinates(x1, y1) &&
    validateCoordinates(x2, y2) &&
    Math.abs(x2 - x1) < 1000 &&
    Math.abs(y2 - y1) < 1000
  );
}
