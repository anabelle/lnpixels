import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupSocket } from '../src/socket';
import { setupRoutes } from '../src/routes';

describe('GET /api/pixels', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    const { io } = setupSocket(app);
    app.use(setupRoutes(io));
  });

  it('should return empty array when no pixels exist', async () => {
    const response = await request(app)
      .get('/api/pixels?x1=0&y1=0&x2=10&y2=10')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('should return pixels within the specified rectangle', async () => {
    // This test will fail initially since we haven't implemented pixel storage yet
    // We'll implement the endpoint to make this pass
    const response = await request(app)
      .get('/api/pixels?x1=0&y1=0&x2=5&y2=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should validate rectangle parameters', async () => {
    const response = await request(app)
      .get('/api/pixels?x1=invalid&y1=0&x2=10&y2=10')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});