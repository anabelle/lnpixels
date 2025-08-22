// Basic server setup with Socket.IO for real-time updates
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new SocketServer(server);

app.get('/', (req, res) => res.send('API Server'));

// Example endpoint to simulate pixel update (for testing)
app.post('/api/test-update', (req, res) => {
  const pixelData = { x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: Date.now() };
  io.emit('pixel.update', pixelData);
  res.json({ success: true });
});

server.listen(3000, () => console.log('Server running on port 3000'));