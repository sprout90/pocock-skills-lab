import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { applySchema, applySeed } from '../src/database.js';
import { createPostgresReservationStore } from '../src/reservationStore.js';
import { getJson, withLookup } from './http.js';

const port = 55432;
const database = 'reservation_lookup';

let cluster;
let dataDirectory;
let pool;
let findReservation;

before(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), 'reservation-lookup-'));
  cluster = new EmbeddedPostgres({
    databaseDir: dataDirectory,
    user: 'postgres',
    password: 'password',
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await cluster.initialise();
  await cluster.start();
  await cluster.createDatabase(database);
  pool = new pg.Pool({
    connectionString: `postgres://postgres:password@127.0.0.1:${port}/${database}`,
  });
  await applySchema(pool);
  findReservation = createPostgresReservationStore(pool).findReservation;
}, { timeout: 180_000 });

after(async () => {
  await pool?.end();
  await cluster?.stop();
  if (dataDirectory) {
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await pool.query('DELETE FROM reservations');
});

async function insertReservation(reservation) {
  await pool.query(
    `INSERT INTO reservations (
       confirmation_number, guest_name, property_name, arrival_date, departure_date, status
     ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      reservation.confirmationNumber,
      reservation.guestName,
      reservation.propertyName,
      reservation.arrivalDate,
      reservation.departureDate,
      reservation.status,
    ],
  );
}

test('a stored Reservation is returned, including a cancelled stay', async () => {
  await insertReservation({
    confirmationNumber: 'STAY01',
    guestName: 'Jordan Lee',
    propertyName: 'Harbor Hotel',
    arrivalDate: '2026-11-01',
    departureDate: '2026-11-04',
    status: 'confirmed',
  });
  await insertReservation({
    confirmationNumber: 'STAY02',
    guestName: 'Mina Ortiz',
    propertyName: 'Harbor Hotel',
    arrivalDate: '2026-12-10',
    departureDate: '2026-12-12',
    status: 'cancelled',
  });

  await withLookup(findReservation, async (base) => {
    const confirmed = await getJson(`${base}/reservations/STAY01`);
    assert.equal(confirmed.status, 200);
    assert.deepEqual(confirmed.body, {
      confirmationNumber: 'STAY01',
      guestName: 'Jordan Lee',
      propertyName: 'Harbor Hotel',
      arrivalDate: '2026-11-01',
      departureDate: '2026-11-04',
      status: 'confirmed',
    });

    const cancelled = await getJson(`${base}/reservations/STAY02`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');
    assert.equal(cancelled.body.guestName, 'Mina Ortiz');

    const differentCase = await getJson(`${base}/reservations/stay01`);
    assert.equal(differentCase.status, 404);
    assert.equal(differentCase.body.code, 'unknown-confirmation');
  });
});

test('a 64-character Confirmation Number is stored and found', async () => {
  const confirmationNumber = 'E'.repeat(64);
  await insertReservation({
    confirmationNumber,
    guestName: 'Jordan Lee',
    propertyName: 'Harbor Hotel',
    arrivalDate: '2026-11-01',
    departureDate: '2026-11-04',
    status: 'confirmed',
  });

  await withLookup(findReservation, async (base) => {
    const response = await getJson(
      `${base}/reservations/${encodeURIComponent(confirmationNumber)}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.confirmationNumber, confirmationNumber);
  });
});

test('missing, unknown, and unknown-route responses come from PostgreSQL-backed lookup', async () => {
  await insertReservation({
    confirmationNumber: 'KEEP01',
    guestName: 'Jordan Lee',
    propertyName: 'Harbor Hotel',
    arrivalDate: '2026-11-01',
    departureDate: '2026-11-04',
    status: 'confirmed',
  });

  await withLookup(findReservation, async (base) => {
    const missing = await getJson(`${base}/reservations`);
    assert.equal(missing.status, 400);
    assert.equal(missing.body.code, 'missing-confirmation-number');

    const unknown = await getJson(`${base}/reservations/MISSING`);
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, 'unknown-confirmation');

    const otherRoute = await getJson(`${base}/reservations/KEEP01`, { method: 'POST' });
    assert.equal(otherRoute.status, 404);
    assert.equal(otherRoute.body.code, 'unknown-route');

    const stillThere = await getJson(`${base}/reservations/KEEP01`);
    assert.equal(stillThere.status, 200);
    assert.equal(stillThere.body.guestName, 'Jordan Lee');
  });
});

test('re-running the seed restores the fixed Reservation set', async () => {
  await applySeed(pool);

  await withLookup(findReservation, async (base) => {
    const confirmed = await getJson(`${base}/reservations/AB12CD`);
    assert.equal(confirmed.status, 200);
    assert.deepEqual(confirmed.body, {
      confirmationNumber: 'AB12CD',
      guestName: 'Jordan Lee',
      propertyName: 'Harbor Hotel',
      arrivalDate: '2026-11-01',
      departureDate: '2026-11-04',
      status: 'confirmed',
    });

    const cancelled = await getJson(`${base}/reservations/ZX90LM`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');
    assert.equal(cancelled.body.guestName, 'Mina Ortiz');
  });

  await insertReservation({
    confirmationNumber: 'EXTRA1',
    guestName: 'Ada Moss',
    propertyName: 'Harbor Hotel',
    arrivalDate: '2026-08-01',
    departureDate: '2026-08-03',
    status: 'confirmed',
  });

  await applySeed(pool);

  await withLookup(findReservation, async (base) => {
    const extra = await getJson(`${base}/reservations/EXTRA1`);
    assert.equal(extra.status, 404);
    assert.equal(extra.body.code, 'unknown-confirmation');

    const restored = await getJson(`${base}/reservations/AB12CD`);
    assert.equal(restored.status, 200);
    assert.equal(restored.body.status, 'confirmed');

    const cancelled = await getJson(`${base}/reservations/ZX90LM`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');
  });
});
