# Over-long confirmation numbers skip the reservation read

After URL-decoding and trimming only the ends, a string longer than 64 characters is answered as an unknown Confirmation Number: 404 `unknown-confirmation`. It counts toward the failure threshold. The Reservations table is not read. The miss uses the same concurrency-safe rate-limit accounting as any other miss.

Reading Reservations was rejected because the cap exists to avoid a lookup on an unbounded key. Leaving the attempt uncounted was rejected because over-long values could then be sent without ever approaching the lockout. A subject who is already locked out still receives 429, and that request adds no miss. If the accounting write fails, ADR 0003 applies and the response is 503.

The 64-character bound is not part of the glossary definition of Confirmation Number. An empty or whitespace-only value is missing (400, not a miss). An over-long value is a failed lookup (404, and a miss). Those are different cases.
