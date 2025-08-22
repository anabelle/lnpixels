import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';

const router = Router();

// In-memory storage for pixels (will be replaced with database later)
let pixels: any[] = [
  { x: 0, y: 0, color: '#ff0000', letter: 'H', sats: 100, created_at: Date.now() },
  { x: 1, y: 0, color: '#00ff00', letter: 'E', sats: 10, created_at: Date.now() },
  { x: 2, y: 0, color: '#0000ff', letter: 'L', sats: 1, created_at: Date.now() },
  { x: 3, y: 0, color: '#ffff00', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 4, y: 0, color: '#ff00ff', letter: 'O', sats: 10, created_at: Date.now() },
  { x: 0, y: 1, color: '#00ffff', sats: 1, created_at: Date.now() },
  { x: 1, y: 1, color: '#ff8000', sats: 10, created_at: Date.now() },
  { x: 2, y: 1, color: '#8000ff', sats: 100, created_at: Date.now() },
  { x: 3, y: 1, color: '#0080ff', sats: 1, created_at: Date.now() },
  { x: 4, y: 1, color: '#ff0080', sats: 10, created_at: Date.now() },
  { x: -2, y: -1, color: '#00ff80', letter: 'W', sats: 100, created_at: Date.now() },
  { x: -1, y: -1, color: '#80ff00', letter: 'O', sats: 10, created_at: Date.now() },
  { x: 0, y: -1, color: '#ff0080', letter: 'R', sats: 1, created_at: Date.now() },
  { x: 1, y: -1, color: '#8000ff', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 2, y: -1, color: '#0080ff', letter: 'D', sats: 10, created_at: Date.now() },
];

export function setupRoutes(io: SocketServer) {
  // API info endpoint (mounted at /api/)
  router.get('/', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/payments/webhook': 'Payment webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // Also handle /api (without trailing slash)
  router.get('', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/payments/webhook': 'Payment webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // GET /pixels - returns pixels within specified rectangle
  router.get('/pixels', (req, res) => {
    const { x1, y1, x2, y2 } = req.query;

    // Validate parameters
    const x1Num = parseInt(x1 as string);
    const y1Num = parseInt(y1 as string);
    const x2Num = parseInt(x2 as string);
    const y2Num = parseInt(y2 as string);

    if (isNaN(x1Num) || isNaN(y1Num) || isNaN(x2Num) || isNaN(y2Num)) {
      return res.status(400).json({ error: 'Invalid rectangle coordinates' });
    }

    // Filter pixels within the rectangle bounds
    const pixelsInRect = pixels.filter(pixel =>
      pixel.x >= x1Num && pixel.x <= x2Num &&
      pixel.y >= y1Num && pixel.y <= y2Num
    );

    res.json(pixelsInRect);
  });

  // Example endpoint to simulate pixel update (for testing)
  router.post('/test-update', (req, res) => {
    const pixelData = { x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: Date.now() };
    io.emit('pixel.update', pixelData);
    res.json({ success: true });
  });

  return router;
}