Status: ready-for-agent

# Reservation lookup

## Problem Statement

A caller who holds a Confirmation Number needs to see the Reservation it identifies: whose stay it is, which Property it is for, when it starts and ends, and whether it is confirmed or cancelled. A wrong or missing Confirmation Number must be distinguishable from a route this service does not provide. An anonymous caller must not be able to probe Confirmation Numbers without limit, including by sending very long values or by racing requests. A PostgreSQL outage must not look like an unknown Confirmation Number and must not lock callers out.

## Solution

A lookup-only HTTP API. The caller sends `GET /reservations/{confirmationNumber}` and receives the Reservation as JSON when the Confirmation Number matches. Missing, unknown, unmatched, locked-out, and unavailable outcomes use a small set of HTTP statuses and stable `code` values. Misses are counted per TCP peer address in PostgreSQL. Five misses inside 15 minutes open a 15-minute lockout. The service never creates, updates, or deletes a Reservation.

## User Stories

1. As a Guest, I want to look up my Reservation with its Confirmation Number, so that I can see the stay.
2. As a Guest, I want the response to include my name, the Property name, the arrival date, the departure date, the Reservation Status, and the stored Confirmation Number, so that I can tell I found the right stay.
3. As a Guest, I want arrival and departure as calendar dates, with arrival strictly before departure, so that the stay length is unambiguous.
4. As a Guest, I want the Reservation Status to be only confirmed or cancelled, so that the lookup does not invent other stay states.
5. As a Guest, I want a cancelled Reservation to be returned as found, so that I can tell a cancellation apart from a wrong Confirmation Number.
6. As a Guest, I want the lookup to omit email, phone, payment details, room number, and party size, so that a leaked Confirmation Number exposes as little as possible.
7. As a caller, I want a matching Confirmation Number to respond 200 with a JSON body of only those fields, so that I can parse one shape.
8. As a caller, I want the match to be exact and case-sensitive after URL-decoding and trimming only the ends, so that a different casing or an internal space does not collide with my Confirmation Number.
9. As a caller, I want surrounding whitespace to be ignored before the match, so that an accidentally padded Confirmation Number still finds my Reservation.
10. As a caller, I want a query string on the lookup to be ignored, so that extra parameters do not change which Reservation is returned.
11. As a caller, I want `GET /reservations` to respond 400 `missing-confirmation-number`, so that a missing Confirmation Number is not reported as an unknown Reservation.
12. As a caller, I want `GET /reservations/` to respond 400 `missing-confirmation-number`, so that a trailing slash is still a missing Confirmation Number.
13. As a caller, I want a whitespace-only Confirmation Number to respond 400 `missing-confirmation-number`, so that a blank value is not treated as unknown.
14. As a caller, I want a missing Confirmation Number to leave my miss count unchanged, so that a blank request does not move me toward a lockout.
15. As a caller who is locked out, I want a missing Confirmation Number to still respond 400, so that a blank request is not reported as a lockout.
16. As a caller, I want a non-blank Confirmation Number of at most 64 characters that matches no Reservation to respond 404 `unknown-confirmation`, so that I know the identifier was not found.
17. As a caller, I want a Confirmation Number of exactly 64 characters to be eligible for a normal lookup, so that the longest stored identifier can still be found.
18. As a caller, I want that unknown Confirmation Number to count as one miss, so that repeated guessing is limited.
19. As a caller, I want a Confirmation Number longer than 64 characters, measured after URL-decoding and trimming the ends, to respond 404 `unknown-confirmation`, so that an oversized value looks like any other miss.
20. As a caller, I want that oversized value to count as a miss, so that I cannot probe without limit by sending very long strings.
21. As an operator, I want an oversized Confirmation Number not to read Reservations, so that an unbounded key cannot force a Reservation lookup.
22. As a caller, I want the fifth miss from an oversized Confirmation Number to respond 404 and start the lockout, so that the threshold is the same for every kind of miss.
23. As a caller, I want an unrecognized path to respond 404 `unknown-route`, so that I know this service does not provide that route.
24. As a caller, I want any method other than GET on a lookup path to respond 404 `unknown-route`, so that there is no second outcome for something this service does not do.
25. As a caller, I want a slash inside what I hoped was one Confirmation Number to respond 404 `unknown-route`, so that a lookup key is only a single path segment.
26. As a caller, I want an unknown route to leave my miss count unchanged, so that wandering requests do not lock me out.
27. As a caller, I want an unknown route to stay 404 while PostgreSQL is unavailable, so that a route miss does not depend on the database.
28. As a caller, I want my first four misses within 15 minutes to respond 404, so that a few honest mistakes do not lock me out.
29. As a caller, I want the fifth miss within 15 minutes to respond 404 and start a 15-minute lockout, so that the lockout begins only after the threshold is reached.
30. As a caller, I want the next lookup that carries a Confirmation Number, after that fifth miss, to respond 429 `lookup-locked`, so that I know I must wait.
31. As a caller, I want `Retry-After` on that 429 to be the remaining lockout in whole seconds, and at least 1, so that I know when to try again.
32. As a caller, I want `Retry-After` only on that 429, so that I do not treat a found Reservation, a miss, a blank request, or an outage as a lockout deadline.
33. As a caller, I want a locked-out lookup of a real Confirmation Number to respond 429, so that a known identifier cannot be used while the lockout is in effect.
34. As a caller, I want a locked-out oversized Confirmation Number to respond 429, so that a long value does not bypass the lockout.
35. As a caller, I want lookups during the lockout not to add misses and not to extend the deadline, so that the wait stays 15 minutes from the fifth miss.
36. As a caller, I want a successful lookup before the lockout to leave earlier misses in place, so that one known Confirmation Number cannot reset my probe budget.
37. As a caller, I want a miss to count only while its age is strictly under 15 minutes, so that a slow series of mistakes does not reach the threshold.
38. As a caller, I want to be clean when the lockout ends, so that the misses which opened the lockout do not immediately lock me out again.
39. As a caller, I want misses to be counted for my TCP peer address, so that a caller on another address keeps a separate budget.
40. As a caller on a shared address, such as a lobby network, I want that address to share one budget, so that the limit matches the caller the service can actually see.
41. As a caller, I want a forwarding header I supply to be ignored, so that I cannot grant myself a fresh budget.
42. As a caller, I want two lookups that race while I already have four misses to allow only one more 404 before the lockout is in effect, so that parallel guesses cannot slip past the threshold.
43. As a caller, I want a lookup that PostgreSQL cannot finish to respond 503 `lookup-unavailable`, so that I retry later instead of treating the Reservation as unknown.
44. As a caller, I want that outage not to add a miss and not to start or extend a lockout, so that a database failure does not punish me.
45. As a caller, I want a counted 404 to be returned only after that miss has been durably saved, so that a failed write cannot become a free probe.
46. As a caller, I want a failed miss write to respond 503 rather than an uncounted 404, so that the miss threshold stays trustworthy.
47. As a caller, I want a successful lookup to read whether I am locked out before it returns the Reservation, so that a lockout still hides a Confirmation Number I already know.
48. As a caller, I want that successful lookup to leave the rate-limit state unchanged, so that a found Reservation does not add a miss and does not depend on a rate-limit write.
49. As a caller, I want a missing Confirmation Number to stay 400 while PostgreSQL is down, so that a blank request does not become an outage.
50. As a caller, I want every non-200 response to be JSON with a stable `code` and a non-empty human-readable `message`, so that I can branch on the code.
51. As a caller, I want the `message` wording to be free to change, so that only the `code` is part of the contract.
52. As a Guest, I want a lookup not to create, change, or delete my Reservation, so that reading the stay cannot alter it.
53. As an operator, I want an idempotent SQL seed that loads a fixed set of Reservations, including at least one confirmed stay and one cancelled stay, so that I can run the lookup locally.
54. As an operator, I want re-running that seed to restore the same set, so that local data does not drift.

