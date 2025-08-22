export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectangleSelectionState {
  isActive: boolean;
  startPoint: Point | null;
  endPoint: Point | null;
  rectangle: Rectangle | null;
}

export function createRectangleSelection(): RectangleSelectionState {
  return {
    isActive: false,
    startPoint: null,
    endPoint: null,
    rectangle: null
  };
}

export function updateRectangleSelection(
  state: RectangleSelectionState,
  x: number,
  y: number,
  isShiftPressed: boolean
): RectangleSelectionState {
  if (!isShiftPressed) {
    // If shift is not pressed, cancel any active selection
    return state.isActive ? cancelRectangleSelection(state) : state;
  }

  if (!state.isActive) {
    // Start new selection
    return {
      isActive: true,
      startPoint: { x, y },
      endPoint: { x, y },
      rectangle: { x1: x, y1: y, x2: x, y2: y }
    };
  } else {
    // Update existing selection
    const startPoint = state.startPoint!;
    const endPoint = { x, y };

    // Normalize rectangle coordinates (ensure x1 <= x2, y1 <= y2)
    const rectangle: Rectangle = {
      x1: Math.min(startPoint.x, endPoint.x),
      y1: Math.min(startPoint.y, endPoint.y),
      x2: Math.max(startPoint.x, endPoint.x),
      y2: Math.max(startPoint.y, endPoint.y)
    };

    return {
      isActive: true,
      startPoint,
      endPoint,
      rectangle
    };
  }
}

export function completeRectangleSelection(
  state: RectangleSelectionState
): { rectangle: Rectangle; resetState: RectangleSelectionState } | null {
  if (!state.isActive || !state.rectangle) {
    return null;
  }

  const rectangle = state.rectangle;
  const resetState = createRectangleSelection();

  return { rectangle, resetState };
}

export function cancelRectangleSelection(
  state: RectangleSelectionState
): RectangleSelectionState {
  return createRectangleSelection();
}

export function getSelectedPixelsInRectangle(rectangle: Rectangle): Point[] {
  const pixels: Point[] = [];

  // Use row-major order (left to right, then top to bottom) to match test expectations
  for (let y = rectangle.y1; y <= rectangle.y2; y++) {
    for (let x = rectangle.x1; x <= rectangle.x2; x++) {
      pixels.push({ x, y });
    }
  }

  return pixels;
}

export function isPointInRectangle(point: Point, rectangle: Rectangle): boolean {
  return (
    point.x >= rectangle.x1 &&
    point.x <= rectangle.x2 &&
    point.y >= rectangle.y1 &&
    point.y <= rectangle.y2
  );
}