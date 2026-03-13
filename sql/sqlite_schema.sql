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
  client_meta_json TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE TABLE IF NOT EXISTS tenant_themes (
  tenant_id TEXT PRIMARY KEY,
  theme_config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant_created
  ON feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_created
  ON audit_log(tenant_id, created_at DESC);
