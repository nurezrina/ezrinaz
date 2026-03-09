# Azure SQL Database Schema for VIRTUS SaaS

-- Tenants
CREATE TABLE tenants (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, draft
    logo_url NVARCHAR(MAX),
    primary_color NVARCHAR(7) DEFAULT '#2ED9C3',
    secondary_color NVARCHAR(7) DEFAULT '#2A7DE1',
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

-- Users (Mapped from Azure AD B2C OID)
CREATE TABLE app_users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    external_id NVARCHAR(255) NOT NULL UNIQUE, -- B2C Object ID
    email NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(255),
    role NVARCHAR(50) NOT NULL, -- super_admin, tenant_admin, user
    is_active BIT DEFAULT 1,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_users_tenant (tenant_id)
);

-- Catalog
CREATE TABLE catalog_domains (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL
);

CREATE TABLE catalog_modules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    domain_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_domains(id),
    name NVARCHAR(255) NOT NULL
);

CREATE TABLE catalog_features (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    module_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_modules(id),
    name NVARCHAR(255) NOT NULL
);

-- Subscriptions
CREATE TABLE tenant_subscriptions (
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    feature_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_features(id),
    PRIMARY KEY (tenant_id, feature_id),
    INDEX ix_subs_tenant (tenant_id)
);

-- Integrations
CREATE TABLE tenant_integrations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(50) NOT NULL, -- ERP, HR, CMMS, custom
    protocol NVARCHAR(50) NOT NULL, -- REST, SOAP
    base_url NVARCHAR(MAX) NOT NULL,
    auth_type NVARCHAR(50), -- APIKey, OAuth2, Basic
    encrypted_secrets VARBINARY(MAX), -- Stored securely
    INDEX ix_integrations_tenant (tenant_id)
);

CREATE TABLE tenant_feature_integrations (
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    feature_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_features(id),
    integration_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenant_integrations(id),
    direction NVARCHAR(20) NOT NULL, -- inbound, outbound, both
    triggers NVARCHAR(MAX), -- JSON array of events: onSubmit, onApprove, onClose
    PRIMARY KEY (tenant_id, feature_id, integration_id)
);

CREATE TABLE tenant_integration_mappings (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    integration_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenant_integrations(id),
    feature_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_features(id),
    internal_key NVARCHAR(255) NOT NULL,
    external_key NVARCHAR(255) NOT NULL,
    data_type NVARCHAR(50) NOT NULL,
    is_required BIT DEFAULT 0,
    transform_rule NVARCHAR(MAX),
    sort_order INT DEFAULT 0,
    UNIQUE (tenant_id, integration_id, feature_id, internal_key),
    INDEX ix_mappings_tenant (tenant_id)
);

-- Templates
CREATE TABLE templates (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    feature_id UNIQUEIDENTIFIER NOT NULL REFERENCES catalog_features(id),
    name NVARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    status NVARCHAR(50) DEFAULT 'draft', -- draft, published, retired
    definition_json NVARCHAR(MAX) NOT NULL, -- Sections, fields, workflow, dependencies
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_templates_tenant (tenant_id)
);

-- Submissions
CREATE TABLE submissions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    template_id UNIQUEIDENTIFIER NOT NULL REFERENCES templates(id),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES app_users(id),
    values_json NVARCHAR(MAX) NOT NULL,
    current_status NVARCHAR(50) NOT NULL,
    current_step INT DEFAULT 0,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_submissions_tenant (tenant_id)
);

-- Audit & Impersonation
CREATE TABLE impersonation_sessions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    real_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES app_users(id),
    impersonated_user_id UNIQUEIDENTIFIER NOT NULL REFERENCES app_users(id),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    started_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    ended_at DATETIMEOFFSET NULL
);

CREATE TABLE audit_log (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id UNIQUEIDENTIFIER NOT NULL REFERENCES tenants(id),
    real_actor_id UNIQUEIDENTIFIER NOT NULL REFERENCES app_users(id),
    acting_as_id UNIQUEIDENTIFIER NULL REFERENCES app_users(id),
    impersonation_session_id UNIQUEIDENTIFIER NULL REFERENCES impersonation_sessions(id),
    action NVARCHAR(255) NOT NULL,
    entity_type NVARCHAR(50),
    entity_id NVARCHAR(255),
    details_json NVARCHAR(MAX),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX ix_audit_tenant (tenant_id)
);
