import { Router } from 'express';
import { Namespace } from 'socket.io';
import { PaymentsAdapter, NakaPayAdapter, MockPaymentsAdapter } from './payments.js';
import { price } from './pricing.js';

// Track processed payment IDs for idempotency
const processedPayments = new Set<string>();

const router = Router();

// In-memory storage for pixels (will be replaced with database later)
export let pixels: any[] = [
  // "HELLO" word in rainbow colors
  { x: 0, y: 0, color: '#ff0000', letter: 'H', sats: 100, created_at: Date.now() },
  { x: 1, y: 0, color: '#00ff00', letter: 'E', sats: 10, created_at: Date.now() },
  { x: 2, y: 0, color: '#0000ff', letter: 'L', sats: 1, created_at: Date.now() },
  { x: 3, y: 0, color: '#ffff00', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 4, y: 0, color: '#ff00ff', letter: 'O', sats: 10, created_at: Date.now() },

  // Mixed colors with and without letters
  { x: 0, y: 1, color: '#00ffff', letter: 'L', sats: 1, created_at: Date.now() },
  { x: 1, y: 1, color: '#ff8000', letter: 'N', sats: 10, created_at: Date.now() },
  { x: 2, y: 1, color: '#8000ff', letter: 'P', sats: 100, created_at: Date.now() },
  { x: 3, y: 1, color: '#0080ff', sats: 1, created_at: Date.now() },
  { x: 4, y: 1, color: '#ff0080', letter: 'X', sats: 10, created_at: Date.now() },

  // "WORLD" word in different colors
  { x: -2, y: -1, color: '#00ff80', letter: 'W', sats: 100, created_at: Date.now() },
  { x: -1, y: -1, color: '#80ff00', letter: 'O', sats: 10, created_at: Date.now() },
  { x: 0, y: -1, color: '#ff0080', letter: 'R', sats: 1, created_at: Date.now() },
  { x: 1, y: -1, color: '#8000ff', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 2, y: -1, color: '#0080ff', letter: 'D', sats: 10, created_at: Date.now() },

  // Additional demo pixels with letters on different colored backgrounds
  { x: -3, y: 2, color: '#ffffff', letter: 'A', sats: 100, created_at: Date.now() }, // White background
  { x: -2, y: 2, color: '#000000', letter: 'B', sats: 10, created_at: Date.now() },  // Black background
  { x: -1, y: 2, color: '#ff4500', letter: 'C', sats: 1, created_at: Date.now() },   // Orange background
  { x: 0, y: 2, color: '#32cd32', letter: 'D', sats: 100, created_at: Date.now() },  // Lime green background
  { x: 1, y: 2, color: '#9370db', letter: 'E', sats: 10, created_at: Date.now() },   // Medium purple background
  { x: 2, y: 2, color: '#ffd700', letter: 'F', sats: 1, created_at: Date.now() },    // Gold background
  { x: 3, y: 2, color: '#00ced1', letter: 'G', sats: 100, created_at: Date.now() },  // Dark turquoise background

  // "TEST" word diagonally
  { x: 5, y: 3, color: '#dc143c', letter: 'T', sats: 10, created_at: Date.now() },   // Crimson background
  { x: 6, y: 4, color: '#4169e1', letter: 'E', sats: 1, created_at: Date.now() },    // Royal blue background
  { x: 7, y: 5, color: '#228b22', letter: 'S', sats: 100, created_at: Date.now() },  // Forest green background
  { x: 8, y: 6, color: '#8a2be2', letter: 'T', sats: 10, created_at: Date.now() },   // Blue violet background

  // Single letters on various backgrounds to test visibility
  { x: -5, y: -3, color: '#f0f8ff', letter: 'Z', sats: 1, created_at: Date.now() },  // Alice blue background
  { x: -4, y: -3, color: '#fff8dc', letter: 'Y', sats: 10, created_at: Date.now() },  // Cream background
  { x: -3, y: -3, color: '#e6e6fa', letter: 'X', sats: 100, created_at: Date.now() }, // Lavender background
  { x: -2, y: -3, color: '#ffe4e1', letter: 'W', sats: 1, created_at: Date.now() },   // Misty rose background
  { x: -1, y: -3, color: '#f5f5f5', letter: 'V', sats: 10, created_at: Date.now() },  // White smoke background
];

