import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, "data", "app.db");
const db = new Database(dbPath, { readonly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`Database: ${dbPath}`);
console.log("Tables:", tables.map((t) => t.name).join(", "));

for (const table of tables) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
  console.log(`- ${table.name}: ${row.count} rows`);
}

if (tables.some((t) => t.name === "feedback")) {
  const feedback = db.prepare(`
    SELECT id, tenant_id, user_id, type, score, created_at
    FROM feedback
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  console.log("\nLatest feedback (max 10):");
  console.table(feedback);
}
