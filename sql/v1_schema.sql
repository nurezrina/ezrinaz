-- ============================================================================
-- VIRTUS SaaS Platform — Enterprise SQL Schema (v1)
-- Target: Azure SQL / PostgreSQL compatible (uses UNIQUEIDENTIFIER/NEWID on SQL Server)
-- Convention: snake_case, 3NF+, soft deletes, audit columns, tenant isolation
-- ============================================================================

-- ============================================================================
-- 1. PLATFORM-LEVEL TABLES
-- ============================================================================

-- Platform users (mapped from Azure AD B2C)
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    external_id NVARCHAR(255) NOT NULL UNIQUE,       -- Azure AD B2C OID
    email NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('super_admin','support','tenant_admin','user','support_focal')),
    is_active BIT NOT NULL DEFAULT 1,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL,
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_users_email (email),
    INDEX ix_users_external_id (external_id)
);

-- Global system theme configuration (single-row or keyed)
CREATE TABLE system_theme (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    primary_color NVARCHAR(7) NOT NULL DEFAULT '#001689',
    secondary_color NVARCHAR(7) NOT NULL DEFAULT '#2A7DE1',
    accent_color NVARCHAR(7) NOT NULL DEFAULT '#2ED9C3',
    font_family NVARCHAR(255) NOT NULL DEFAULT 'Montserrat, sans-serif',
    default_mode NVARCHAR(10) NOT NULL DEFAULT 'light' CHECK (default_mode IN ('light','dark','system')),
    allow_user_mode_toggle BIT NOT NULL DEFAULT 1,
    logo_url NVARCHAR(MAX) NULL,
    layout_header_color NVARCHAR(7) NULL DEFAULT '#0055B8',
    layout_left_panel_color NVARCHAR(7) NULL DEFAULT '#001689',
    layout_main_page_color NVARCHAR(7) NULL DEFAULT '#f8fafc',
    layout_font_color NVARCHAR(7) NULL DEFAULT '#0f172a',
    graph_colors NVARCHAR(MAX) NULL,                  -- JSON array of hex strings
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- Centralized audit log for all CUD operations
CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NULL,                  -- NULL for platform-level actions
    actor_id UNIQUEIDENTIFIER NOT NULL,               -- real user performing the action
    acting_as_id UNIQUEIDENTIFIER NULL,               -- if impersonating
    impersonation_session_id UNIQUEIDENTIFIER NULL,
    action NVARCHAR(100) NOT NULL,                    -- e.g. CREATE, UPDATE, DELETE, PUBLISH, ROLLBACK, LOGIN
    entity_type NVARCHAR(100) NOT NULL,               -- e.g. form_template, workflow_template, tenant
    entity_id NVARCHAR(255) NULL,                     -- PK of affected row
    before_snapshot NVARCHAR(MAX) NULL,               -- JSON of previous state
    after_snapshot NVARCHAR(MAX) NULL,                 -- JSON of new state
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_audit_tenant (tenant_id),
    INDEX ix_audit_actor (actor_id),
    INDEX ix_audit_entity (entity_type, entity_id),
    INDEX ix_audit_created_at (created_at DESC)
);

-- ============================================================================
-- 2. CATALOG TABLES (Platform-level feature catalog)
-- ============================================================================

CREATE TABLE catalog_domains (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE TABLE catalog_modules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    domain_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_domains(id),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_catalog_modules_domain (domain_id)
);

CREATE TABLE catalog_features (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    module_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_modules(id),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_catalog_features_module (module_id)
);

-- ============================================================================
-- 3. TENANT TABLES
-- ============================================================================

CREATE TABLE tenants (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(100) NOT NULL UNIQUE,               -- URL-safe identifier
    status NVARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','draft')),
    logo_url NVARCHAR(MAX) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_tenants_slug (slug),
    INDEX ix_tenants_status (status)
);

-- Per-tenant theme overrides
CREATE TABLE tenant_theme (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    primary_color NVARCHAR(7) NULL,
    secondary_color NVARCHAR(7) NULL,
    accent_color NVARCHAR(7) NULL,
    font_family NVARCHAR(255) NULL,
    default_mode NVARCHAR(10) NULL CHECK (default_mode IN ('light','dark','system')),
    allow_user_mode_toggle BIT NULL,
    logo_url NVARCHAR(MAX) NULL,
    layout_header_color NVARCHAR(7) NULL,
    layout_left_panel_color NVARCHAR(7) NULL,
    layout_main_page_color NVARCHAR(7) NULL,
    layout_font_color NVARCHAR(7) NULL,
    graph_colors NVARCHAR(MAX) NULL,                  -- JSON array
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_tenant_theme UNIQUE (tenant_id)
);

