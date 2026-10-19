import { createApp } from '../src/createApp.js';

export async function withLookup(findReservation, run) {
  const app = createApp({ findReservation });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

export async function getJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}
