# 01: Look up a Reservation by Confirmation Number

**What to build:** A caller can retrieve a Reservation with its Confirmation Number and see whose stay it is, which Property it is for, when it starts and ends, and whether it is confirmed or cancelled. A missing Confirmation Number, an unknown Confirmation Number, and a route this service does not provide are distinguishable from each other. An operator can load a fixed set of Reservations and try the lookup locally. This slice does not count misses or lock anyone out.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A matching Confirmation Number responds 200 with JSON containing only the stored Confirmation Number, the Guest's name, the Property name, the arrival date, the departure date, and the Reservation Status.
- [ ] Arrival and departure are calendar dates (`YYYY-MM-DD`), and arrival is strictly before departure. The Reservation Status is `confirmed` or `cancelled`. A cancelled Reservation is still found.
- [ ] The body omits email, phone, payment details, room number, and party size.
- [ ] The match is exact and case-sensitive after URL-decoding and trimming only the ends. Spaces inside the Confirmation Number remain significant. A query string does not change the result.
- [ ] `GET /reservations`, `GET /reservations/`, and a whitespace-only Confirmation Number respond 400 with code `missing-confirmation-number`.
- [ ] A non-blank Confirmation Number of at most 64 characters that matches no Reservation responds 404 with code `unknown-confirmation`. A Confirmation Number of exactly 64 characters is still eligible for that lookup.
- [ ] Any other path or method, including a Confirmation Number split by a slash, responds 404 with code `unknown-route`.
- [ ] Every non-200 response is JSON with a stable `code` and a non-empty human-readable `message`. The `message` wording is not part of the contract.
- [ ] The service does not create, update, or delete a Reservation.
- [ ] An idempotent SQL seed loads a fixed set that includes at least one confirmed Reservation and one cancelled Reservation. Re-running the seed restores that set.
- [ ] Unit tests cover the HTTP contract without PostgreSQL. Integration tests run against real PostgreSQL, arrange their own Reservation rows, and do not rely on the seed.
