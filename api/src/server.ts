import 'dotenv/config';
import express from 'express';
import { setupSocket } from './socket';
import { setupRoutes } from './routes';
import { getDatabase } from './database';

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

// Initialize database
const db = getDatabase();
console.log('Database initialized with', db.getPixelCount(), 'existing pixels');

// Setup Socket.IO
const { server, io } = setupSocket(app);

// Setup routes - mount at /api prefix
try {
  app.use('/api', setupRoutes(io, db));
  console.log('Routes setup successfully');
} catch (error) {
  console.error('Error setting up routes:', error);
  process.exit(1);
}

try {
  server.listen(3000, '0.0.0.0', () => console.log('Server running on port 3000'));
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}