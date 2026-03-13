-- NAMING CONVENTION: snake_case, singular table names
-- DEV RUNTIME: sqlite_schema.sql (SQLite / local app.db)
-- CANONICAL REFERENCE: v1_schema.sql (Azure SQL / production)
-- LOOKUP TABLES: lookup_tables.sql (platform-level reference data)
-- SEED DATA: docs/database/seed.sql

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  user_id TEXT NOT NULL,
  acting_as_user_id TEXT,
  page_url TEXT,
  route_name TEXT,
  type TEXT NOT NULL,
  score INTEGER,
  category TEXT,
  message TEXT,
  created_at TEXT NOT NULL,
  app_version TEXT,
  client_meta_json TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  locale TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  actor_id TEXT NOT NULL,
  acting_as_id TEXT,
  impersonation_session_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_snapshot TEXT,
  after_snapshot TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_theme (
  tenant_id TEXT PRIMARY KEY,
  theme_config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_theme (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  -- Branding
  logo_url            TEXT,
  favicon_url         TEXT,
  -- Colors
  primary_color       TEXT,
  secondary_color     TEXT,
  background_color    TEXT,
  surface_color       TEXT,
  -- Graph colors (up to 5 levels)
  graph_color_1       TEXT,
  graph_color_2       TEXT,
  graph_color_3       TEXT,
  graph_color_4       TEXT,
  graph_color_5       TEXT,
  -- Typography
  font_family         TEXT,
  font_color_header   TEXT,
  font_color_sidebar  TEXT,
  font_color_body     TEXT,
  -- Layout
  layout_mode         TEXT DEFAULT 'header_left_main',
  dark_mode_enabled   INTEGER DEFAULT 0,
  -- Meta
  updated_at          TEXT DEFAULT (datetime('now')),
  updated_by          TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant_created
  ON feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs(tenant_id, created_at DESC);

-- ============================================================
-- LOOKUP / REFERENCE TABLES (SQLite-compatible mirrors)
-- ============================================================

CREATE TABLE IF NOT EXISTS lkp_status_types (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  domain_key  TEXT NOT NULL,
  status_key  TEXT NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (domain_key, status_key)
);

CREATE TABLE IF NOT EXISTS lkp_user_roles (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role_key          TEXT NOT NULL UNIQUE,
  label             TEXT NOT NULL,
  is_platform_role  INTEGER NOT NULL DEFAULT 0,
  is_tenant_role    INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_theme_modes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mode_key    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_permission_sections (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  section_key TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_permission_keys (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  permission_key  TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  note            TEXT,
  section_key     TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_role_templates (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role_key    TEXT NOT NULL UNIQUE,
  role_name   TEXT NOT NULL,
  badge       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_role_template_permission_defaults (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  role_key        TEXT NOT NULL,
  permission_key  TEXT NOT NULL,
  granted         INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (role_key, permission_key)
);

CREATE TABLE IF NOT EXISTS lkp_form_field_types (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  field_type_key  TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_workflow_step_types (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  step_type_key   TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_assignment_strategies (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  strategy_key  TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_form_binding_modes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  mode_key    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_rule_operators (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  operator_key  TEXT NOT NULL UNIQUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_data_scopes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  scope_key   TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_data_domain_field_types (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  field_type_key  TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_task_priorities (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  priority_key  TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_feedback_types (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  type_key    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_feedback_categories (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_key  TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_catalog_domains (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  domain_key  TEXT NOT NULL UNIQUE,
  domain_name TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_catalog_modules (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  module_key  TEXT NOT NULL UNIQUE,
  domain_key  TEXT NOT NULL,
  module_name TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lkp_catalog_features (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  feature_key   TEXT NOT NULL UNIQUE,
  module_key    TEXT NOT NULL,
  feature_name  TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
