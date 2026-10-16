export type Sql = SqlStorage;

export function all<T extends Record<string, SqlStorageValue>>(sql: Sql, query: string, ...bindings: unknown[]): T[] {
  return sql.exec<T>(query, ...bindings).toArray();
}

export function one<T extends Record<string, SqlStorageValue>>(sql: Sql, query: string, ...bindings: unknown[]): T | null {
  return sql.exec<T>(query, ...bindings).toArray()[0] ?? null;
}

/** True when `err` is SQLite refusing a write because of the named index/constraint. */
export function isUniqueViolation(err: unknown, table: string): boolean {
  const m = (err as Error)?.message ?? '';
  return m.includes('UNIQUE constraint failed') && m.includes(`${table}.`);
}
