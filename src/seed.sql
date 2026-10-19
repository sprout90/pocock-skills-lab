DELETE FROM reservations;

INSERT INTO reservations (
  confirmation_number,
  guest_name,
  property_name,
  arrival_date,
  departure_date,
  status
) VALUES
  (
    'AB12CD',
    'Jordan Lee',
    'Harbor Hotel',
    '2026-11-01',
    '2026-11-04',
    'confirmed'
  ),
  (
    'ZX90LM',
    'Mina Ortiz',
    'Harbor Hotel',
    '2026-12-10',
    '2026-12-12',
    'cancelled'
  );
