import { getDatabase } from './src/database.ts';

console.log('Testing database initialization...');
try {
  const db = getDatabase();
  console.log('Database initialized successfully with', db.getPixelCount(), 'pixels');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exit(1);
}