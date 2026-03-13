import path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, "data", "app.db");
const schemaPath = path.join(projectRoot, "sql", "sqlite_schema.sql");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
const schemaSql = fs.readFileSync(schemaPath, "utf-8");

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(schemaSql);

const existing = db.prepare("SELECT id FROM system_config WHERE id = 1").get() as { id: number } | undefined;
if (!existing) {
	db.prepare("INSERT INTO system_config (id, config_json, updated_at) VALUES (1, ?, ?)")
		.run(JSON.stringify({ theme: {} }), new Date().toISOString());
}

console.log(`SQLite initialized at: ${dbPath}`);
