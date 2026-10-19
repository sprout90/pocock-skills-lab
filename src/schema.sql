CREATE TABLE IF NOT EXISTS reservations (
  confirmation_number text PRIMARY KEY,
  guest_name text NOT NULL,
  property_name text NOT NULL,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  status text NOT NULL,
  CONSTRAINT reservations_confirmation_number_length CHECK (
    char_length(confirmation_number) BETWEEN 1 AND 64
  ),
  CONSTRAINT reservations_guest_name_present CHECK (btrim(guest_name) <> ''),
  CONSTRAINT reservations_property_name_present CHECK (btrim(property_name) <> ''),
  CONSTRAINT reservations_status_known CHECK (status IN ('confirmed', 'cancelled')),
  CONSTRAINT reservations_arrival_before_departure CHECK (arrival_date < departure_date)
);
