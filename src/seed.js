import pg from 'pg';
import { applySchema, applySeed } from './database.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

try {
  await applySchema(pool);
  await applySeed(pool);
  console.log('Reservation seed restored');
} finally {
  await pool.end();
}
