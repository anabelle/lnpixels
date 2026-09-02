import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { PendingInvoiceRecord, PendingInvoiceStore } from './payments.js';

// Database schema
const CREATE_PIXELS_TABLE = `
  CREATE TABLE IF NOT EXISTS pixels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    letter TEXT,
    sats INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(x, y)
  )
`;

const CREATE_ACTIVITY_TABLE = `
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    letter TEXT,
    sats INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    payment_hash TEXT NOT NULL,
    event_id TEXT,
    type TEXT DEFAULT 'purchase'
  )
`;

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_pixels_position ON pixels(x, y);
  CREATE INDEX IF NOT EXISTS idx_pixels_created_at ON pixels(created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);
`;

// Payment-state persistence (fix 4): pending invoices, processed payments, bulk quotes
const CREATE_PAYMENT_STATE_TABLES = `
  CREATE TABLE IF NOT EXISTS pending_invoices (
    payment_hash TEXT PRIMARY KEY,
    metadata TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    payment_request TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS processed_payments (
    payment_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bulk_quotes (
    quote_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pending_created ON pending_invoices(created_at);
  CREATE INDEX IF NOT EXISTS idx_processed_created ON processed_payments(created_at);
  CREATE INDEX IF NOT EXISTS idx_quotes_created ON bulk_quotes(created_at);
`;

export interface Pixel {
  id?: number;
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number;
  created_at: number;
  updated_at: number;
  gift_recipient?: string | null;
  gift_recipient_type?: string | null;
  gift_message?: string | null;
}

export interface Activity {
  id?: number;
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number;
  created_at: number;
  payment_hash: string;
  event_id?: string;
  type: string;
}

export class PixelDatabase implements PendingInvoiceStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DB_PATH || './pixels.db';

    // Ensure the directory exists
    const dbDir = path.dirname(this.dbPath);
    if (dbDir !== '.') {
      // For now, we'll use the current directory
      // In production, you might want to create the directory if it doesn't exist
    }

    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize() {
    console.log('Opening database at:', this.dbPath);
    // Enable WAL mode for better performance + crash safety
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(CREATE_PIXELS_TABLE);
    this.db.exec(CREATE_ACTIVITY_TABLE);
    this.db.exec(CREATE_INDEXES);
    this.db.exec(CREATE_PAYMENT_STATE_TABLES);

    // Add gift columns (Phase 1 — gift a pixel feature)
    // SQLite ALTER TABLE ADD COLUMN is idempotent-safe with try/catch
    const giftColumns = [
      'ALTER TABLE pixels ADD COLUMN gift_recipient TEXT',
      'ALTER TABLE pixels ADD COLUMN gift_recipient_type TEXT',
      'ALTER TABLE pixels ADD COLUMN gift_message TEXT',
    ];
    for (const sql of giftColumns) {
      try { this.db.exec(sql); } catch { /* column already exists */ }
    }
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_pixels_gift ON pixels(gift_recipient) WHERE gift_recipient IS NOT NULL;');

    console.log('Database initialized successfully');
  }

  // Get all pixels within a rectangle
  getPixelsInRectangle(x1: number, y1: number, x2: number, y2: number): Pixel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pixels
      WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?
      ORDER BY y, x
    `);

    return stmt.all(x1, x2, y1, y2) as Pixel[];
  }

  // Get a single pixel by coordinates
  getPixel(x: number, y: number): Pixel | undefined {
    const stmt = this.db.prepare('SELECT * FROM pixels WHERE x = ? AND y = ?');
    return stmt.get(x, y) as Pixel | undefined;
  }

  // Insert or update a pixel
  upsertPixel(pixel: Omit<Pixel, 'id' | 'created_at' | 'updated_at'>): Pixel {
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO pixels (x, y, color, letter, sats, created_at, updated_at, gift_recipient, gift_recipient_type, gift_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(x, y) DO UPDATE SET
        color = excluded.color,
        letter = excluded.letter,
        sats = excluded.sats,
        updated_at = excluded.updated_at,
        gift_recipient = COALESCE(excluded.gift_recipient, pixels.gift_recipient),
        gift_recipient_type = COALESCE(excluded.gift_recipient_type, pixels.gift_recipient_type),
        gift_message = COALESCE(excluded.gift_message, pixels.gift_message)
      RETURNING *
    `);

    return stmt.get(
      pixel.x,
      pixel.y,
      pixel.color,
      pixel.letter || null,
      pixel.sats,
      now,
      now,
      pixel.gift_recipient || null,
      pixel.gift_recipient_type || null,
      pixel.gift_message || null
    ) as Pixel;
  }

  // Bulk upsert pixels (for bulk purchases)
  upsertPixels(pixels: Omit<Pixel, 'id' | 'created_at' | 'updated_at'>[]): Pixel[] {
    const now = Date.now();
    const results: Pixel[] = [];

    // Use a transaction for bulk operations
    const transaction = this.db.transaction((pixelData: typeof pixels) => {
      const stmt = this.db.prepare(`
        INSERT INTO pixels (x, y, color, letter, sats, created_at, updated_at, gift_recipient, gift_recipient_type, gift_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(x, y) DO UPDATE SET
          color = excluded.color,
          letter = excluded.letter,
          sats = excluded.sats,
          updated_at = excluded.updated_at,
          gift_recipient = COALESCE(excluded.gift_recipient, pixels.gift_recipient),
          gift_recipient_type = COALESCE(excluded.gift_recipient_type, pixels.gift_recipient_type),
          gift_message = COALESCE(excluded.gift_message, pixels.gift_message)
        RETURNING *
      `);

      for (const pixel of pixelData) {
        const result = stmt.get(
          pixel.x,
          pixel.y,
          pixel.color,
          pixel.letter || null,
          pixel.sats,
          now,
          now,
          pixel.gift_recipient || null,
          pixel.gift_recipient_type || null,
          pixel.gift_message || null
        ) as Pixel;
        results.push(result);
      }
    });

    transaction(pixels);
    return results;
  }

  // Get all pixels (for debugging/testing)
  getAllPixels(): Pixel[] {
    const stmt = this.db.prepare('SELECT * FROM pixels ORDER BY y, x');
    return stmt.all() as Pixel[];
  }

  // Get pixel count
  getPixelCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM pixels');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  // Insert activity record
  insertActivity(activity: Omit<Activity, 'id'>): Activity {
    const stmt = this.db.prepare(`
      INSERT INTO activity (x, y, color, letter, sats, created_at, payment_hash, event_id, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      activity.x,
      activity.y,
      activity.color,
      activity.letter || null,
      activity.sats,
      activity.created_at,
      activity.payment_hash,
      activity.event_id || null,
      activity.type
    );

    return {
      id: result.lastInsertRowid as number,
      ...activity
    };
  }

  // Get recent activity records
  getRecentActivity(limit: number = 20): Activity[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Activity[];
  }

  // Get recent gifted pixels (for /api/placements/gifts)
  getRecentGifts(limit: number = 50): Pixel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM pixels
      WHERE gift_recipient IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Pixel[];
  }

  // Run fn atomically (nested calls become savepoints)
  runInTransaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // --- Pending invoices (Blink paymentHash → invoice context) ---

  savePendingInvoice(paymentHash: string, entry: PendingInvoiceRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO pending_invoices (payment_hash, metadata, amount, description, payment_request, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(paymentHash, JSON.stringify(entry.metadata), entry.amount, entry.description || null, entry.paymentRequest || null, entry.createdAt);
  }

  getPendingInvoice(paymentHash: string): PendingInvoiceRecord | undefined {
    const row = this.db.prepare('SELECT * FROM pending_invoices WHERE payment_hash = ?').get(paymentHash) as any;
    return row ? this.hydratePending(row) : undefined;
  }

  findPendingInvoicesByMemoAmount(memo: string | null, amount: number): Array<{ paymentHash: string; entry: PendingInvoiceRecord }> {
    const rows = this.db.prepare(
      'SELECT * FROM pending_invoices WHERE amount = ? AND COALESCE(description, "") = COALESCE(?, "")'
    ).all(amount, memo) as any[];
    return rows.map((row) => ({ paymentHash: row.payment_hash, entry: this.hydratePending(row) }));
  }

  deletePendingInvoice(paymentHash: string): void {
    this.db.prepare('DELETE FROM pending_invoices WHERE payment_hash = ?').run(paymentHash);
  }

  listPendingInvoices(): Array<{ paymentHash: string; entry: PendingInvoiceRecord }> {
    const rows = this.db.prepare('SELECT * FROM pending_invoices ORDER BY created_at ASC').all() as any[];
    return rows.map((row) => ({ paymentHash: row.payment_hash, entry: this.hydratePending(row) }));
  }

  purgePendingInvoicesOlderThan(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db.prepare('DELETE FROM pending_invoices WHERE created_at < ?').run(cutoff);
    return result.changes;
  }

  private hydratePending(row: any): PendingInvoiceRecord {
    return {
      metadata: JSON.parse(row.metadata),
      amount: row.amount,
      description: row.description ?? undefined,
      paymentRequest: row.payment_request ?? undefined,
      createdAt: row.created_at
    };
  }

  // --- Processed payments (idempotency) ---

  isPaymentProcessed(paymentId: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM processed_payments WHERE payment_id = ?').get(paymentId);
  }

  markPaymentProcessed(paymentId: string): void {
    this.db.prepare('INSERT OR IGNORE INTO processed_payments (payment_id, created_at) VALUES (?, ?)').run(paymentId, Date.now());
  }

  purgeProcessedPaymentsOlderThan(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db.prepare('DELETE FROM processed_payments WHERE created_at < ?').run(cutoff);
    return result.changes;
  }

  // --- Bulk quotes (server-side purchase intent) ---

  saveQuote(quoteId: string, quote: any): void {
    this.db.prepare('INSERT OR REPLACE INTO bulk_quotes (quote_id, data, created_at) VALUES (?, ?, ?)')
      .run(quoteId, JSON.stringify(quote), quote.createdAt || Date.now());
  }

  getQuote(quoteId: string): any | undefined {
    const row = this.db.prepare('SELECT data FROM bulk_quotes WHERE quote_id = ?').get(quoteId) as any;
    return row ? JSON.parse(row.data) : undefined;
  }

  deleteQuote(quoteId: string): void {
    this.db.prepare('DELETE FROM bulk_quotes WHERE quote_id = ?').run(quoteId);
  }

  purgeQuotesOlderThan(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db.prepare('DELETE FROM bulk_quotes WHERE created_at < ?').run(cutoff);
    return result.changes;
  }

  // Create database backup
  createBackup(backupPath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = process.env.BACKUP_DIR || '../backups';

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate secure backup name with random suffix
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const defaultPath = path.join(backupDir, `pixels_backup_${timestamp}_${randomSuffix}.db`);
    const finalPath = backupPath || defaultPath;

    // For SQLite, we can use the backup API or just copy the file
    // Since better-sqlite3 doesn't have built-in backup, we'll use filesystem copy
    fs.copyFileSync(this.dbPath, finalPath);

    // Set secure permissions (read/write for owner only)
    try {
      fs.chmodSync(finalPath, 0o600);
    } catch (error) {
      console.warn(`Could not set secure permissions on backup file: ${error}`);
    }

    console.log(`Database backup created securely: ${finalPath}`);
    return finalPath;
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: PixelDatabase | null = null;

export function getDatabase(): PixelDatabase {
  if (!dbInstance) {
    dbInstance = new PixelDatabase();
  }
  return dbInstance;
}

// For testing purposes
export function createTestDatabase(dbPath: string = ':memory:'): PixelDatabase {
  return new PixelDatabase(dbPath);
}