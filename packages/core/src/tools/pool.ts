import pg from "pg";
import { loadConfig } from "../config.js";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getReadonlyPool(): pg.Pool {
  pool ??= new Pool({ connectionString: loadConfig().DATABASE_URL_READONLY });
  return pool;
}
