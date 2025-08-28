import Database from 'better-sqlite3';

console.log('Testing better-sqlite3 import...');
try {
  console.log('better-sqlite3 imported successfully');

  console.log('Creating test database...');
  const db = new Database(':memory:');
  console.log('Database created successfully');

  db.close();
  console.log('Test completed successfully');
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}