import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));

async function runSqlFile(pool, fileName) {
  const sql = await readFile(join(directory, fileName), 'utf8');
  await pool.query(sql);
}

export function applySchema(pool) {
  return runSqlFile(pool, 'schema.sql');
}

export function applySeed(pool) {
  return runSqlFile(pool, 'seed.sql');
}
