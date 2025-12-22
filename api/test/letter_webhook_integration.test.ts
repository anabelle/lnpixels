import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { setupRoutes } from '../src/routes.js';
import { setupSocket } from '../src/socket.js';
import { Server } from 'http';
import { createTestDatabase } from '../src/database.js';

describe('Letter Webhook Integration', () => {
  let app: express.Application;
  let db: any;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');

    app = express();

    // Setup middleware to capture raw body for webhook
    app.use(express.json({
      verify: (req: any, res, buf) => {
        if (req.url === '/api/nakapay') {
          req.rawBody = buf.toString();
        }
      }
    }));

    // Setup Socket.IO using common setupSocket helper
    const { io } = setupSocket(app);

    // Setup routes with test database
    app.use('/api', setupRoutes(io, db));
  });

  // No afterEach needed as server.listen() is not called; supertest handles ephemeral server

  it('should save pixel with letter via webhook', async () => {
    const payload = {
      event: 'payment.completed',
      payment_id: 'test_payment_123',
      amount: 100,
      description: 'Test payment',
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        x: 100,
        y: 100,
        color: '#ff00ff',
        letter: 'Z'
      }
    };

    const rawBody = JSON.stringify(payload);
    const secret = 'test-webhook-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const response = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    // Check if pixel was saved
    const pixelsResponse = await request(app)
      .get('/api/pixels?x1=95&y1=95&x2=105&y2=105');

    expect(pixelsResponse.status).toBe(200);
    const pixels = pixelsResponse.body;
    const targetPixel = pixels.find((p: any) => p.x === 100 && p.y === 100);

    expect(targetPixel).toBeDefined();
    expect(targetPixel.color).toBe('#ff00ff');
    expect(targetPixel.letter).toBe('Z');
    expect(targetPixel.sats).toBe(100);
  });

  it('should handle bulk pixel purchase with letters', async () => {
    const payload = {
      event: 'payment.completed',
      payment_id: 'bulk_test_123',
      amount: 300,
      description: 'Bulk test payment',
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        x1: 200,
        y1: 200,
        x2: 202,
        y2: 200,
        color: '#00ff00',
        letters: 'ABC',
        pixelUpdates: [
          { x: 200, y: 200, color: '#00ff00', letter: 'A', price: 100 },
          { x: 201, y: 200, color: '#00ff00', letter: 'B', price: 100 },
          { x: 202, y: 200, color: '#00ff00', letter: 'C', price: 100 }
        ]
      }
    };

    const rawBody = JSON.stringify(payload);
    const secret = 'test-webhook-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const response = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    // Check if pixels were saved with letters
    const pixelsResponse = await request(app)
      .get('/api/pixels?x1=195&y1=195&x2=205&y2=205');

    expect(pixelsResponse.status).toBe(200);
    const pixels = pixelsResponse.body;

    const pixelA = pixels.find((p: any) => p.x === 200 && p.y === 200);
    const pixelB = pixels.find((p: any) => p.x === 201 && p.y === 200);
    const pixelC = pixels.find((p: any) => p.x === 202 && p.y === 200);

    expect(pixelA).toBeDefined();
    expect(pixelA.letter).toBe('A');
    expect(pixelB).toBeDefined();
    expect(pixelB.letter).toBe('B');
    expect(pixelC).toBeDefined();
    expect(pixelC.letter).toBe('C');
  });
});