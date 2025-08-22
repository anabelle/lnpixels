import 'dotenv/config';
import express from 'express';
import { setupSocket } from './socket';
import { setupRoutes } from './routes';

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Setup Socket.IO
const { server, io } = setupSocket(app);

// Setup routes - mount at /api prefix
app.use('/api', setupRoutes(io));

server.listen(3000, () => console.log('Server running on port 3000'));