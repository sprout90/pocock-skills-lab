import express from 'express';

const reservationFields = [
  'confirmationNumber',
  'guestName',
  'propertyName',
  'arrivalDate',
  'departureDate',
  'status',
];

function sendError(response, status, code, message) {
  response.status(status).json({ code, message });
}

function sendMissing(response) {
  sendError(response, 400, 'missing-confirmation-number', 'A confirmation number is required.');
}

export function createApp({ findReservation }) {
  const app = express();
  app.set('strict routing', true);
  app.set('case sensitive routing', true);

  app.get('/reservations', (_request, response) => {
    sendMissing(response);
  });

  app.get('/reservations/', (_request, response) => {
    sendMissing(response);
  });

  app.get('/reservations/:confirmationNumber', async (request, response) => {
    const confirmationNumber = request.params.confirmationNumber.trim();
    if (confirmationNumber.length === 0) {
      sendMissing(response);
      return;
    }

    const reservation = await findReservation(confirmationNumber);
    if (!reservation) {
      sendError(
        response,
        404,
        'unknown-confirmation',
        'No reservation matches that confirmation number.',
      );
      return;
    }

    const body = {};
    for (const field of reservationFields) {
      body[field] = reservation[field];
    }
    response.status(200).json(body);
  });

  app.use((_request, response) => {
    sendError(response, 404, 'unknown-route', 'No route matches this request.');
  });

  return app;
}
