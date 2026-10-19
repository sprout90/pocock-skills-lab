import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getJson, withLookup } from './http.js';

const confirmed = {
  confirmationNumber: 'AB12CD',
  guestName: 'Jordan Lee',
  propertyName: 'Harbor Hotel',
  arrivalDate: '2026-11-01',
  departureDate: '2026-11-04',
  status: 'confirmed',
};

const cancelled = {
  confirmationNumber: 'ZX90LM',
  guestName: 'Mina Ortiz',
  propertyName: 'Harbor Hotel',
  arrivalDate: '2026-12-10',
  departureDate: '2026-12-12',
  status: 'cancelled',
};

function storeOf(...reservations) {
  return async (confirmationNumber) => {
    const match = reservations.find(
      (reservation) => reservation.confirmationNumber === confirmationNumber,
    );
    if (!match) {
      return null;
    }
    return { ...match, email: 'hidden@example.com', roomNumber: '12' };
  };
}

test('a caller receives the Reservation for a matching Confirmation Number', async () => {
  await withLookup(storeOf(confirmed), async (base) => {
    const { status, body } = await getJson(`${base}/reservations/AB12CD`);
    assert.equal(status, 200);
    assert.deepEqual(body, confirmed);
  });
});

test('a cancelled Reservation is still found', async () => {
  await withLookup(storeOf(cancelled), async (base) => {
    const { status, body } = await getJson(`${base}/reservations/ZX90LM`);
    assert.equal(status, 200);
    assert.deepEqual(body, cancelled);
  });
});

test('the match is case-sensitive and ignores only surrounding whitespace and the query string', async () => {
  const spaced = {
    ...confirmed,
    confirmationNumber: 'AB 12',
  };
  await withLookup(storeOf(confirmed, spaced), async (base) => {
    const lower = await getJson(`${base}/reservations/ab12cd`);
    assert.equal(lower.status, 404);
    assert.equal(lower.body.code, 'unknown-confirmation');

    const padded = await getJson(`${base}/reservations/${encodeURIComponent('  AB12CD  ')}`);
    assert.equal(padded.status, 200);
    assert.equal(padded.body.confirmationNumber, 'AB12CD');

    const internalSpace = await getJson(`${base}/reservations/${encodeURIComponent('AB 12')}`);
    assert.equal(internalSpace.status, 200);
    assert.equal(internalSpace.body.confirmationNumber, 'AB 12');

    const withQuery = await getJson(`${base}/reservations/AB12CD?guest=someone-else`);
    assert.equal(withQuery.status, 200);
    assert.deepEqual(withQuery.body, confirmed);
  });
});

test('a Confirmation Number of exactly 64 characters can be found', async () => {
  const confirmationNumber = 'C'.repeat(64);
  const reservation = { ...confirmed, confirmationNumber };
  await withLookup(storeOf(reservation), async (base) => {
    const found = await getJson(
      `${base}/reservations/${encodeURIComponent(confirmationNumber)}`,
    );
    assert.equal(found.status, 200);
    assert.equal(found.body.confirmationNumber, confirmationNumber);

    const unknown = await getJson(`${base}/reservations/${'D'.repeat(64)}`);
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.code, 'unknown-confirmation');
  });
});

test('a missing Confirmation Number responds 400', async () => {
  let lookups = 0;
  const findReservation = async () => {
    lookups += 1;
    return null;
  };
  await withLookup(findReservation, async (base) => {
    for (const path of ['/reservations', '/reservations/', '/reservations/%20%20']) {
      const response = await getJson(`${base}${path}`);
      assert.equal(response.status, 400, path);
      assert.equal(response.body.code, 'missing-confirmation-number');
      assert.equal(typeof response.body.message, 'string');
      assert.ok(response.body.message.length > 0);
    }
  });
  assert.equal(lookups, 0);
});

test('an unknown Confirmation Number responds 404', async () => {
  await withLookup(storeOf(confirmed), async (base) => {
    const response = await getJson(`${base}/reservations/NOPE00`);
    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'unknown-confirmation');
    assert.equal(typeof response.body.message, 'string');
    assert.ok(response.body.message.length > 0);
  });
});

test('any other path or method responds 404 unknown-route', async () => {
  let lookups = 0;
  const findReservation = async () => {
    lookups += 1;
    return confirmed;
  };
  await withLookup(findReservation, async (base) => {
    const otherPath = await getJson(`${base}/guests`);
    assert.equal(otherPath.status, 404);
    assert.equal(otherPath.body.code, 'unknown-route');

    const split = await getJson(`${base}/reservations/AB/CD`);
    assert.equal(split.status, 404);
    assert.equal(split.body.code, 'unknown-route');

    const differentCasePath = await getJson(`${base}/Reservations/AB12CD`);
    assert.equal(differentCasePath.status, 404);
    assert.equal(differentCasePath.body.code, 'unknown-route');

    const posted = await getJson(`${base}/reservations/AB12CD`, { method: 'POST' });
    assert.equal(posted.status, 404);
    assert.equal(posted.body.code, 'unknown-route');
    assert.ok(posted.body.message.length > 0);

    const deleted = await getJson(`${base}/reservations/AB12CD`, { method: 'DELETE' });
    assert.equal(deleted.status, 404);
    assert.equal(deleted.body.code, 'unknown-route');
  });
  assert.equal(lookups, 0);
});
