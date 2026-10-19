import pg from 'pg';
import { createApp } from './createApp.js';
import { createPostgresReservationStore } from './reservationStore.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const { findReservation } = createPostgresReservationStore(pool);
const app = createApp({ findReservation });
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Reservation lookup listening on ${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on('SIGINT', () => {
  shutdown().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});
