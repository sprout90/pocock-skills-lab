# Five misses start a fixed lockout

An unsuccessful lookup is a Confirmation Number that matches no Reservation. A string longer than 64 characters counts as one without reading Reservations (ADR 0004). Misses accumulate per peer address on a sliding window: a miss still counts while its age is strictly under 15 minutes, so the subject is clean when the lockout ends. The fifth miss in that window is still reported as not found, and it starts a 15-minute lockout during which every lookup that carries a Confirmation Number is rejected, including one that would have found a Reservation.

A missing Confirmation Number is not a miss. It still answers 400 during a lockout. Misses do not accrue during the lockout, a hit does not clear earlier misses, and a PostgreSQL failure is not a miss (ADR 0003). `Retry-After` is the remaining lockout in whole seconds, at least 1, and it is sent only with that lockout rejection.

A pure sliding window was rejected because the requirement is a lockout with `Retry-After`. Counting every request, or clearing the window on a hit, was rejected because a caller who already knows one Confirmation Number could otherwise probe without limit.
