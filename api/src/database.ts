import Database from 'better-sqlite3';
import path from 'path';

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

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_pixels_position ON pixels(x, y);
  CREATE INDEX IF NOT EXISTS idx_pixels_created_at ON pixels(created_at);
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

export class PixelDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './pixels.db') {
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
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