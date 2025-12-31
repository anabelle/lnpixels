import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

export interface Pixel {
  id?: number;
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number;
  created_at: number;
  updated_at: number;
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

export class PixelDatabase {
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

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(CREATE_PIXELS_TABLE);
    this.db.exec(CREATE_ACTIVITY_TABLE);
    this.db.exec(CREATE_INDEXES);

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
      INSERT INTO pixels (x, y, color, letter, sats, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(x, y) DO UPDATE SET
        color = excluded.color,
        letter = excluded.letter,
        sats = excluded.sats,
        updated_at = excluded.updated_at
      RETURNING *
    `);

    return stmt.get(
      pixel.x,
      pixel.y,
      pixel.color,
      pixel.letter || null,
      pixel.sats,
      now,
      now
    ) as Pixel;
  }

  // Bulk upsert pixels (for bulk purchases)
  upsertPixels(pixels: Omit<Pixel, 'id' | 'created_at' | 'updated_at'>[]): Pixel[] {
    const now = Date.now();
    const results: Pixel[] = [];

    // Use a transaction for bulk operations
    const transaction = this.db.transaction((pixelData: typeof pixels) => {
      const stmt = this.db.prepare(`
        INSERT INTO pixels (x, y, color, letter, sats, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(x, y) DO UPDATE SET
          color = excluded.color,
          letter = excluded.letter,
          sats = excluded.sats,
          updated_at = excluded.updated_at
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
          now
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