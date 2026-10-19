# 03: Enforce the miss threshold under concurrent lookups

**What to build:** Two callers who share a peer address cannot slip past the miss threshold by racing. When that address already has four misses, only one more lookup is told the Confirmation Number is unknown before the lockout is in effect for both. That unknown result is durable, so a following lookup is locked out.

**Blocked by:** 02: Lock out a peer address after five misses

**Status:** ready-for-agent

- [ ] With four misses already recorded for one peer address, two lookups that race produce only one more 404 `unknown-confirmation` before the lockout applies to any lookup that has not yet been answered.
- [ ] The other racing lookup responds 429 `lookup-locked` with `Retry-After`, or otherwise observes the lockout already in effect. It does not become a sixth uncounted miss.
- [ ] The 404 that reaches five misses is durable. A later lookup for that same peer address responds 429 without relying on either racing request still being in flight.
- [ ] A miss write that PostgreSQL does not finish responds 503 `lookup-unavailable` and leaves the miss count unchanged, including when the write was contending with another lookup.
- [ ] The HTTP contract from the earlier tickets is unchanged: a successful lookup still only reads lockout state, and an oversized Confirmation Number still counts without reading Reservations.
- [ ] An integration test against real PostgreSQL demonstrates the race. It arranges its own rows and does not rely on the local seed.
