import path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const dbPath = process.env.DATABASE_PATH || path.join(projectRoot, "data", "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// 1. Core tables
const schemaPath = path.join(projectRoot, "sql", "sqlite_schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf-8");
db.exec(schemaSql);
console.log("[db-init] Applied sqlite_schema.sql (core tables)");

// 2. Migrate old system_config → system_theme if needed
const hasOldTable = db.prepare(
	"SELECT name FROM sqlite_master WHERE type='table' AND name='system_config'"
).get() as { name: string } | undefined;
if (hasOldTable) {
	console.log("[db-init] Found legacy system_config table — migrating...");
	const oldRow = db.prepare("SELECT config_json FROM system_config WHERE id = 1").get() as { config_json: string } | undefined;
	if (oldRow) {
		try {
			const cfg = JSON.parse(oldRow.config_json);
			const t = cfg.theme || cfg;
			const colors = t.graphColors || [];
			db.prepare(`
				INSERT OR IGNORE INTO system_theme (
					id, logo_url, primary_color, secondary_color, background_color, surface_color,
					graph_color_1, graph_color_2, graph_color_3, graph_color_4, graph_color_5,
					font_family, font_color_header, font_color_sidebar, font_color_body,
					layout_mode, dark_mode_enabled, updated_at
				) VALUES (
					'default', ?, ?, ?, ?, ?,
					?, ?, ?, ?, ?,
					?, ?, ?, ?,
					?, ?, ?
				)
			`).run(
				t.logoUrl || null,
				t.primaryColor || null,
				t.secondaryColor || null,
				t.layoutColors?.mainPage || null,
				null,
				colors[0] || null, colors[1] || null, colors[2] || null, colors[3] || null, colors[4] || null,
				t.fontFamily || null,
				t.layoutColors?.header || null,
				t.layoutColors?.leftPanel || null,
				t.layoutColors?.font || null,
				"header_left_main",
				t.defaultMode === "dark" ? 1 : 0,
				new Date().toISOString()
			);
			console.log("[db-init] Migrated system_config values into system_theme");
		} catch {
			console.log("[db-init] Could not parse system_config JSON — skipping migration");
		}
	}
	db.exec("DROP TABLE IF EXISTS system_config");
	console.log("[db-init] Dropped legacy system_config table");
}

// 3. Seed default system_theme row if none exists
const existing = db.prepare("SELECT id FROM system_theme LIMIT 1").get();
if (!existing) {
	db.prepare(`
		INSERT INTO system_theme (
			id, primary_color, secondary_color, font_family,
			layout_mode, dark_mode_enabled, updated_at
		) VALUES (
			'default', '#001689', '#2A7DE1', 'Montserrat, sans-serif',
			'header_left_main', 0, ?
		)
	`).run(new Date().toISOString());
	console.log("[db-init] Seeded default system_theme row");
}

// 4. Seed data for lkp_* tables
const seedPath = path.join(projectRoot, "docs", "database", "seed.sql");
if (fs.existsSync(seedPath)) {
	const seedSql = fs.readFileSync(seedPath, "utf-8");
	db.exec(seedSql);
	console.log("[db-init] Applied seed.sql (lookup reference data)");
} else {
	console.log("[db-init] seed.sql not found — skipping seed data");
}

console.log(`[db-init] SQLite initialized at: ${dbPath}`);
