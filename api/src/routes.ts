import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';

const router = Router();

export function setupRoutes(io: SocketServer) {
  // Root endpoint
  router.get('/', (req, res) => res.send('API Server'));

  // Example endpoint to simulate pixel update (for testing)
  router.post('/api/test-update', (req, res) => {
    const pixelData = { x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: Date.now() };
    io.emit('pixel.update', pixelData);
    res.json({ success: true });
  });

  return router;
}