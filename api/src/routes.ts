import { Router } from 'express';
import { Namespace } from 'socket.io';
import { PaymentsAdapter, NakaPayAdapter, MockPaymentsAdapter, createPaymentsAdapter, NormalizedPaymentEvent } from './payments.js';
import { price } from './pricing.js';
import { getDatabase, PixelDatabase, Pixel } from './database.js';

// Validation constants
const MAX_COLOR_LENGTH = 7; // #RRGGBB format
const MAX_LETTER_LENGTH = 1;

// Validation helper functions
function validateCoordinates(x: number, y: number): boolean {
  return (
    typeof x === 'number' &&
    !isNaN(x) &&
    Number.isInteger(x) &&
    typeof y === 'number' &&
    !isNaN(y) &&
    Number.isInteger(y)
  );
}

function validateColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  // Validate hex color format (#RRGGBB or #RGB)
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function validateLetter(letter?: string): boolean {
  if (letter === undefined || letter === null || letter === '') return true;
  if (typeof letter !== 'string') return false;
  return letter.length <= MAX_LETTER_LENGTH && /^[A-Za-z0-9]$/.test(letter);
}

function validateRectangleCoordinates(x1: number, y1: number, x2: number, y2: number): boolean {
  return (
    validateCoordinates(x1, y1) &&
    validateCoordinates(x2, y2) &&
    Math.abs(x2 - x1) < 1000 && // Prevent extremely large rectangles
    Math.abs(y2 - y1) < 1000
  );
}

const router = Router();

