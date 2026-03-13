-- docs/database/seed.sql
-- Purpose: Reference/lookup seed data extracted from hardcoded app values.
-- Source of truth scanned: server.ts, src/types.ts, src/types/workflowFormContracts.ts,
-- src/pages/*, docs/openapi.yaml (as of 2026-03-13).

BEGIN TRANSACTION;

-- -----------------------------------------------------------------------------
-- 1) Status types (cross-domain enum normalization)
-- -----------------------------------------------------------------------------
INSERT INTO lkp_status_types (domain_key, status_key, label, sort_order) VALUES
  ('tenant', 'active', 'Active', 1),
  ('tenant', 'inactive', 'Inactive', 2),
  ('tenant', 'suspended', 'Suspended', 3),
  ('tenant', 'draft', 'Draft', 4),

  ('resource', 'draft', 'Draft', 1),
  ('resource', 'published', 'Published', 2),
  ('resource', 'archived', 'Archived', 3),
  ('resource', 'retired', 'Retired', 4),

  ('task', 'pending', 'Pending', 1),
  ('task', 'in_progress', 'In Progress', 2),
  ('task', 'completed', 'Completed', 3),
  ('task', 'on_hold', 'On Hold', 4),

  ('workflow_instance', 'running', 'Running', 1),
  ('workflow_instance', 'completed', 'Completed', 2),
  ('workflow_instance', 'cancelled', 'Cancelled', 3),
  ('workflow_instance', 'failed', 'Failed', 4),

  ('workflow_task', 'pending', 'Pending', 1),
  ('workflow_task', 'in_progress', 'In Progress', 2),
  ('workflow_task', 'completed', 'Completed', 3),
  ('workflow_task', 'rejected', 'Rejected', 4),
  ('workflow_task', 'cancelled', 'Cancelled', 5),

  ('form_submission', 'in_progress', 'In Progress', 1),
  ('form_submission', 'submitted', 'Submitted', 2),
  ('form_submission', 'cancelled', 'Cancelled', 3),

  ('tenant_user', 'Active', 'Active', 1),
  ('tenant_user', 'Inactive', 'Inactive', 2),
  ('tenant_user', 'Pending', 'Pending', 3),

  ('ui_submission', 'Pending Approval', 'Pending Approval', 1),
  ('ui_submission', 'Approved', 'Approved', 2),
  ('ui_submission', 'Rejected', 'Rejected', 3),
  ('ui_submission', 'Closed', 'Closed', 4)
ON CONFLICT (domain_key, status_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Role and auth lookups
-- -----------------------------------------------------------------------------
INSERT INTO lkp_user_roles (role_key, label, is_platform_role, is_tenant_role, sort_order) VALUES
  ('super_admin', 'Super Admin', 1, 0, 1),
  ('support', 'Support', 1, 0, 2),
  ('tenant_admin', 'Tenant Admin', 0, 1, 3),
  ('support_focal', 'Support Focal', 0, 1, 4),
  ('user', 'User', 0, 1, 5)
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO lkp_theme_modes (mode_key, label, sort_order) VALUES
  ('light', 'Light', 1),
  ('dark', 'Dark', 2),
  ('system', 'System', 3)
ON CONFLICT (mode_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3) Permission model
-- -----------------------------------------------------------------------------
INSERT INTO lkp_permission_sections (section_key, label, sort_order) VALUES
  ('form', 'Form Management', 1),
  ('data', 'Data & Responses', 2),
  ('security', 'Security & Team', 3)
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO lkp_permission_keys (permission_key, label, note, section_key, sort_order) VALUES
  ('create_edit_forms', 'Create & Edit Forms', 'Full access to form builder and styling', 'form', 1),
  ('delete_forms', 'Delete Forms', 'Permanently remove forms and linked data', 'form', 2),
  ('publish_forms', 'Publish / Unpublish', 'Toggle live status of forms', 'form', 3),
  ('template_access', 'Template Access', 'Manage and create global templates', 'form', 4),
  ('view_responses', 'View Responses', 'Access submission data and analytics', 'data', 5),
  ('export_data', 'Export Data', 'Download data in CSV, PDF or Excel', 'data', 6),
  ('delete_submissions', 'Delete Submissions', 'Clear individual or bulk response data', 'data', 7),
  ('manage_users', 'Manage Users', 'Invite, remove, and assign roles', 'security', 8),
  ('billing_access', 'Billing Access', 'Modify plan and view invoices', 'security', 9)
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO lkp_role_templates (role_key, role_name, badge, sort_order) VALUES
  ('permit_originator', 'Permit Originator (PO)', 'Initiates permit request', 1),
  ('asset_owner', 'Asset Owner (AO)', 'Accept and route permit', 2),
  ('other_asset_owner', 'Other Asset Owner (OAO)', 'Conditional co-acceptance', 3),
  ('mech_elec_isolation_authority', 'Mech/Elec Isolation Authority (SO/ASP)', 'Isolation approval and confirmation', 4),
  ('system_operator', 'System Operator (SO)', 'Verification and de-isolation checks', 5),
  ('issuing_authority', 'Issuing Authority (IA)', 'Approve, endorse, issue', 6),
  ('performing_authority', 'Performing Authority', 'Execute work and requests', 7),
  ('oim', 'OIM', 'Long-term isolation approval', 8),
  ('safety_officer', 'Safety Officer', 'Conditional risk reviewer', 9),
  ('senior_supervisor', 'Senior Supervisor', 'Site inspection verification', 10),
  ('env_officer', 'Env Officer', 'Environmental impact assessment', 11),
  ('chief_engineer', 'Chief Engineer', 'Technical endorsement', 12),
  ('project_manager', 'Project Manager', 'Project-level authorization', 13)
ON CONFLICT (role_key) DO NOTHING;

-- PTW role template permission defaults
INSERT INTO lkp_role_template_permission_defaults (role_key, permission_key, granted) VALUES
  ('permit_originator', 'create_edit_forms', 0),
  ('permit_originator', 'delete_forms', 0),
  ('permit_originator', 'publish_forms', 0),
  ('permit_originator', 'template_access', 0),
  ('permit_originator', 'view_responses', 1),
  ('permit_originator', 'export_data', 0),
  ('permit_originator', 'delete_submissions', 0),
  ('permit_originator', 'manage_users', 0),
  ('permit_originator', 'billing_access', 0),

  ('asset_owner', 'create_edit_forms', 0),
  ('asset_owner', 'delete_forms', 0),
  ('asset_owner', 'publish_forms', 0),
  ('asset_owner', 'template_access', 0),
  ('asset_owner', 'view_responses', 1),
  ('asset_owner', 'export_data', 1),
  ('asset_owner', 'delete_submissions', 0),
  ('asset_owner', 'manage_users', 0),
  ('asset_owner', 'billing_access', 0),

  ('other_asset_owner', 'create_edit_forms', 0),
  ('other_asset_owner', 'delete_forms', 0),
  ('other_asset_owner', 'publish_forms', 0),
  ('other_asset_owner', 'template_access', 0),
  ('other_asset_owner', 'view_responses', 1),
  ('other_asset_owner', 'export_data', 1),
  ('other_asset_owner', 'delete_submissions', 0),
  ('other_asset_owner', 'manage_users', 0),
  ('other_asset_owner', 'billing_access', 0),

  ('mech_elec_isolation_authority', 'create_edit_forms', 0),
  ('mech_elec_isolation_authority', 'delete_forms', 0),
  ('mech_elec_isolation_authority', 'publish_forms', 0),
  ('mech_elec_isolation_authority', 'template_access', 0),
  ('mech_elec_isolation_authority', 'view_responses', 1),
  ('mech_elec_isolation_authority', 'export_data', 1),
  ('mech_elec_isolation_authority', 'delete_submissions', 0),
  ('mech_elec_isolation_authority', 'manage_users', 0),
  ('mech_elec_isolation_authority', 'billing_access', 0),

  ('system_operator', 'create_edit_forms', 0),
  ('system_operator', 'delete_forms', 0),
  ('system_operator', 'publish_forms', 0),
  ('system_operator', 'template_access', 0),
  ('system_operator', 'view_responses', 1),
  ('system_operator', 'export_data', 1),
  ('system_operator', 'delete_submissions', 0),
  ('system_operator', 'manage_users', 0),
  ('system_operator', 'billing_access', 0),

  ('issuing_authority', 'create_edit_forms', 0),
  ('issuing_authority', 'delete_forms', 0),
  ('issuing_authority', 'publish_forms', 0),
  ('issuing_authority', 'template_access', 0),
  ('issuing_authority', 'view_responses', 1),
  ('issuing_authority', 'export_data', 1),
  ('issuing_authority', 'delete_submissions', 0),
  ('issuing_authority', 'manage_users', 0),
  ('issuing_authority', 'billing_access', 0),

  ('performing_authority', 'create_edit_forms', 0),
  ('performing_authority', 'delete_forms', 0),
  ('performing_authority', 'publish_forms', 0),
  ('performing_authority', 'template_access', 0),
  ('performing_authority', 'view_responses', 1),
  ('performing_authority', 'export_data', 0),
  ('performing_authority', 'delete_submissions', 0),
  ('performing_authority', 'manage_users', 0),
  ('performing_authority', 'billing_access', 0),

  ('oim', 'create_edit_forms', 1),
  ('oim', 'delete_forms', 0),
  ('oim', 'publish_forms', 1),
  ('oim', 'template_access', 1),
  ('oim', 'view_responses', 1),
  ('oim', 'export_data', 1),
  ('oim', 'delete_submissions', 0),
  ('oim', 'manage_users', 1),
  ('oim', 'billing_access', 0),

  ('safety_officer', 'create_edit_forms', 0),
  ('safety_officer', 'delete_forms', 0),
  ('safety_officer', 'publish_forms', 0),
  ('safety_officer', 'template_access', 0),
  ('safety_officer', 'view_responses', 1),
  ('safety_officer', 'export_data', 1),
  ('safety_officer', 'delete_submissions', 0),
  ('safety_officer', 'manage_users', 0),
  ('safety_officer', 'billing_access', 0),

  ('senior_supervisor', 'create_edit_forms', 0),
  ('senior_supervisor', 'delete_forms', 0),
  ('senior_supervisor', 'publish_forms', 0),
  ('senior_supervisor', 'template_access', 0),
  ('senior_supervisor', 'view_responses', 1),
  ('senior_supervisor', 'export_data', 1),
  ('senior_supervisor', 'delete_submissions', 0),
  ('senior_supervisor', 'manage_users', 0),
  ('senior_supervisor', 'billing_access', 0),

  ('env_officer', 'create_edit_forms', 0),
  ('env_officer', 'delete_forms', 0),
  ('env_officer', 'publish_forms', 0),
  ('env_officer', 'template_access', 0),
  ('env_officer', 'view_responses', 1),
  ('env_officer', 'export_data', 1),
  ('env_officer', 'delete_submissions', 0),
  ('env_officer', 'manage_users', 0),
  ('env_officer', 'billing_access', 0),

  ('chief_engineer', 'create_edit_forms', 0),
  ('chief_engineer', 'delete_forms', 0),
  ('chief_engineer', 'publish_forms', 0),
  ('chief_engineer', 'template_access', 0),
  ('chief_engineer', 'view_responses', 1),
  ('chief_engineer', 'export_data', 1),
  ('chief_engineer', 'delete_submissions', 0),
  ('chief_engineer', 'manage_users', 0),
  ('chief_engineer', 'billing_access', 0),

  ('project_manager', 'create_edit_forms', 0),
  ('project_manager', 'delete_forms', 0),
  ('project_manager', 'publish_forms', 0),
  ('project_manager', 'template_access', 0),
  ('project_manager', 'view_responses', 1),
  ('project_manager', 'export_data', 1),
  ('project_manager', 'delete_submissions', 0),
  ('project_manager', 'manage_users', 0),
  ('project_manager', 'billing_access', 0)
ON CONFLICT (role_key, permission_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4) Form/workflow lookups
-- -----------------------------------------------------------------------------
INSERT INTO lkp_form_field_types (field_type_key, label, sort_order) VALUES
  ('text', 'Text', 1),
  ('static', 'Static', 2),
  ('textarea', 'Textarea', 3),
  ('number', 'Number', 4),
  ('date', 'Date', 5),
  ('time', 'Time', 6),
  ('datetime', 'DateTime', 7),
  ('checkbox', 'Checkbox', 8),
  ('radio', 'Radio', 9),
  ('yesno', 'Yes/No', 10),
  ('select', 'Select', 11),
  ('multiselect', 'Multi Select', 12),
  ('file', 'File', 13),
  ('signature', 'Signature', 14),
  ('table', 'Table', 15),
  ('user', 'User', 16),
  ('role', 'Role', 17)
ON CONFLICT (field_type_key) DO NOTHING;

INSERT INTO lkp_workflow_step_types (step_type_key, label, sort_order) VALUES
  ('submit', 'Submit', 1),
  ('approval', 'Approval', 2),
  ('endorsement', 'Endorsement', 3),
  ('verification', 'Verification', 4),
  ('notification', 'Notification', 5),
  ('task', 'Task', 6),
  ('form', 'Form', 7)
ON CONFLICT (step_type_key) DO NOTHING;

INSERT INTO lkp_assignment_strategies (strategy_key, label, sort_order) VALUES
  ('role', 'Role', 1),
  ('user', 'User', 2),
  ('expression', 'Expression', 3)
ON CONFLICT (strategy_key) DO NOTHING;

INSERT INTO lkp_form_binding_modes (mode_key, label, sort_order) VALUES
  ('create', 'Create', 1),
  ('edit', 'Edit', 2),
  ('review', 'Review', 3)
ON CONFLICT (mode_key) DO NOTHING;

INSERT INTO lkp_rule_operators (operator_key, sort_order) VALUES
  ('eq', 1),
  ('neq', 2),
  ('in', 3),
  ('nin', 4),
  ('gt', 5),
  ('gte', 6),
  ('lt', 7),
  ('lte', 8),
  ('exists', 9)
ON CONFLICT (operator_key) DO NOTHING;

INSERT INTO lkp_data_scopes (scope_key, label, sort_order) VALUES
  ('org', 'Organization', 1),
  ('module', 'Module', 2)
ON CONFLICT (scope_key) DO NOTHING;

INSERT INTO lkp_data_domain_field_types (field_type_key, label, sort_order) VALUES
  ('string', 'String', 1),
  ('number', 'Number', 2),
  ('boolean', 'Boolean', 3),
  ('date', 'Date', 4)
ON CONFLICT (field_type_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5) Task and feedback lookups
-- -----------------------------------------------------------------------------
INSERT INTO lkp_task_priorities (priority_key, label, sort_order) VALUES
  ('low', 'Low', 1),
  ('medium', 'Medium', 2),
  ('high', 'High', 3),
  ('critical', 'Critical', 4)
ON CONFLICT (priority_key) DO NOTHING;

INSERT INTO lkp_feedback_types (type_key, label, sort_order) VALUES
  ('CSAT', 'CSAT', 1),
  ('NPS', 'NPS', 2),
  ('TEXT', 'TEXT', 3)
ON CONFLICT (type_key) DO NOTHING;

INSERT INTO lkp_feedback_categories (category_key, label, sort_order) VALUES
  ('Bug', 'Bug', 1),
  ('Feature Request', 'Feature Request', 2),
  ('UX', 'UX', 3),
  ('Performance', 'Performance', 4),
  ('Other', 'Other', 5)
ON CONFLICT (category_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6) Catalog hierarchy lookups (domain/module/feature)
-- -----------------------------------------------------------------------------
INSERT INTO lkp_catalog_domains (domain_key, domain_name, sort_order) VALUES
  ('hse', 'HSE Domain', 1),
  ('productivity', 'Productivity Domain', 2),
  ('logistic', 'Logistic Domain', 3)
ON CONFLICT (domain_key) DO NOTHING;

INSERT INTO lkp_catalog_modules (module_key, domain_key, module_name, sort_order) VALUES
  ('ptw', 'hse', 'Permit To Work (PTW)', 1),
  ('passport', 'hse', 'Safety Passport', 2),
  ('bbs', 'hse', 'Behavioral Based Safety (BBS)', 3),
  ('occ-safety', 'hse', 'Occupational Safety', 4),
  ('gov', 'hse', 'Governance', 5),
  ('barrier', 'hse', 'Barrier Management', 6),

  ('task-mgmt', 'productivity', 'Task Management', 1),
  ('logbook', 'productivity', 'Digital Logbook', 2),
  ('manning', 'productivity', 'Manning Management', 3),
  ('innovation', 'productivity', 'Innovation Pod', 4),

  ('transport', 'logistic', 'Transport Management', 1),
  ('lodging', 'logistic', 'Lodging & Accommodation', 2),
  ('pob', 'logistic', 'POB Management', 3)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO lkp_catalog_features (feature_key, module_key, feature_name, sort_order) VALUES
  ('ptw-flow', 'ptw', 'Permit-to-Work', 1),
  ('ptw-jsa', 'ptw', 'Job Safety Analysis', 2),
  ('ptw-certs', 'ptw', 'Certificates', 3),
  ('ptw-iso', 'ptw', 'Isolation', 4),
  ('ptw-audit', 'ptw', 'Audit', 5),

  ('sp-osp', 'passport', 'OSP', 1),
  ('sp-ogsp', 'passport', 'OGSP', 2),
  ('sp-comp', 'passport', 'Contractor Competency', 3),
  ('sp-sub', 'passport', 'Subcontractor Management', 4),

  ('bbs-uauc', 'bbs', 'BBS/UAUC Reporting', 1),
  ('bbs-dash', 'bbs', 'Analytic Dashboard', 2),

  ('os-fatigue', 'occ-safety', 'Fatigue Management', 1),
  ('os-dev', 'occ-safety', 'Fatigue Deviation', 2),
  ('os-must', 'occ-safety', 'Mustering Management', 3),
  ('os-inc', 'occ-safety', 'Incident Management', 4),

  ('gov-task', 'gov', 'Governance Task Management', 1),

  ('bm-int', 'barrier', 'Barrier Integrity', 1),
  ('bm-dev', 'barrier', 'Deviation Management', 2),
  ('bm-def', 'barrier', 'Deferral Management', 3),
  ('bm-bowtie', 'barrier', 'Bowtie Visualization', 4),
  ('bm-map', 'barrier', 'Risk Map', 5),
  ('bm-emoc', 'barrier', 'EMOC', 6),

  ('tm-sched', 'task-mgmt', 'Task Scheduling', 1),
  ('tm-check', 'task-mgmt', 'Digital Checklist', 2),
  ('tm-ext', 'task-mgmt', 'External Task Integration', 3),
  ('tm-proj', 'task-mgmt', 'Project Task', 4),

  ('dl-shift', 'logbook', 'Shift Log', 1),
  ('dl-find', 'logbook', 'Finding Log', 2),
  ('dl-act', 'logbook', 'Action Log', 3),
  ('dl-gen', 'logbook', 'General Log', 4),

  ('mm-plan', 'manning', 'Manpower Planning', 1),
  ('mm-role', 'manning', 'Role & Area Assignment', 2),
  ('mm-ot', 'manning', 'Overtime Management', 3),
  ('mm-gen', 'manning', 'Schedule Generation', 4),

  ('ip-bank', 'innovation', 'Idea Bank', 1),
  ('ip-eval', 'innovation', 'Idea Evaluation', 2),
  ('ip-exec', 'innovation', 'Idea Execution', 3),

  ('tr-book', 'transport', 'Transport Booking', 1),
  ('tr-stat', 'transport', 'Transport Status', 2),
  ('tr-man', 'transport', 'Manifest', 3),

  ('la-room', 'lodging', 'Room Booking', 1),
  ('la-gate', 'lodging', 'Safety Boat / Gate Assignment', 2),

  ('pob-mob', 'pob', 'Mob & Demob', 1),
  ('pob-tour', 'pob', 'Tour of Duty', 2)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;
