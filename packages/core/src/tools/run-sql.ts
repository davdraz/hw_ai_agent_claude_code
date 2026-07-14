import { getReadonlyPool } from "./pool.js";

const FORBIDDEN_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "truncate",
  "grant",
  "revoke",
  "create",
  "comment",
  "call",
  "do",
  "copy",
  "vacuum",
  "lock",
  "into",
  "execute",
  "merge",
];

export class UnsafeSqlError extends Error {}

export function assertSelectOnly(sql: string): void {
  const trimmed = sql.trim().replace(/;+\s*$/, "");

  if (trimmed.length === 0) {
    throw new UnsafeSqlError("Üres SQL lekérdezés.");
  }
  if (trimmed.includes(";")) {
    throw new UnsafeSqlError("Csak egyetlen SQL utasítás engedélyezett.");
  }
  if (!/^select\s/i.test(trimmed)) {
    throw new UnsafeSqlError("Csak SELECT lekérdezés engedélyezett.");
  }

  const lower = trimmed.toLowerCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
      throw new UnsafeSqlError(`Tiltott kulcsszó a lekérdezésben: ${keyword}`);
    }
  }
}

export interface RunSqlResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export async function runSql(sql: string): Promise<RunSqlResult> {
  assertSelectOnly(sql);
  const result = await getReadonlyPool().query<Record<string, unknown>>(sql);
  return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
}