## Implementation Decisions

- The service is a Node.js 24 and Express 5 application. Reservation rows and rate-limit state live in the same PostgreSQL database. The API process never inserts, updates, or deletes a Reservation.
- Acceptance is the HTTP request and response. Tests observe status, `code`, `message`, the 200 body, and `Retry-After`. Two ports sit behind that boundary so tests can substitute them: a Reservation store that finds a Reservation by Confirmation Number, and a rate-limit store that reports lockout for a peer address and records a miss when a lookup counts as one. Their SQL, tables, and locking statements are not part of this contract. The observable concurrency rule is.
- Callers are anonymous. Holding the Confirmation Number is the only capability. There is no API key, session, or user account. The rate-limit subject is the TCP peer address reported for the connection. Client-supplied forwarding headers are ignored. Differently spelled forms of the same address, such as an IPv4 address and its IPv6-mapped form, are different subjects.
- A lookup key is one path segment. The routes are `GET /reservations/:confirmationNumber`, `GET /reservations`, and `GET /reservations/`. Every other path and method is an unknown route.
- Decode the path segment and trim only its ends. The result decides the outcome:

  | Request | HTTP | `code` | Counts as a miss |
  | --- | --- | --- | --- |
  | No Confirmation Number, including `GET /reservations`, `GET /reservations/`, and a whitespace-only segment | 400 | `missing-confirmation-number` | No |
  | 1 to 64 characters, matching a Reservation, subject not locked out | 200 | — | No |
  | 1 to 64 characters, no matching Reservation, subject not locked out | 404 | `unknown-confirmation` | Yes |
  | Longer than 64 characters, subject not locked out | 404 | `unknown-confirmation` | Yes, and Reservations are not read |
  | Any Confirmation Number while the subject is locked out, including a real or an oversized one | 429 | `lookup-locked` | No |
  | Any other path or method | 404 | `unknown-route` | No |
  | PostgreSQL cannot finish a required lockout read, a required miss write, or a required Reservation read | 503 | `lookup-unavailable` | No |