-- Tenant feature subscriptions
CREATE TABLE tenant_subscriptions (
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    feature_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_features(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY (tenant_id, feature_id),
    INDEX ix_tenant_subs_tenant (tenant_id)
);

-- Users assigned to a tenant (tenant-scoped user assignments)
CREATE TABLE tenant_users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    user_id UNIQUEIDENTIFIER NULL REFERENCES users(id),  -- NULL if pre-provisioned
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    division NVARCHAR(255) NULL,
    company_department NVARCHAR(255) NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Pending')),
    assets NVARCHAR(MAX) NULL,                            -- JSON array
    sites NVARCHAR(MAX) NULL,                             -- JSON array
    remark NVARCHAR(MAX) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_tenant_users_tenant (tenant_id),
    INDEX ix_tenant_users_email (email),
    INDEX ix_tenant_users_status (status)
);

-- Tenant-level role definitions
CREATE TABLE tenant_roles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    is_system BIT NOT NULL DEFAULT 0,                     -- system roles can't be deleted
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_tenant_roles_tenant (tenant_id)
);

-- Role-to-permission mapping
CREATE TABLE tenant_role_permissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    role_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenant_roles(id),
    permission_key NVARCHAR(255) NOT NULL,                -- e.g. form.create, form.publish, data.export
    granted BIT NOT NULL DEFAULT 1,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_key),
    INDEX ix_role_permissions_role (role_id)
);

-- User-to-role assignment within a tenant
CREATE TABLE tenant_user_roles (
    tenant_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenant_users(id),
    role_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenant_roles(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY (tenant_user_id, role_id)
);

-- ============================================================================
-- 4. FORM BUILDER TABLES
-- ============================================================================

-- Form template metadata (one row per form)
CREATE TABLE forms (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    form_key NVARCHAR(255) NULL,                          -- machine-friendly slug
    status NVARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_forms_tenant (tenant_id),
    INDEX ix_forms_status (tenant_id, status)
);

-- Immutable version snapshots (schema stored as JSON for flexibility)
CREATE TABLE form_versions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    form_id UNIQUEIDENTIFIER NOT NULL REFERENCES forms(id),
    version_number INT NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    schema_json NVARCHAR(MAX) NOT NULL,                   -- full form definition (sections + fields + layout)
    published_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    published_at DATETIMEOFFSET NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_form_version UNIQUE (form_id, version_number),
    INDEX ix_form_versions_form (form_id),
    INDEX ix_form_versions_status (form_id, status)
);

-- Normalized sections (optional — for query/reporting; canonical data lives in form_versions.schema_json)
CREATE TABLE form_sections (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    form_version_id UNIQUEIDENTIFIER NOT NULL REFERENCES form_versions(id),
    section_key NVARCHAR(255) NOT NULL,
    label NVARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_form_sections_version (form_version_id)
);

-- Normalized fields (optional — for query/reporting)
CREATE TABLE form_fields (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    section_id UNIQUEIDENTIFIER NOT NULL REFERENCES form_sections(id),
    field_key NVARCHAR(255) NOT NULL,
    label NVARCHAR(255) NOT NULL,
    field_type NVARCHAR(50) NOT NULL,                     -- text, textarea, select, radio, checkbox, date, number, signature, table, etc.
    is_required BIT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    config_json NVARCHAR(MAX) NULL,                       -- options, validation rules, colSpan, etc.
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_form_fields_section (section_id)
);

-- Runtime submissions (version-pinned)
CREATE TABLE form_submissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    form_id UNIQUEIDENTIFIER NOT NULL REFERENCES forms(id),
    version_number INT NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','cancelled')),
    values_json NVARCHAR(MAX) NULL,                       -- user-entered data
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_submissions_tenant (tenant_id),
    INDEX ix_submissions_form (form_id),
    INDEX ix_submissions_status (tenant_id, status),
    INDEX ix_submissions_created_by (created_by)
);

-- Normalized submission values (optional — for reporting/search)
CREATE TABLE form_submission_values (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    submission_id UNIQUEIDENTIFIER NOT NULL REFERENCES form_submissions(id),
    field_key NVARCHAR(255) NOT NULL,
    value NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_submission_values_submission (submission_id)
);

-- ============================================================================
-- 5. DATA LIBRARY TABLES
-- ============================================================================

-- Dataset definitions (e.g. "Departments", "Regions", "Permit Categories")
CREATE TABLE data_library_datasets (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    scope NVARCHAR(20) NOT NULL DEFAULT 'org' CHECK (scope IN ('org','module')),
    type NVARCHAR(255) NULL,                              -- org-level type label (e.g. "Department")
    module NVARCHAR(255) NULL,                            -- module-scoped module name
    entity NVARCHAR(255) NULL,                            -- module-scoped entity name
    name NVARCHAR(255) NOT NULL,                          -- display name
    description NVARCHAR(MAX) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_data_library_tenant (tenant_id),
    INDEX ix_data_library_scope (tenant_id, scope)
);

