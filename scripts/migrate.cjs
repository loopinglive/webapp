/**
 * Applies SQL files to the Supabase database over the session pooler.
 *
 *   node scripts/migrate.cjs supabase/migrations/0001_*.sql supabase/seed.sql
 *
 * Reads SUPABASE_DB_HOST / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD from the
 * environment (or .env.local). Supabase does not expose a direct-connection
 * hostname on newer projects, so this goes through the pooler in session mode,
 * which is the one that accepts DDL.
 *
 * Needs the `pg` driver:  npm i -D pg
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnv();

const files = process.argv.slice(2);

if (!files.length) {
  console.error("Usage: node scripts/migrate.cjs <file.sql> [more.sql ...]");
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD is not set.");
  process.exit(1);
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: 5432,
  user: process.env.SUPABASE_DB_USER,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 120000,
});

(async () => {
  await client.connect();
  client.on("notice", (n) => console.log("   notice:", n.message));

  for (const file of files) {
    const sql = fs.readFileSync(file, "utf8");
    process.stdout.write(`-> ${path.basename(file)} ... `);
    try {
      await client.query(sql);
      console.log("OK");
    } catch (e) {
      console.log("FAILED");
      console.log("   ", e.message);
      if (e.position) {
        const at = Number(e.position);
        console.log(
          "   near:",
          sql.slice(Math.max(0, at - 90), at + 90).replace(/\s+/g, " ")
        );
      }
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("\nApplied.");
})();
