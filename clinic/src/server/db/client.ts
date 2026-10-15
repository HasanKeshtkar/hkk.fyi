import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Anything that can run a query: the pool-backed db or an open transaction. */
export type Queryable = Db | Tx;

export function createPool(connectionString: string, max = 10): pg.Pool {
  const pool = new pg.Pool({ connectionString, max });
  // A connection dying (DB restart, network blip) must not crash the process. pg-pool only guards
  // idle clients; a client checked out for a transaction has no 'error' listener, and an unhandled
  // 'error' event kills Node. So every client gets a permanent listener. The in-flight query still
  // rejects to its caller and the pool discards the broken client. Log the code only, never the message.
  pool.on('connect', (client) => {
    client.on('error', (err) => {
      console.warn('pg client error', (err as { code?: string }).code ?? 'unknown');
    });
  });
  pool.on('error', () => {}); // idle-client errors: already logged by the per-client listener above
  return pool;
}

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema });
}
