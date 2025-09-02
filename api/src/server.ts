import 'dotenv/config';
import express from 'express';
import { setupSocket } from './socket';
import { setupRoutes } from './routes';
import { getDatabase } from './database';

const app = express();

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'https://ln.pixel.xx.kg',
     'https://vm-522.lnvps.cloud',
     'http://ln.pixel.xx.kg'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-nakapay-signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Middleware to parse JSON request bodies (allow larger payloads for bulk pixel sets)
app.use(express.json({
  limit: '5mb',
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