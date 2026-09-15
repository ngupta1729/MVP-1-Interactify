import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy init: reading process.env.DATABASE_URL at module load time would
 * crash `next build` (evaluated at build time, before Marketplace env vars
 * are guaranteed set). See the vercel-storage skill's "Build-time safety" note.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set - is Neon connected to this project?");
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
