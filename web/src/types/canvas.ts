export interface Pixel {
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number; // Last purchase price in satoshis
}

export interface Viewport {
  x: number; // World X coordinate at center
  y: number; // World Y coordinate at center
  zoom: number; // Zoom level (pixels per world unit)
}

export interface CanvasProps {
  pixels?: Pixel[];
  onPixelSelect?: (x: number, y: number) => void;
  selectedPixel?: { x: number; y: number } | null;
  className?: string;
}