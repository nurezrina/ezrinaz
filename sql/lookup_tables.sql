-- ============================================================
-- LOOKUP / REFERENCE TABLES — Azure SQL (T-SQL)
-- Platform-level, NOT tenant-scoped
-- Convention: snake_case, lkp_* prefix, UUID PK
-- Seed data: docs/database/seed.sql
-- Last consolidated: 2026-03-13
-- ============================================================

-- 1) Cross-domain status enum normalization
CREATE TABLE lkp_status_types (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    domain_key      NVARCHAR(50) NOT NULL,
    status_key      NVARCHAR(50) NOT NULL,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT uq_lkp_status_types UNIQUE (domain_key, status_key)
);

-- 2) Platform and tenant role definitions
CREATE TABLE lkp_user_roles (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_key            NVARCHAR(50) NOT NULL UNIQUE,
    label               NVARCHAR(100) NOT NULL,
    is_platform_role    BIT NOT NULL DEFAULT 0,
    is_tenant_role      BIT NOT NULL DEFAULT 0,
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BIT NOT NULL DEFAULT 1,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 3) Theme mode options
CREATE TABLE lkp_theme_modes (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    mode_key        NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 4) Permission sections
CREATE TABLE lkp_permission_sections (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    section_key     NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 5) Permission keys
CREATE TABLE lkp_permission_keys (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    permission_key  NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    note            NVARCHAR(500) NULL,
    section_key     NVARCHAR(50) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 6) Role templates (e.g. PTW roles)
CREATE TABLE lkp_role_templates (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_key        NVARCHAR(50) NOT NULL UNIQUE,
    role_name       NVARCHAR(200) NOT NULL,
    badge           NVARCHAR(200) NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 7) Default permission grants per role template
CREATE TABLE lkp_role_template_permission_defaults (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_key        NVARCHAR(50) NOT NULL,
    permission_key  NVARCHAR(50) NOT NULL,
    granted         BIT NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT uq_lkp_role_tpl_perm UNIQUE (role_key, permission_key)
);

-- 8) Form field types
CREATE TABLE lkp_form_field_types (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    field_type_key  NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 9) Workflow step types
CREATE TABLE lkp_workflow_step_types (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    step_type_key   NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 10) Assignment strategies
CREATE TABLE lkp_assignment_strategies (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    strategy_key    NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 11) Form binding modes
CREATE TABLE lkp_form_binding_modes (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    mode_key        NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 12) Rule operators
CREATE TABLE lkp_rule_operators (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    operator_key    NVARCHAR(50) NOT NULL UNIQUE,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 13) Data scopes
CREATE TABLE lkp_data_scopes (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    scope_key       NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 14) Data domain field types
CREATE TABLE lkp_data_domain_field_types (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    field_type_key  NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 15) Task priorities
CREATE TABLE lkp_task_priorities (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    priority_key    NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 16) Feedback types
CREATE TABLE lkp_feedback_types (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    type_key        NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 17) Feedback categories
CREATE TABLE lkp_feedback_categories (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    category_key    NVARCHAR(50) NOT NULL UNIQUE,
    label           NVARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 18) Catalog domains
CREATE TABLE lkp_catalog_domains (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    domain_key      NVARCHAR(50) NOT NULL UNIQUE,
    domain_name     NVARCHAR(200) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 19) Catalog modules
CREATE TABLE lkp_catalog_modules (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    module_key      NVARCHAR(50) NOT NULL UNIQUE,
    domain_key      NVARCHAR(50) NOT NULL,
    module_name     NVARCHAR(200) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 20) Catalog features
CREATE TABLE lkp_catalog_features (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    feature_key     NVARCHAR(50) NOT NULL UNIQUE,
    module_key      NVARCHAR(50) NOT NULL,
    feature_name    NVARCHAR(200) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