// Initialize payments adapter
const paymentsAdapter: PaymentsAdapter = process.env.NAKAPAY_API_KEY
  ? new NakaPayAdapter()
  : new MockPaymentsAdapter();

export function setupRoutes(io: Namespace) {
  // API info endpoint (mounted at /api/)
  router.get('/', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/nakapay': 'NakaPay webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // Also handle /api (without trailing slash)
  router.get('', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/nakapay': 'NakaPay webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // GET /pixels - returns pixels within specified rectangle
  router.get('/pixels', (req, res) => {
    const { x1, y1, x2, y2 } = req.query;

    // Validate parameters
    const x1Num = parseInt(x1 as string);
    const y1Num = parseInt(y1 as string);
    const x2Num = parseInt(x2 as string);
    const y2Num = parseInt(y2 as string);

    if (isNaN(x1Num) || isNaN(y1Num) || isNaN(x2Num) || isNaN(y2Num)) {
      return res.status(400).json({ error: 'Invalid rectangle coordinates' });
    }

    // Filter pixels within the rectangle bounds
    const pixelsInRect = pixels.filter(pixel =>
      pixel.x >= x1Num && pixel.x <= x2Num &&
      pixel.y >= y1Num && pixel.y <= y2Num
    );

    res.json(pixelsInRect);
  });

  // POST /invoices - Create invoice for single pixel purchase
  router.post('/invoices', async (req, res) => {
    try {
      const { x, y, color, letter } = req.body;

      // Validate input
      if (typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Find existing pixel to get last price
      const existingPixel = pixels.find(p => p.x === x && p.y === y);
      const lastPrice = existingPixel ? existingPixel.sats : null;

      // Calculate price
      const pixelPrice = price({ color, letter, lastPrice });

      // Create invoice
      const invoice = await paymentsAdapter.createInvoice(
        pixelPrice,
        `Pixel purchase: (${x}, ${y})`,
        { x, y, color, letter }
      );

       res.json({
         invoice: invoice.invoice,
         payment_hash: invoice.payment_hash,
         amount: pixelPrice,
         id: invoice.id,
         isMock: !process.env.NAKAPAY_API_KEY
       });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  // POST /invoices/bulk - Create bulk invoice for rectangle purchase
  router.post('/invoices/bulk', async (req, res) => {
    try {
      const { x1, y1, x2, y2, color, letters } = req.body;

      // Validate rectangle coordinates
      if ([x1, y1, x2, y2].some(coord => typeof coord !== 'number')) {
        return res.status(400).json({ error: 'Invalid rectangle coordinates' });
      }

       const width = Math.abs(x2 - x1) + 1;
       const height = Math.abs(y2 - y1) + 1;
       const totalPixels = width * height;

       // Validate max rectangle size (1000 pixels per design.md)
       if (totalPixels > 1000) {
         return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Rectangle size exceeds maximum of 1000 pixels' } });
       }

       // Validate letters length
       if (letters && letters.length > totalPixels) {
         return res.status(400).json({ error: 'Too many letters for rectangle size' });
       }

      // Calculate total price
      let totalPrice = 0;
      const pixelUpdates: any[] = [];

      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
          const existingPixel = pixels.find(p => p.x === x && p.y === y);
          const lastPrice = existingPixel ? existingPixel.sats : null;
          const pixelPrice = price({ color, letter: null, lastPrice });
          totalPrice += pixelPrice;

          pixelUpdates.push({ x, y, color, letter: null, price: pixelPrice });
        }
      }

      // Assign letters if provided
      if (letters) {
        let letterIndex = 0;
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            if (letterIndex < letters.length) {
              const existingPixel = pixels.find(p => p.x === x && p.y === y);
              const lastPrice = existingPixel ? existingPixel.sats : null;
              const pixelPrice = price({ color, letter: letters[letterIndex], lastPrice });
              totalPrice += (pixelPrice - price({ color, letter: null, lastPrice })); // Add letter premium
              pixelUpdates.find(p => p.x === x && p.y === y)!.letter = letters[letterIndex];
              letterIndex++;
            }
          }
        }
      }

      // Create bulk invoice
      const invoice = await paymentsAdapter.createInvoice(
        totalPrice,
        `Bulk pixel purchase: ${totalPixels} pixels`,
        { x1, y1, x2, y2, color, letters, pixelUpdates }
      );

       res.json({
         invoice: invoice.invoice,
         payment_hash: invoice.payment_hash,
         amount: totalPrice,
         id: invoice.id,
         pixelCount: totalPixels,
         isMock: !process.env.NAKAPAY_API_KEY
       });
    } catch (error) {
      console.error('Error creating bulk invoice:', error);
      res.status(500).json({ error: 'Failed to create bulk invoice' });
    }
  });

  // POST /nakapay - Handle NakaPay webhooks
  router.post('/nakapay', (req, res) => {
    try {
      const signature = req.headers['x-nakapay-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }

      // Verify webhook signature
      if (!paymentsAdapter.verifyWebhook(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const payload = JSON.parse(rawBody);

      // Verify webhook signature
      if (!paymentsAdapter.verifyWebhook(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Handle payment completion
      if (payload.event === 'payment.completed') {
        const paymentId = payload.payment_id;

        // Check for idempotency
        if (processedPayments.has(paymentId)) {
          console.log(`Payment ${paymentId} already processed, skipping`);
          return res.json({ success: true, message: 'Already processed' });
        }

        const metadata = payload.metadata;

        if (metadata.pixelUpdates) {
          // Bulk payment
          metadata.pixelUpdates.forEach((update: any) => {
            const existingIndex = pixels.findIndex(p => p.x === update.x && p.y === update.y);
            const newPixel = {
              x: update.x,
              y: update.y,
              color: update.color,
              letter: update.letter,
              sats: update.price,
              created_at: Date.now()
            };

            if (existingIndex >= 0) {
              pixels[existingIndex] = newPixel;
            } else {
              pixels.push(newPixel);
            }

            // Emit real-time update
            io.emit('pixel.update', newPixel);
          });
        } else {
          // Single pixel payment
          const existingIndex = pixels.findIndex(p => p.x === metadata.x && p.y === metadata.y);
          const newPixel = {
            x: metadata.x,
            y: metadata.y,
            color: metadata.color,
            letter: metadata.letter,
            sats: payload.amount,
            created_at: Date.now()
          };

          if (existingIndex >= 0) {
            pixels[existingIndex] = newPixel;
          } else {
            pixels.push(newPixel);
          }

          // Emit real-time update
          io.emit('pixel.update', newPixel);
        }

        // Emit activity update
        io.emit('activity.append', {
          type: 'payment',
          amount: payload.amount,
          timestamp: Date.now(),
          metadata
        });

        // Mark payment as processed for idempotency
        processedPayments.add(paymentId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

   // Example endpoint to simulate pixel update (for testing)
   router.post('/test-update', (req, res) => {
     const pixelData = { x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: Date.now() };

     // Actually save the pixel to the array (like the webhook does)
     const existingIndex = pixels.findIndex(p => p.x === pixelData.x && p.y === pixelData.y);
     if (existingIndex >= 0) {
       pixels[existingIndex] = pixelData;
     } else {
       pixels.push(pixelData);
     }

     io.emit('pixel.update', pixelData);
     res.json({ success: true, pixel: pixelData });
   });

  return router;
}