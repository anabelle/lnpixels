import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupSocket } from '../src/socket';
import { setupRoutes } from '../src/routes';
import { pixels } from '../src/routes';

describe('POST /invoices', () => {
  let app: express.Application;

  beforeEach(() => {
    pixels.length = 0;
    app = express();
    app.use(express.json());
    const { io } = setupSocket(app);
    app.use(setupRoutes(io));
  });

  it('should create an invoice for a single pixel', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 0, y: 0, color: '#ff0000', letter: 'A' })
      .expect(200);

    expect(response.body).toHaveProperty('invoice');
    expect(response.body).toHaveProperty('payment_hash');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('id');
    expect(response.body.amount).toBe(100); // Letter pixel price
  });

  it('should create an invoice for a pixel without letter', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 1, y: 1, color: '#00ff00' })
      .expect(200);

    expect(response.body.amount).toBe(10); // Color-only pixel price
  });

  it('should validate input parameters', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 'invalid', y: 0, color: '#ff0000' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /invoices/bulk', () => {
  let app: express.Application;

  beforeEach(() => {
    pixels.length = 0;
    app = express();
    app.use(express.json());
    const { io } = setupSocket(app);
    app.use(setupRoutes(io));
  });

  it('should create a bulk invoice for rectangle', async () => {
    const response = await request(app)
      .post('/invoices/bulk')
      .send({ x1: 0, y1: 0, x2: 1, y2: 1, color: '#ff0000', letters: 'AB' })
      .expect(200);

    expect(response.body).toHaveProperty('invoice');
    expect(response.body).toHaveProperty('payment_hash');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('pixelCount');
    expect(response.body.pixelCount).toBe(4); // 2x2 rectangle
  });

  it('should validate rectangle coordinates', async () => {
    const response = await request(app)
      .post('/invoices/bulk')
      .send({ x1: 'invalid', y1: 0, x2: 1, y2: 1, color: '#ff0000' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});