export function setupRoutes(io: Namespace, db?: PixelDatabase) {
  // Configurable limits (raise via env)
  const MAX_BULK_PIXELS = Number(process.env.MAX_BULK_PIXELS || 1000)
  const MAX_RECT_PIXELS = Number(process.env.MAX_RECT_PIXELS || 1000)

  // Cleanup constants
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const QUOTE_TTL = 10 * 60 * 1000; // 10 minutes for quotes
  const PROCESSED_TTL = 24 * 60 * 60 * 1000; // 24 hours for processed-payment markers

  // Use provided database or get default instance
  const database = db || getDatabase();

  // Initialize payments adapter (provider-gated: Blink > NakaPay > Mock),
  // backed by the same SQLite db for payment-state persistence
  const paymentsAdapter: PaymentsAdapter = createPaymentsAdapter(database);
  const isMockPayments = paymentsAdapter instanceof MockPaymentsAdapter;

  // Memory cleanup: purge expired quotes / stale payment markers from SQLite
  const cleanupOldEntries = () => {
    const cleanedQuotes = database.purgeQuotesOlderThan(QUOTE_TTL);
    const cleanedPayments = database.purgeProcessedPaymentsOlderThan(PROCESSED_TTL);
    if (cleanedQuotes > 0 || cleanedPayments > 0) {
      console.log(`Cleanup: removed ${cleanedQuotes} old quotes, ${cleanedPayments} old payments`);
    }
  };

  // Setup cleanup interval
  const cleanupInterval = setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

  // Cleanup on server shutdown
  const cleanupOnShutdown = () => {
    clearInterval(cleanupInterval);
    console.log('Memory cleanup interval stopped');
  };
  process.on('SIGINT', cleanupOnShutdown);
  process.on('SIGTERM', cleanupOnShutdown);

  console.log('Memory cleanup system initialized');
  // API info endpoint (mounted at /api/)
  router.get('/', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/invoices/pixels': 'Create bulk invoice for specific set of pixels',
      'POST /api/nakapay': 'NakaPay webhook',
      'POST /api/blink': 'Blink webhook',
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
      'POST /api/invoices/pixels': 'Create bulk invoice for specific set of pixels',
      'POST /api/nakapay': 'NakaPay webhook',
      'POST /api/blink': 'Blink webhook',
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

    if (isNaN(x1Num) || isNaN(y1Num) || isNaN(x2Num) || isNaN(y2Num) ||
      !validateRectangleCoordinates(x1Num, y1Num, x2Num, y2Num)) {
      return res.status(400).json({
        error: 'Invalid rectangle coordinates',
        details: 'Coordinates must be integers',
        received: { x1, y1, x2, y2 }
      });
    }

    try {
      // Get pixels from database
      const pixelsInRect = database.getPixelsInRectangle(x1Num, y1Num, x2Num, y2Num);
      res.json(pixelsInRect);
    } catch (error) {
      console.error('Error fetching pixels:', error);
      res.status(500).json({ error: 'Failed to fetch pixels' });
    }
  });

  // POST /invoices - Create invoice for single pixel purchase
  router.post('/invoices', async (req, res) => {
    try {
      const { x, y, color, letter } = req.body;

      // Validate input
      if (!validateCoordinates(x, y)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          details: 'Coordinates must be integers',
          received: { x, y }
        });
      }

      // Validate color
      const pixelColor = color || '#000000';
      if (!validateColor(pixelColor)) {
        return res.status(400).json({
          error: 'Invalid color',
          details: 'Color must be in hex format (#RRGGBB or #RGB)',
          received: { color: pixelColor }
        });
      }

      // Validate letter if provided
      if (!validateLetter(letter)) {
        return res.status(400).json({
          error: 'Invalid letter',
          details: 'Letter must be a single alphanumeric character or empty',
          received: { letter }
        });
      }

      // Find existing pixel to get last price
      const existingPixel = database.getPixel(x, y);
      const lastPrice = existingPixel ? existingPixel.sats : null;

      // Calculate price
      const pixelPrice = price({ color: pixelColor, letter, lastPrice });

      // Create invoice
      const invoice = await paymentsAdapter.createInvoice(
        pixelPrice,
        `Pixel purchase: (${x}, ${y})`,
        { x, y, color: pixelColor, letter }
      );

      res.json({
        invoice: invoice.invoice,
        payment_hash: invoice.payment_hash,
        amount: pixelPrice,
        id: invoice.id,
        isMock: isMockPayments
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
      if (!validateRectangleCoordinates(x1, y1, x2, y2)) {
        return res.status(400).json({
          error: 'Invalid rectangle coordinates',
          details: 'Coordinates must be integers',
          received: { x1, y1, x2, y2 }
        });
      }

      const width = Math.abs(x2 - x1) + 1;
      const height = Math.abs(y2 - y1) + 1;
      const totalPixels = width * height;

      // Validate max rectangle size (configurable)
      if (totalPixels > MAX_RECT_PIXELS) {
        return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Rectangle size exceeds maximum of ${MAX_RECT_PIXELS} pixels` } });
      }

      // Validate letters length and format
      if (letters) {
        if (!Array.isArray(letters)) {
          return res.status(400).json({ error: 'Letters must be an array' });
        }
        if (letters.length > totalPixels) {
          return res.status(400).json({ error: 'Too many letters for rectangle size' });
        }
        // Validate each letter
        for (const letter of letters) {
          if (!validateLetter(letter)) {
            return res.status(400).json({
              error: 'Invalid letter in array',
              details: 'Each letter must be a single alphanumeric character or empty',
              received: { letter }
            });
          }
        }
      }

      // Validate color
      const pixelColor = color || '#000000';
      if (!validateColor(pixelColor)) {
        return res.status(400).json({
          error: 'Invalid color',
          details: 'Color must be in hex format (#RRGGBB or #RGB)',
          received: { color: pixelColor }
        });
      }

      // Calculate total price
      let totalPrice = 0;
      const pixelUpdates: any[] = [];

      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
          const existingPixel = database.getPixel(x, y);
          const lastPrice = existingPixel ? existingPixel.sats : null;
          const pixelPrice = price({ color: pixelColor, letter: null, lastPrice });
          totalPrice += pixelPrice;

          pixelUpdates.push({ x, y, color: pixelColor, letter: null, price: pixelPrice });
        }
      }

      // Assign letters if provided
      if (letters) {
        let letterIndex = 0;
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            if (letterIndex < letters.length) {
              const existingPixel = database.getPixel(x, y);
              const lastPrice = existingPixel ? existingPixel.sats : null;
              const pixelPrice = price({ color: pixelColor, letter: letters[letterIndex], lastPrice });
              totalPrice += (pixelPrice - price({ color: pixelColor, letter: null, lastPrice })); // Add letter premium
              pixelUpdates.find(p => p.x === x && p.y === y)!.letter = letters[letterIndex];
              letterIndex++;
            }
          }
        }
      }

      // Store quote server-side
      const quoteId = `q_${Date.now()}_${Math.random().toString(36).slice(2)}`
      database.saveQuote(quoteId, { pixelUpdates, totalPrice, totalPixels, createdAt: Date.now() })

      // Create invoice with minimal metadata
      const invoice = await paymentsAdapter.createInvoice(
        totalPrice,
        `Bulk pixel purchase: ${totalPixels} pixels`,
        { quoteId, type: 'rect' }
      );

      res.json({
        invoice: invoice.invoice,
        payment_hash: invoice.payment_hash,
        amount: totalPrice,
        id: invoice.id,
        pixelCount: totalPixels,
        quoteId,
        isMock: isMockPayments
      });
    } catch (error) {
      console.error('Error creating bulk invoice:', error);
      res.status(500).json({ error: 'Failed to create bulk invoice' });
    }
  });

  // POST /invoices/pixels - Create bulk invoice for specific set of pixels
  router.post('/invoices/pixels', async (req, res) => {
    try {
      const { pixels, giftRecipient, giftMessage } = req.body;

      // Validate pixels array
      if (!Array.isArray(pixels) || pixels.length === 0) {
        return res.status(400).json({ error: 'Invalid pixels array - must be non-empty array' });
      }

      // Validate max pixel count (configurable)
      if (pixels.length > MAX_BULK_PIXELS) {
        return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Pixel count exceeds maximum of ${MAX_BULK_PIXELS} pixels` } });
      }

      // Validate each pixel
      for (const pixel of pixels) {
        if (!validateCoordinates(pixel.x, pixel.y)) {
          return res.status(400).json({
            error: 'Invalid pixel coordinates',
            details: 'Coordinates must be integers',
            received: { x: pixel.x, y: pixel.y }
          });
        }
        if (!validateColor(pixel.color)) {
          return res.status(400).json({
            error: 'Invalid pixel color',
            details: 'Color must be in hex format (#RRGGBB or #RGB)',
            received: { color: pixel.color }
          });
        }
        if (!validateLetter(pixel.letter)) {
          return res.status(400).json({
            error: 'Invalid pixel letter',
            details: 'Letter must be a single alphanumeric character or empty',
            received: { letter: pixel.letter }
          });
        }
      }

      // Detect gift recipient type
      let giftRecipientType: string | null = null;
      let sanitizedGiftRecipient: string | null = null;
      let sanitizedGiftMessage: string | null = null;
      if (giftRecipient && typeof giftRecipient === 'string' && giftRecipient.trim()) {
        sanitizedGiftRecipient = giftRecipient.trim().slice(0, 100);
        if (sanitizedGiftRecipient.startsWith('npub1')) {
          giftRecipientType = 'nostr';
        } else if (sanitizedGiftRecipient.startsWith('@')) {
          giftRecipientType = 'telegram';
        } else {
          giftRecipientType = 'name';
        }
        if (giftMessage && typeof giftMessage === 'string') {
          sanitizedGiftMessage = giftMessage.trim().slice(0, 100);
        }
      }

      // Calculate total price and prepare pixel updates
      let totalPrice = 0;
      const pixelUpdates: any[] = [];

      for (const pixel of pixels) {
        const existingPixel = database.getPixel(pixel.x, pixel.y);
        const lastPrice = existingPixel ? existingPixel.sats : null;
        const pixelPrice = price({ color: pixel.color, letter: pixel.letter, lastPrice });
        totalPrice += pixelPrice;

        pixelUpdates.push({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          letter: pixel.letter || null,
          price: pixelPrice
        });
      }

      // Store quote server-side (with gift metadata)
      const quoteId = `q_${Date.now()}_${Math.random().toString(36).slice(2)}`
      database.saveQuote(quoteId, {
        pixelUpdates,
        totalPrice,
        totalPixels: pixels.length,
        createdAt: Date.now(),
        giftRecipient: sanitizedGiftRecipient,
        giftRecipientType,
        giftMessage: sanitizedGiftMessage,
      })

      // Create invoice with minimal metadata
      const invoice = await paymentsAdapter.createInvoice(
        totalPrice,
        `Custom pixel purchase: ${pixels.length} pixels`,
        { quoteId, type: 'pixel_set' }
      );

      res.json({
        invoice: invoice.invoice,
        payment_hash: invoice.payment_hash,
        amount: totalPrice,
        id: invoice.id,
        pixelCount: pixels.length,
        quoteId,
        isMock: isMockPayments
      });
    } catch (error) {
      console.error('Error creating pixels invoice:', error);
      res.status(500).json({ error: 'Failed to create pixels invoice' });
    }
  });

  // Shared payment-completion processing (webhook + reconcile). Persists pixels,
  // activity, quote consumption and the idempotency marker atomically; emits after commit.
  const handlePaymentCompleted = async (payload: NormalizedPaymentEvent): Promise<'processed' | 'duplicate' | 'quote_missing' | 'error'> => {
    const paymentId = payload.payment_id;

    // Idempotency (survives restarts — SQLite-backed)
    if (database.isPaymentProcessed(paymentId)) {
      console.log(`Payment ${paymentId} already processed, skipping`);
      return 'duplicate';
    }

    const metadata = payload.metadata;

    try {
      if (metadata.quoteId) {
        // Bulk payment resolved via server-side quote
        const quote = database.getQuote(metadata.quoteId);
        if (!quote) {
          console.error('Quote not found or expired:', metadata.quoteId);
          return 'quote_missing';
        }

        const timestamp = Date.now();
        const activityRecords: any[] = [];
        const savedPixels = database.runInTransaction(() => {
          const pixelData = quote.pixelUpdates.map((update: any) => ({
            x: update.x,
            y: update.y,
            color: update.color || '#000000',
            letter: update.letter,
            sats: update.price,
            gift_recipient: quote.giftRecipient || null,
            gift_recipient_type: quote.giftRecipientType || null,
            gift_message: quote.giftMessage || null,
          }));
          const pixels = database.upsertPixels(pixelData);
          for (const update of quote.pixelUpdates) {
            activityRecords.push(database.insertActivity({
              x: update.x,
              y: update.y,
              color: update.color || '#000000',
              letter: update.letter,
              sats: update.price,
              payment_hash: paymentId,
              created_at: timestamp,
              type: 'bulk_purchase'
            }));
          }
          // Consume the quote + idempotency marker in the same transaction
          database.deleteQuote(metadata.quoteId);
          database.markPaymentProcessed(paymentId);
          return pixels;
        });

        console.log('Created bulk activity records:', activityRecords);

        // Emit real-time updates for each pixel
        savedPixels.forEach(pixel => io.emit('pixel.update', pixel));

        // Emit activity summary for bulk purchase
        if (activityRecords.length > 0) {
          const summaryActivity = {
            ...activityRecords[0],
            summary: `${activityRecords.length} pixels purchased`,
            type: 'bulk_purchase',
            pixelCount: activityRecords.length,
            totalSats: typeof payload?.amount === 'number' ? payload.amount : activityRecords.reduce((sum: number, r: any) => sum + (r?.sats || 0), 0)
          };
          io.emit('activity.append', summaryActivity);
        }
      } else if (metadata.pixelUpdates) {
        // Backward compatibility: older flows that still send pixelUpdates in metadata
        const timestamp = Date.now();
        const activityRecords: any[] = [];
        const savedPixels = database.runInTransaction(() => {
          const pixelData = metadata.pixelUpdates.map((update: any) => ({
            x: update.x,
            y: update.y,
            color: update.color || '#000000',
            letter: update.letter,
            sats: update.price
          }));
          const pixels = database.upsertPixels(pixelData);
          for (const update of metadata.pixelUpdates) {
            activityRecords.push(database.insertActivity({
              x: update.x,
              y: update.y,
              color: update.color || '#000000',
              letter: update.letter,
              sats: update.price,
              payment_hash: paymentId,
              created_at: timestamp,
              type: 'bulk_purchase'
            }));
          }
          database.markPaymentProcessed(paymentId);
          return pixels;
        });
        savedPixels.forEach(pixel => io.emit('pixel.update', pixel));
        if (activityRecords.length > 0) {
          const totalSats = Array.isArray(metadata?.pixelUpdates)
            ? metadata.pixelUpdates.reduce((sum: number, u: any) => sum + (u?.price || 0), 0)
            : activityRecords.reduce((sum: number, r: any) => sum + (r?.sats || 0), 0);
          const summaryActivity = { ...activityRecords[0], summary: `${activityRecords.length} pixels purchased`, type: 'bulk_purchase', pixelCount: activityRecords.length, totalSats };
          io.emit('activity.append', summaryActivity);
        }
      } else {
        // Single pixel payment - use database upsert
        const timestamp = Date.now();
        let activityRecord: any;
        const savedPixel = database.runInTransaction(() => {
          const pixel = database.upsertPixel({
            x: metadata.x,
            y: metadata.y,
            color: metadata.color || '#000000',
            letter: metadata.letter,
            sats: payload.amount ?? 0
          });
          activityRecord = database.insertActivity({
            x: metadata.x,
            y: metadata.y,
            color: metadata.color || '#000000',
            letter: metadata.letter,
            sats: payload.amount ?? 0,
            payment_hash: paymentId,
            created_at: timestamp,
            type: 'single_purchase'
          });
          database.markPaymentProcessed(paymentId);
          return pixel;
        });

        console.log('Created activity record:', activityRecord);
        io.emit('pixel.update', savedPixel);
        io.emit('activity.append', activityRecord);
      }

      // Emit payment confirmation event for the specific payment
      io.emit('payment.confirmed', {
        paymentId: paymentId,
        amount: payload.amount,
        timestamp: Date.now(),
        metadata
      });
      return 'processed';
    } catch (error) {
      console.error('Error saving payment outcome to database:', error);
      return 'error';
    }
  };

  // POST /nakapay | /blink - Handle provider webhooks (NakaPay or Blink)
  router.post(['/nakapay', '/blink'], async (req, res) => {
    try {
      const signature = (req.headers['x-nakapay-signature'] || req.headers['svix-signature']) as string;
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }

      // Verify webhook signature (includes replay protection)
      if (!paymentsAdapter.verifyWebhook(rawBody, signature, req.headers)) {
        return res.status(401).json({ error: 'Invalid signature or potential replay attack' });
      }

      // Blink normalizes (and pull-verifies) via extractPaymentEvent; NakaPay/Mock use raw payload shape
      const payload = paymentsAdapter.extractPaymentEvent
        ? await paymentsAdapter.extractPaymentEvent(rawBody)
        : JSON.parse(rawBody);

      if (!payload) {
        // Non-payment event (e.g. Blink send./onchain. notifications) — ack and move on
        return res.json({ success: true, ignored: true });
      }

      if (payload.event === 'payment.completed') {
        const result = await handlePaymentCompleted(payload);
        if (result === 'duplicate') return res.json({ success: true, message: 'Already processed' });
        if (result === 'quote_missing') return res.status(410).json({ error: 'Quote not found or expired' });
        if (result === 'error') return res.status(500).json({ error: 'Failed to save pixels' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // Reconcile loop: settle pending invoices whose webhook was missed (restart, delivery failure)
  if (paymentsAdapter.pollPendingEvents) {
    const reconcile = async () => {
      try {
        const events = await paymentsAdapter.pollPendingEvents!();
        for (const evt of events) {
          console.log(`Reconcile: settling missed payment ${String(evt.payment_id).slice(0, 16)}...`);
          await handlePaymentCompleted(evt);
        }
      } catch (e) {
        console.error('Reconcile error:', e);
      }
    };
    setTimeout(reconcile, 15 * 1000).unref?.();   // first pass shortly after boot
    setInterval(reconcile, 5 * 60 * 1000).unref?.(); // then every 5 minutes
  }



  // GET /activity - Get recent activity feed
  router.get('/activity', (req, res) => {
    const limitParam = req.query.limit as string;
    let limit = 20; // default limit

    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ error: 'Invalid limit parameter' });
      }
      limit = Math.min(parsedLimit, 100); // max 100 items
    }

    try {
      const activities = database.getRecentActivity(limit);
      res.json({ events: activities });
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // GET /placements/gifts - Get recent gifted pixels
  router.get('/placements/gifts', (req, res) => {
    const limitParam = req.query.limit as string;
    let limit = 50;

    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ error: 'Invalid limit parameter' });
      }
      limit = Math.min(parsedLimit, 100);
    }

    try {
      const gifts = database.getRecentGifts(limit);
      res.json({ gifts });
    } catch (error) {
      console.error('Error fetching gifts:', error);
      res.status(500).json({ error: 'Failed to fetch gifts' });
    }
  });

  // GET /stats - Get real-time canvas statistics
  router.get('/stats', (req, res) => {
    try {
      const pixelCount = database.getPixelCount();
      const recentActivity = database.getRecentActivity(10); // Last 10 activities for summary

      // Calculate total sats from all pixels
      const allPixels = database.getAllPixels();
      const totalSats = allPixels.reduce((sum, pixel) => sum + pixel.sats, 0);

      // Calculate total sats from recent activity
      const recentSats = recentActivity.reduce((sum, activity) => sum + activity.sats, 0);

      // Get unique buyers (approximate by unique payment hashes)
      const uniqueBuyers = new Set(recentActivity.map(a => a.payment_hash)).size;

      res.json({
        totalPixels: pixelCount,
        totalSats: totalSats,
        recentActivityCount: recentActivity.length,
        recentSats: recentSats,
        uniqueBuyers: uniqueBuyers,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Admin restore endpoint
  router.post('/admin/restore', async (req, res) => {
    const token = process.env.ADMIN_TOKEN;
    if (!token || req.headers.authorization !== `Bearer ${token}`) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const { pixels } = req.body;
      if (!Array.isArray(pixels)) return res.status(400).json({ error: 'pixels array required' });
      console.log(`Restoring ${pixels.length} pixels via admin API...`);
      // Map any missing fields if necessary
      const pixelData = pixels.map(p => ({
        ...p,
        letter: p.letter || null,
        created_at: p.created_at || Date.now(),
        updated_at: p.updated_at || Date.now()
      }));

      // Use chunks to avoid too large transactions
      const chunkSize = 500;
      let total = 0;
      for (let i = 0; i < pixelData.length; i += chunkSize) {
        const chunk = pixelData.slice(i, i + chunkSize);
        database.upsertPixels(chunk);
        total += chunk.length;
      }

      console.log(`Restored ${total} pixels.`);
      res.json({ count: total });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Test endpoint for triggering pixel updates (only in development/test)
  if (process.env.ENABLE_TEST_ENDPOINTS === '1') {
    router.post('/test-update', (req, res) => {
      const testPixel = {
        x: 10,
        y: 20,
        color: '#ff0000',
        letter: 'A',
        sats: 100,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      io.emit('pixel.update', testPixel);
      res.json({ success: true, pixel: testPixel });
    });

    // Test endpoint for triggering activity updates
    router.post('/test-activity', (req, res) => {
      console.log('🧪 Test activity endpoint called');
      const testActivity = {
        x: 5,
        y: 15,
        color: '#00ff00',
        letter: 'B',
        sats: 50,
        payment_hash: 'test_hash_' + Date.now(),
        created_at: Date.now(),
        type: 'single_purchase'
      };

      console.log('📡 Emitting test activity event:', testActivity);
      io.emit('activity.append', testActivity);
      console.log('✅ Test activity event emitted');
      res.json({ success: true, activity: testActivity });
    });

    // Test endpoint for simulating payment completion
    router.post('/test-payment', (req, res) => {
      console.log('🧪 Test payment endpoint called');
      const { paymentId, pixelUpdates, quoteId } = req.body;

      if (!paymentId) {
        return res.status(400).json({ error: 'paymentId is required' });
      }

      // Check for idempotency
      if (database.isPaymentProcessed(paymentId)) {
        console.log(`Payment ${paymentId} already processed, skipping`);
        return res.json({ success: true, message: 'Already processed' });
      }

      try {
        if (quoteId) {
          // Resolve server-side quote to simulate webhook behavior
          const quote = database.getQuote(quoteId)
          if (!quote) {
            return res.status(410).json({ error: 'Quote not found or expired' })
          }

          const pixelData = quote.pixelUpdates.map((update: any) => ({
            x: update.x,
            y: update.y,
            color: update.color || '#000000',
            letter: update.letter,
            sats: update.price
          }));

          const savedPixels = database.upsertPixels(pixelData);

          // Insert activity records for bulk purchase
          const timestamp = Date.now();
          const activityRecords = quote.pixelUpdates.map((update: any) =>
            database.insertActivity({
              x: update.x,
              y: update.y,
              color: update.color || '#000000',
              letter: update.letter,
              sats: update.price,
              payment_hash: paymentId,
              created_at: timestamp,
              type: 'bulk_purchase'
            })
          );

          console.log('Created bulk activity records (quote):', activityRecords);

          // Emit real-time updates for each pixel
          savedPixels.forEach(pixel => {
            console.log('Emitting pixel.update for test payment (quote):', pixel);
            io.emit('pixel.update', pixel);
          });

          // Emit activity summary for bulk purchase (mirror production behavior)
          if (activityRecords.length > 0) {
            const totalSats = quote.pixelUpdates.reduce((sum: number, u: any) => sum + (u?.price || 0), 0);
            const summaryActivity = {
              ...activityRecords[0],
              summary: `${activityRecords.length} pixels purchased`,
              type: 'bulk_purchase',
              pixelCount: activityRecords.length,
              totalSats
            };
            console.log('Emitting bulk activity.append event (test, quote):', summaryActivity);
            io.emit('activity.append', summaryActivity);
          }

          // Emit payment confirmation event
          io.emit('payment.confirmed', {
            paymentId: paymentId,
            amount: quote.pixelUpdates.reduce((sum: number, update: any) => sum + update.price, 0),
            timestamp: Date.now(),
            metadata: { quoteId, type: 'pixel_set' }
          });

          // Mark payment as processed
          database.markPaymentProcessed(paymentId);

          // Consume the quote to mimic real flow
          database.deleteQuote(quoteId)

          return res.json({ success: true, pixelsUpdated: savedPixels.length, paymentId, usedQuote: true });
        } else if (pixelUpdates && Array.isArray(pixelUpdates)) {
          // Bulk payment simulation
          const pixelData = pixelUpdates.map((update: any) => ({
            x: update.x,
            y: update.y,
            color: update.color || '#000000',
            letter: update.letter,
            sats: update.price
          }));

          const savedPixels = database.upsertPixels(pixelData);

          // Insert activity records for bulk purchase
          const timestamp = Date.now();
          const activityRecords = pixelUpdates.map((update: any) =>
            database.insertActivity({
              x: update.x,
              y: update.y,
              color: update.color || '#000000',
              letter: update.letter,
              sats: update.price,
              payment_hash: paymentId,
              created_at: timestamp,
              type: 'bulk_purchase'
            })
          );

          console.log('Created bulk activity records:', activityRecords);

          // Emit real-time updates for each pixel
          savedPixels.forEach(pixel => {
            console.log('Emitting pixel.update for test payment:', pixel);
            io.emit('pixel.update', pixel);
          });

          // Emit activity summary for bulk purchase (mirror production behavior)
          if (activityRecords.length > 0) {
            const totalSats = pixelUpdates.reduce((sum: number, u: any) => sum + (u?.price || 0), 0);
            const summaryActivity = { ...activityRecords[0], summary: `${activityRecords.length} pixels purchased`, type: 'bulk_purchase', pixelCount: activityRecords.length, totalSats };
            console.log('Emitting bulk activity.append event (test, pixelUpdates):', summaryActivity);
            io.emit('activity.append', summaryActivity);
          }

          // Emit payment confirmation event
          io.emit('payment.confirmed', {
            paymentId: paymentId,
            amount: pixelUpdates.reduce((sum: number, update: any) => sum + update.price, 0),
            timestamp: Date.now(),
            metadata: { pixelUpdates, type: 'pixel_set' }
          });

          // Mark payment as processed
          database.markPaymentProcessed(paymentId);

          res.json({ success: true, pixelsUpdated: savedPixels.length, paymentId });
        } else {
          res.status(400).json({ error: 'pixelUpdates array is required for test payment' });
        }
      } catch (error) {
        console.error('Error processing test payment:', error);
        res.status(500).json({ error: 'Failed to process test payment' });
      }
    });
  }

  return router;
}