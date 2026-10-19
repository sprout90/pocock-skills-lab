export function createPostgresReservationStore(pool) {
  return {
    async findReservation(confirmationNumber) {
      const result = await pool.query(
        `SELECT confirmation_number AS "confirmationNumber",
                guest_name AS "guestName",
                property_name AS "propertyName",
                to_char(arrival_date, 'YYYY-MM-DD') AS "arrivalDate",
                to_char(departure_date, 'YYYY-MM-DD') AS "departureDate",
                status
         FROM reservations
         WHERE confirmation_number = $1`,
        [confirmationNumber],
      );
      return result.rows[0] ?? null;
    },
  };
}