- The 200 body is a JSON object with `confirmationNumber`, `guestName`, `propertyName`, `arrivalDate`, `departureDate`, and `status`. `confirmationNumber` is the stored value. `guestName` and `propertyName` are non-blank strings. Dates are `YYYY-MM-DD`. `status` is `confirmed` or `cancelled`. No other fields are part of the contract.
- Every non-200 body is a JSON object with `code` and `message`. `code` is stable. `message` is non-empty human text and is not a stable string. `Retry-After` is sent only with 429. Its value is the whole seconds remaining in the lockout, and it is at least 1.
- A miss is a 404 `unknown-confirmation`. Misses accumulate per peer address. A miss still counts while its age is strictly under 15 minutes. The fifth such miss is still 404 and starts a lockout that lasts 15 minutes from that miss. When the lockout ends, that miss is no longer inside the window, so the subject is clean. A hit does not clear earlier misses. Requests during the lockout do not add misses and do not move the deadline.
- Concurrent requests must agree on miss age, the miss count, and the lockout through the shared PostgreSQL rate-limit state. When a subject has four misses, at most one more lookup may respond 404 before the lockout is in effect for any request that has not yet been answered. A counted 404 is returned only after that miss has been durably saved. If that write cannot be finished, the response is 503 and the count is unchanged.
- A lookup that carries a Confirmation Number reads the subject's lockout state before it can return 200. If that read fails, the response is 503. When the subject is not locked out and a Reservation matches, the response is 200. That success creates no miss and does not require a rate-limit write. Earlier misses stay as they were. If the Reservation read fails, the response is 503. A rate-limit write is required only for a lookup that counts as a miss.
- An oversized Confirmation Number still uses that same accounting when it counts as a miss. It does not read Reservations. The 64-character bound is a lookup rule, not a change to the meaning of Confirmation Number: an empty or whitespace-only value is missing, and an over-long value is a failed lookup.
- Missing-confirmation requests and unknown routes do not consult PostgreSQL.
- Local Reservation rows come from an idempotent SQL seed checked into the repo. Re-running it restores a fixed set that includes at least one confirmed Reservation and one cancelled Reservation, with the same fields as the 200 body. How those rows were produced outside this service is out of scope. Attempted Confirmation Numbers do not have to be stored in the rate-limit state; the HTTP contract is fully described by the subject, the miss times, and the lockout.

## Testing Decisions

A good test asserts the HTTP contract above. It does not assert SQL text, route-table structure, or other internals. Two stand-in observations are allowed where the wire is not enough. A unit test may assert that an oversized Confirmation Number did not consult the Reservation store, because that 404 looks the same as a genuine unknown Confirmation Number. A unit test may assert that a 200 read lockout state and did not record a miss, because a no-op write would leave the same HTTP response as no write at all.

There is no application code and no prior test art in this repo.

Unit tests boot the HTTP app with in-memory stand-ins for the Reservation store and the rate-limit store. They do not use PostgreSQL. They cover the status and `code` matrix, trimming and case sensitivity, the ignored query string, the 64-versus-65-character boundary, a missing Confirmation Number and an unknown route that do not touch either store, an oversized value that does not touch the Reservation store but does count as a miss, a failing lockout read or a failing Reservation read on an otherwise successful lookup that responds 503 and records no miss, a failing miss write that responds 503 and leaves the count unchanged, lockout versus a missing Confirmation Number, a hit that reads lockout, records no miss, and leaves earlier misses in place, `Retry-After` present only on 429 and at least 1 second, and a stand-in whose misses are already 15 minutes old or whose lockout has already ended. Those last cases use the stand-in so a test does not sleep for 15 minutes.

Integration tests boot the same HTTP app against real PostgreSQL. They arrange their own Reservation rows and do not rely on the local seed. They cover a found Reservation, including a cancelled one; a missing Confirmation Number; an unknown Confirmation Number; an unknown route; an oversized Confirmation Number that responds 404 and is then visible as a counted miss; four misses, then a found Reservation responding 200, then one more unknown Confirmation Number responding 404 and starting the lockout, so the success added no miss; the fifth miss still 404 and the next lookup 429 with `Retry-After`; and two concurrent lookups when the subject already has four misses, where only one more 404 is allowed before the lockout is in effect. They do not have to take PostgreSQL down. The 503 behavior is a unit-test obligation.

## Out of Scope

- Creating, updating, or deleting a Reservation through this service.
- Reservation Status values other than confirmed and cancelled.
- Email, phone, payment data, room number, party size, and a split of the Guest's name.
- API keys, sessions, user accounts, and trusting `X-Forwarded-For` or any other proxy header.
- Production hosting and any upstream system that originally created the Reservations.
- HTTP 405. Unmatched methods are unknown routes.
- `Retry-After` on 503.
- Browser tests, UI tests, and a published OpenAPI document.
- Caching headers as a contract.
- Malformed request targets rejected by the HTTP server before routing.
- Requiring `%2F` to round-trip as a character inside a Confirmation Number.

## Further Notes

The language for Reservation, Reservation Status, Confirmation Number, Guest, and Property lives in the glossary. The hard-to-reverse choices are the anonymous peer-address limit, the fixed lockout after five misses, 503 for PostgreSQL that cannot serve a lookup, and the oversized Confirmation Number that skips the Reservation read. This spec is the synthesis of those decisions for implementation. It does not add a new product rule.
