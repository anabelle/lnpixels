import 'dotenv/config';
import express from 'express';
import { setupSocket } from './socket';
import { setupRoutes } from './routes';

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json({
  verify: (req: any, res, buf) => {
    // Capture raw body for webhook signature verification
    if (req.url === '/api/nakapay') {
      req.rawBody = buf.toString();
    }
  }
}));

// Setup Socket.IO
const { server, io } = setupSocket(app);

// Setup routes - mount at /api prefix
app.use('/api', setupRoutes(io));

server.listen(3000, () => console.log('Server running on port 3000'));