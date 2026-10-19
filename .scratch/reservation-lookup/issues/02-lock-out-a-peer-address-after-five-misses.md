# 02: Lock out a peer address after five misses

**What to build:** A caller who misses five times from the same peer address within 15 minutes is locked out of further lookups for 15 minutes and told when to retry. A successful lookup still checks that lockout, then returns the Reservation without adding a miss and without a rate-limit write that exists only because the lookup succeeded. An oversized Confirmation Number counts as a miss and does not read Reservations. When PostgreSQL cannot finish a required lockout read, Reservation read, or miss write, the caller gets 503 and the miss count does not change.

**Blocked by:** 01: Look up a Reservation by Confirmation Number

**Status:** ready-for-agent

- [ ] The rate-limit subject is the TCP peer address reported for the connection. A caller-supplied forwarding header does not choose the subject. An IPv4 address and its IPv6-mapped form are different subjects.
- [ ] An unknown Confirmation Number of at most 64 characters counts as one miss. The first four misses inside 15 minutes respond 404 `unknown-confirmation`. The fifth responds 404 and starts a lockout of 15 minutes from that miss.
- [ ] The next lookup that carries a Confirmation Number responds 429 `lookup-locked`. `Retry-After` is the remaining lockout in whole seconds, at least 1, and it is sent only on that 429.
- [ ] A locked-out lookup of a real Confirmation Number responds 429. Lookups during the lockout add no miss and do not move the deadline.
- [ ] A successful lookup reads the lockout state before it can respond 200. If that read fails, the response is 503 `lookup-unavailable` and no miss is recorded. If the caller is not locked out and a Reservation matches, the response is 200, no miss is created, and no rate-limit write is required because the lookup succeeded. Earlier misses stay in place. If the Reservation read fails, the response is 503 and no miss is recorded.
- [ ] After four misses, a found Reservation responds 200, and the next unknown Confirmation Number is the fifth miss: 404, and the lockout starts.
- [ ] A missing Confirmation Number stays 400 `missing-confirmation-number` during a lockout, does not count as a miss, and does not consult PostgreSQL. An unknown route stays 404 `unknown-route`, does not count, and stays 404 while PostgreSQL is unavailable.
- [ ] After URL-decoding and trimming only the ends, a Confirmation Number longer than 64 characters responds 404 `unknown-confirmation`, counts as a miss, and does not read Reservations. The fifth such miss still starts the lockout. A locked-out oversized Confirmation Number responds 429 and adds no miss.
- [ ] A miss counts while its age is strictly under 15 minutes. When the lockout ends, the subject is clean. A hit does not clear earlier misses. A counted 404 is returned only after that miss has been durably saved. If the miss write fails, the response is 503 and the count is unchanged. 503 does not send `Retry-After`.
- [ ] Misses and the lockout are stored in the same PostgreSQL database as Reservations, in a form that can serialize two racing misses without replacing this persistence model. Proving that race is ticket 03, not this ticket.
- [ ] Unit tests use stand-ins and do not sleep for 15 minutes. They may assert that an oversized Confirmation Number did not consult the Reservation store, and that a 200 read the lockout and did not record a miss. Integration tests use real PostgreSQL for the sequential lookup stories above.