-- Individual data values inside a dataset
CREATE TABLE data_library_values (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    dataset_id UNIQUEIDENTIFIER NOT NULL REFERENCES data_library_datasets(id),
    value NVARCHAR(MAX) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_data_values_dataset (dataset_id)
);

-- ============================================================================
-- 6. WORKFLOW ENGINE TABLES
-- ============================================================================

CREATE TABLE workflow_templates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    name NVARCHAR(255) NOT NULL,
    linked_form_id UNIQUEIDENTIFIER NULL REFERENCES forms(id),
    linked_form_name NVARCHAR(255) NULL,                  -- denormalized for display
    status NVARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    sla NVARCHAR(50) NULL,
    definition_json NVARCHAR(MAX) NULL,                   -- steps, transitions, conditions
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_workflow_templates_tenant (tenant_id),
    INDEX ix_workflow_templates_status (tenant_id, status)
);

CREATE TABLE workflow_steps (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    workflow_id UNIQUEIDENTIFIER NOT NULL REFERENCES workflow_templates(id),
    step_number INT NOT NULL,
    name NVARCHAR(255) NOT NULL,
    step_type NVARCHAR(50) NOT NULL DEFAULT 'approval',   -- approval, review, notification, gate
    assignee_role_id UNIQUEIDENTIFIER NULL REFERENCES tenant_roles(id),
    config_json NVARCHAR(MAX) NULL,                       -- conditions, escalation, SLA per step
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_workflow_steps_workflow (workflow_id)
);

-- ============================================================================
-- 7. TASKS & ASSIGNMENTS
-- ============================================================================

CREATE TABLE tasks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    title NVARCHAR(500) NOT NULL,
    description NVARCHAR(MAX) NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','on_hold')),
    priority NVARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    module NVARCHAR(100) NULL,
    assigned_to UNIQUEIDENTIFIER NULL REFERENCES users(id),
    due_date DATETIMEOFFSET NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIMEOFFSET NULL,
    deleted_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_tasks_tenant (tenant_id),
    INDEX ix_tasks_assigned_to (assigned_to),
    INDEX ix_tasks_status (tenant_id, status)
);

-- ============================================================================
-- 8. DASHBOARD LAYOUTS
-- ============================================================================

CREATE TABLE dashboard_layouts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    layout_type NVARCHAR(50) NOT NULL DEFAULT 'portal',   -- portal, tasks
    layout_json NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_dashboard_layout UNIQUE (tenant_id, user_id, layout_type)
);

-- ============================================================================
-- 9. IMPERSONATION SESSIONS
-- ============================================================================

CREATE TABLE impersonation_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    real_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    impersonated_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    started_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ended_at DATETIMEOFFSET NULL,
    INDEX ix_impersonation_real_user (real_user_id),
    INDEX ix_impersonation_tenant (tenant_id)
);

-- ============================================================================
-- 10. FEEDBACK
-- ============================================================================

CREATE TABLE feedback (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NULL REFERENCES tenants(id),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    acting_as_user_id UNIQUEIDENTIFIER NULL REFERENCES users(id),
    page_url NVARCHAR(2048) NOT NULL,
    route_name NVARCHAR(255) NOT NULL,
    type NVARCHAR(10) NOT NULL CHECK (type IN ('CSAT','NPS','TEXT')),
    score INT NULL,
    category NVARCHAR(50) NULL CHECK (category IN ('Bug','Feature Request','UX','Performance','Other')),
    message NVARCHAR(MAX) NULL,
    app_version NVARCHAR(50) NULL,
    user_agent NVARCHAR(MAX) NULL,
    viewport_width INT NULL,
    viewport_height INT NULL,
    locale NVARCHAR(20) NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_feedback_tenant (tenant_id),
    INDEX ix_feedback_user (user_id),
    INDEX ix_feedback_created_at (created_at DESC)
);

-- ============================================================================
-- 11. INTEGRATIONS (future-ready)
-- ============================================================================

CREATE TABLE tenant_integrations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(50) NOT NULL CHECK (type IN ('ERP','HR','CMMS','custom')),
    protocol NVARCHAR(50) NOT NULL CHECK (protocol IN ('REST','SOAP')),
    base_url NVARCHAR(MAX) NOT NULL,
    auth_type NVARCHAR(50) NULL CHECK (auth_type IN ('APIKey','OAuth2','Basic')),
    encrypted_secrets VARBINARY(MAX) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    created_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    updated_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_integrations_tenant (tenant_id)
);
