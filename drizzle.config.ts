import { defineConfig } from "drizzle-kit";

// Migrations use the direct (non-pooled) connection string, not DATABASE_URL -
// see the neon-postgres skill's "Pooled vs direct connections" note: the
// pooled connection (PgBouncer, transaction mode) doesn't support the
// session-level operations schema migrations need.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
