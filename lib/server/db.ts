import pg from 'pg';
const globalDb = globalThis as unknown as { pwPool?: pg.Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
  return (globalDb.pwPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
  }));
}
export async function transaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await db().connect();
  try {
    await c.query('BEGIN');
    const result = await fn(c);
    await c.query('COMMIT');
    return result;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
