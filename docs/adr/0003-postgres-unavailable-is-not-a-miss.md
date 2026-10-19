# Unavailable PostgreSQL is not a miss

When PostgreSQL cannot finish the rate-limit read, the rate-limit write, or a Reservation read this request requires, the lookup responds 503 with `lookup-unavailable`. Nothing is added to the miss count, and a lockout is neither started nor extended. 500 was rejected because the failure is an unavailable dependency. Counting it as a miss was rejected because an outage would then lock out every peer.

A 404 or 200 that depends on rate-limit accounting is returned only after that accounting has been durably completed. If the accounting write fails, the response is 503 rather than an uncounted 404. Missing-confirmation requests and unknown routes do not consult PostgreSQL, so they stay 400 and 404 while the database is down. `Retry-After` is not sent on 503.
