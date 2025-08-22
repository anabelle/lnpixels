import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { setupSocket } from '../src/socket';
import { setupRoutes } from '../src/routes';

let app: express.Application;
let server: any;
let io: any;
let clientSocket: ClientSocket;

beforeEach(async () => {
  app = express();
  const socketSetup = setupSocket(app);
  server = socketSetup.server;
  io = socketSetup.io;
  app.use(setupRoutes(io));
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as any).port;
      clientSocket = ClientIO(`http://localhost:${port}`);
      clientSocket.on('connect', resolve);
    });
  });
});

afterEach(async () => {
  if (clientSocket) clientSocket.disconnect();
  if (io) io.close();
  if (server) {
    await new Promise<void>((resolve) => server.close(resolve));
  }
});

describe('API Server', () => {
  it('should emit pixel.update on pixel purchase', async () => {
    const eventPromise = new Promise((resolve) => {
      clientSocket.on('pixel.update', (data) => {
        resolve(data);
      });
    });

    // Trigger the update via the test endpoint
    await request(app).post('/test-update').expect(200);

    const data = await eventPromise;
    expect(data).toEqual({ x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: expect.any(Number) });
  });
});