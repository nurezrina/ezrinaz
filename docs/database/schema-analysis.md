# Database Schema Analysis (Full Workspace Scan)

---

## Incremental Review — 2026-03-13 (post-consolidation)

**Canonical schema**: `sql/v1_schema.sql` (28 tables)
**Lookup tables**: `sql/lookup_tables.sql` (20 `lkp_*` tables)
**Dev mirror**: `sql/sqlite_schema.sql`
**Seed data**: `docs/database/seed.sql`
**Files scanned**: `server.ts`, all `src/**/*.tsx`, `src/types.ts`, `src/types/workflowFormContracts.ts`, `sql/*.sql`, `scripts/*.ts`

### Context

Prior to this review the SQL audit consolidation was executed:
- `sql/schema.sql` and `sql/feedback_table.sql` were deleted (redundant)
- `sql/lookup_tables.sql` was created with 20 `lkp_*` tables
- `sql/sqlite_schema.sql` was realigned: `audit_log` → `audit_logs`, `tenant_themes` → `tenant_theme`, `system_config` JSON blob → typed `system_theme` table, lookup table mirrors added
- `server.ts` was updated to use typed `system_theme` columns and new table names
- `scripts/db-init.ts` was updated with migration logic and seed loading

---

### 1. New Entities Detected — Not Yet in v1_schema.sql

| # | Entity | Source(s) | Description | Recommendation |
|---|--------|-----------|-------------|----------------|
| 1 | **`workflow_instances`** | `workflowFormContracts.ts` — `WorkflowInstance` type | Runtime workflow execution state: `id`, `tenantId`, `workflowTemplateId`, `currentStepKey`, `status` (`running`/`completed`/`cancelled`/`failed`), `startedBy`, `data` (JSON), timestamps. | **Add table**. The `workflow_templates` table exists but there is no runtime instance table. This is required to track in-flight workflow executions. |
| 2 | **`workflow_tasks`** | `workflowFormContracts.ts` — `TaskSummary` type | Workflow-step-level task assignments with statuses `pending`/`in_progress`/`completed`/`rejected`/`cancelled`, tied to a workflow instance + step. | **Add table**. Distinct from the general-purpose `tasks` table (which has status set `pending`/`in_progress`/`completed`/`on_hold` and no workflow FK). |
| 3 | **`workflow_transitions`** | `workflowFormContracts.ts` — `WorkflowTransition` type | Graph edges: `fromStepKey` → `toStepKey` with optional `condition` (RuleExpr), `isDefault` flag, label. Currently only `workflow_steps` exists. | **Add table**. The `definition_json` column on `workflow_templates` can carry this, but a normalized table enables validation and query. |
| 4 | **`workflow_instance_events`** | `workflowFormContracts.ts` — `AuditEvent` type | Workflow-specific audit trail: `eventType`, `actorUserId`, `payload`, `occurredAt`, scoped to a `workflowInstanceId`. | **Add table** or rely on `audit_logs` with `entity_type = 'workflow_instance'`. Recommend dedicated table for query performance on high-volume workflows. |
| 5 | **PTW form template store** | `server.ts` — `ptwFormTemplateStore` Map | Tenant-scoped PTW form template JSON stored separately from the generic form builder. Shape: `{ template: any, updatedAt: string }`. | **Already covered** by `forms` + `form_versions` in v1_schema.sql, but the server stores PTW templates in a separate in-memory Map. At migration time, PTW templates should be stored as regular `forms` rows with a `form_key = 'ptw'` discriminator. No new table needed. |

### 2. Schema Drift Detected

| # | Issue | v1_schema.sql | App Code | Severity | Fix |
|---|-------|---------------|----------|----------|-----|
| 1 | **`system_theme` column mismatch** | v1 has: `accent_color`, `layout_header_color`, `layout_left_panel_color`, `layout_main_page_color`, `layout_font_color`, `graph_colors` (JSON array) | SQLite has: `background_color`, `surface_color`, `graph_color_1..5`, `font_color_header`, `font_color_sidebar`, `font_color_body`, `favicon_url`, `layout_mode`, `dark_mode_enabled` | **HIGH** | Align v1_schema.sql to match the expanded SQLite system_theme: add `favicon_url`, `background_color`, `surface_color`, `graph_color_1..5`, `font_color_header`, `font_color_sidebar`, `font_color_body`, `layout_mode`, `dark_mode_enabled`. Remove or alias `accent_color`, `layout_header_color` etc. |
| 2 | **`tenant_theme` column mismatch** | v1 has: typed columns (`primary_color`, `secondary_color`, `accent_color`, `font_family`, etc.) | SQLite + server.ts use: `theme_config_json TEXT` (JSON blob per tenant) | **MEDIUM** | Decide strategy: typed columns (v1) or JSON blob (SQLite). If JSON, simplify v1 to match. If typed, expand server.ts to use typed columns for tenant_theme too. |
| 3 | **Tenant status `inactive` not in CHECK** | `CHECK (status IN ('active','suspended','draft'))` | `server.ts` tenantDirectory uses `'inactive'` in type annotation | **LOW** | Add `'inactive'` to the CHECK constraint, or change server code to use `'suspended'`. |
| 4 | **Template `retired` vs `archived`** | `forms.status CHECK ('draft','published','archived')` | `src/types.ts` `Template.status` includes `'retired'` | **MEDIUM** | Standardize on `'archived'` everywhere. Remove `'retired'` from types.ts or add it to the CHECK. |
| 5 | **`workflow_steps.step_type` has no CHECK** | `step_type NVARCHAR(50) NOT NULL DEFAULT 'approval'` — no CHECK constraint | App defines 7 step types: `submit`, `approval`, `endorsement`, `verification`, `notification`, `task`, `form` | **LOW** | Add `CHECK (step_type IN ('submit','approval','endorsement','verification','notification','task','form'))`. |
| 6 | **Form submission UI statuses not in DB** | `form_submissions.status CHECK ('in_progress','submitted','cancelled')` | `SubmissionList.tsx` uses `'Pending Approval'`, `'Approved'`, `'Rejected'`, `'Closed'` | **MEDIUM** | These are workflow-driven approval statuses. Either expand `form_submissions.status` CHECK or (recommended) add a separate `approval_status` column. |
| 7 | **`data_library_datasets` missing `schema` column** | Has `scope`, `type`, `module`, `entity`, `name` but no `schema` | `workflowFormContracts.ts` `DataDomain` has `schema: DataDomainField[]` and `status: 'active'|'inactive'` | **LOW** | Add `schema_json NVARCHAR(MAX) NULL` and `status NVARCHAR(20) DEFAULT 'active'` to `data_library_datasets`. |
| 8 | **`tasks` table missing workflow link** | No FK to workflow instance or workflow step | `TaskSummary` ties tasks to `workflowInstanceId` + `stepKey` | **MEDIUM** | Add optional `workflow_instance_id` and `workflow_step_key` FKs to `tasks`, or use the separate `workflow_tasks` table (recommendation #2 above). |
| 9 | **`impersonation_sessions` not populated** | Table exists in v1_schema.sql | Server uses in-memory base64 session tokens, never writes to DB | **LOW** | Acceptable for dev mock; production should write rows. |

### 3. New Hardcoded Values Not Yet in Lookup Tables

| # | Category | Values | Source | In seed.sql? |
|---|----------|--------|--------|-------------|
| 1 | **Audit actions** | `CREATE`, `UPDATE`, `DELETE`, `PUBLISH`, `ARCHIVE`, `IMPERSONATION_START`, `IMPERSONATION_STOP`, `DEACTIVATE` | server.ts `writeAudit()` calls | **No** — needs `lkp_audit_actions` or add to seed.sql |
| 2 | **Audit entity types** | `feedback`, `form_template`, `workflow_template`, `role`, `data_library`, `tenant_user`, `user` | server.ts | **No** — needs `lkp_audit_entity_types` or add to seed.sql |
| 3 | **UI submission statuses** | `Pending Approval`, `Approved`, `Rejected`, `Closed` | SubmissionList.tsx | **No** — not in `lkp_status_types` (which has `form_submission` domain with `in_progress`/`submitted`/`cancelled` only) |
| 4 | **Dashboard widget IDs** | `total`, `completed`, `in_progress`, `pending`, `module_volume`, `performance` | UserPortal.tsx | **No** — hardcoded in frontend |
| 5 | **Dashboard widget types** | `metric`, `panel` | UserPortal.tsx | **No** — consider `lkp_widget_types` |
| 6 | **Data nav categories** | `org`, `asset`, `personnel`, `hse`, `logistics` | TenantDataManagementPage.tsx `LeftNavKey` | **Partially** — `org` and `module` are in `lkp_data_scopes`, but `asset`, `personnel`, `hse`, `logistics` are not |
| 7 | **Rule actions** | `show`, `hide` | TenantFormBuilderPage.tsx `RuleRow.action` | **No** |
| 8 | **Builder tabs** | `canvas`, `rules`, `workflow`, `roles` | TenantFormBuilderPage.tsx `BuilderTab` | **No** — UI-only, low priority |
| 9 | **Layout mode** | `header_left_main` | sqlite_schema.sql system_theme default | **No** — only one value exists; future layout modes should be in a lookup table |
| 10 | **Modal sizes** | `sm`, `md`, `lg`, `xl` | Modal.tsx | **No** — UI-only, not database-worthy |

### 4. Missing FK Relationships

| # | From Table | To Table | Relationship | Status |
|---|-----------|----------|-------------|--------|
| 1 | `workflow_templates.linked_form_id` | `forms.id` | ✅ FK exists | OK |
| 2 | **(new)** `workflow_instances.workflow_template_id` | `workflow_templates.id` | Table doesn't exist yet | **Needs creation** |
| 3 | **(new)** `workflow_tasks.workflow_instance_id` | `workflow_instances.id` | Table doesn't exist yet | **Needs creation** |
| 4 | **(new)** `workflow_transitions.workflow_template_id` | `workflow_templates.id` | Table doesn't exist yet | **Needs creation** |
| 5 | `tenant_users.role` (text) | `tenant_roles.id` or `lkp_role_templates.role_key` | **Missing** — role is stored as a free-text string in server `TenantUserAssignmentRecord`, not as an FK | **Should be FK** to `tenant_roles` via `tenant_user_roles` junction |
| 6 | `tasks.module` (text) | `catalog_modules.slug` | **Missing** — module is a plain string | **Should be FK** or at least a CHECK against known module slugs |
| 7 | `data_library_datasets.module` (text) | `catalog_modules.slug` | **Missing** — module is a plain string | **Should be FK** |
| 8 | `lkp_catalog_modules.domain_key` | `lkp_catalog_domains.domain_key` | **Missing** in lookup_tables.sql | **Add FK** |
| 9 | `lkp_catalog_features.module_key` | `lkp_catalog_modules.module_key` | **Missing** in lookup_tables.sql | **Add FK** |
| 10 | `lkp_permission_keys.section_key` | `lkp_permission_sections.section_key` | **Missing** in lookup_tables.sql | **Add FK** |
| 11 | `lkp_role_template_permission_defaults.role_key` | `lkp_role_templates.role_key` | **Missing** in lookup_tables.sql | **Add FK** |
| 12 | `lkp_role_template_permission_defaults.permission_key` | `lkp_permission_keys.permission_key` | **Missing** in lookup_tables.sql | **Add FK** |

### 5. Design Improvements

| # | Area | Current State | Recommendation | Impact |
|---|------|---------------|----------------|--------|
| 1 | **Workflow runtime tables** | Only `workflow_templates` + `workflow_steps` exist. No runtime execution/instance/task tables. | Add `workflow_instances`, `workflow_tasks`, `workflow_transitions`, `workflow_instance_events` (4 tables). These are fully typed in `workflowFormContracts.ts` already. | **Critical** for workflow engine to go live |
| 2 | **`system_theme` v1 ↔ SQLite divergence** | v1 uses `accent_color`, `layout_*` columns; SQLite uses `background_color`, `surface_color`, `graph_color_1..5`, `font_color_*`, `dark_mode_enabled`. | Harmonize v1_schema.sql to match the richer SQLite structure (which was designed during step 3 of the consolidation). | **High** — prevents dev/prod drift |
| 3 | **`tenant_theme` storage model** | v1 has 12+ typed columns; SQLite + server use JSON blob `theme_config_json`. | Pick one approach. Recommendation: typed columns in v1 (production), JSON blob in SQLite (dev). Add a mapping layer in the server init code. | **Medium** |
| 4 | **In-memory Maps → DB persistence** | server.ts stores 10 entity types in JS `Map`s: `formTemplatesStore`, `formTemplateSchemaStore`, `formVersionStore`, `formSubmissionStore`, `ptwFormTemplateStore`, `workflowStore`, `roleStore`, `dataStore`, `tenantUserStore`, `dashboardLayouts` + `taskDashboardLayouts`. | For production, all should be persisted in DB. The v1_schema.sql tables exist for most of these. Priority: migrate `dashboardLayouts` to `dashboard_layouts` table in SQLite too. | **High** for data durability |
| 5 | **`tenant_users.role` free-text** | `TenantUserAssignmentRecord.role` is a string like `'Permit Approver'`. | Should be FK to `tenant_roles.id` via the existing `tenant_user_roles` junction table. Free-text role breaks role-based permission enforcement. | **High** for access control |
| 6 | **`data_library_datasets` denormalization** | `type`, `module`, `entity` are nullable text columns used for different scopes. | Consider normalizing: separate `org_datasets` and `module_datasets` tables, or add a proper `schema_json` column for data domain field definitions (per `DataDomain.schema` in contracts). | **Low** |
| 7 | **Lookup table FKs** | `lookup_tables.sql` has 20 tables but no FK constraints between related tables (e.g. `lkp_catalog_modules.domain_key` → `lkp_catalog_domains.domain_key`). | Add FK relationships for all parent-child lookup pairs. | **Low** — lookup tables are reference data |
| 8 | **Status convention inconsistency** | Tenant user: PascalCase (`Active`/`Inactive`/`Pending`). Everything else: snake_case (`in_progress`/`completed`). | Standardize all statuses to snake_case. Update `tenant_users.status` CHECK to `'active'|'inactive'|'pending'`. This requires a one-time data migration. | **Medium** for convention consistency |
| 9 | **`form_submissions` approval lifecycle** | Only 3 statuses: `in_progress`/`submitted`/`cancelled`. UI shows 4 more: `Pending Approval`/`Approved`/`Rejected`/`Closed`. | Add `approval_status` column or expand status CHECK to include workflow-driven states. | **Medium** |
| 10 | **`tasks` vs `workflow_tasks` unification** | `tasks` table is general-purpose (task-mgmt module). `TaskSummary` type is workflow-specific with different status set and FKs to workflow instances. | Keep them separate: `tasks` for standalone task management, `workflow_tasks` for workflow-engine step assignments. Add an optional `workflow_instance_id` FK to `tasks` if standalone tasks need to reference workflows. | **Medium** |

---

### Summary of Recommended Schema Changes

**New tables to add** (4):
1. `workflow_instances` — runtime workflow execution state
2. `workflow_tasks` — workflow step assignments
3. `workflow_transitions` — graph edges between steps
4. `workflow_instance_events` — workflow audit trail

**Columns to add/modify**:
- `system_theme` (v1): add `favicon_url`, `background_color`, `surface_color`, `graph_color_1..5`, `font_color_header`, `font_color_sidebar`, `font_color_body`, `layout_mode`, `dark_mode_enabled`; remove old `layout_*` aliases
- `data_library_datasets`: add `schema_json`, `status`
- `tasks`: add optional `workflow_instance_id`, `workflow_step_key`
- `workflow_steps`: add CHECK constraint on `step_type`
- `tenants`: add `'inactive'` to status CHECK (or change server to `'suspended'`)
- `form_submissions`: add `approval_status` column or extend CHECK

**FKs to add**: 5 lookup-table cross-references

**Hardcoded values to seed**: audit actions, audit entity types, UI submission statuses, data nav categories

---

## Prior Analysis — 2026-03-13 (initial scan)

Date: 2026-03-13  
Scope scanned: `server.ts`, all `src/**/*.ts(x)`, `docs/openapi.yaml`, `docs/tenant-config-openapi.yaml`, `sql/*.sql`, `scripts/*.ts`, `README.md`, `metadata.json`

## 1) Identified data entities and source files

### Platform-level entities
- **Platform users (super admin/support identities)**
  - Fields observed: `id`, `email`, `displayName`, `role`, `tenantId(null)`
  - Sources: `server.ts`, `src/types.ts`, `docs/openapi.yaml`
- **System configuration / theme defaults**
  - Fields observed: `theme`, `primaryColor`, `secondaryColor`, `accentColor`, `fontFamily`, `defaultMode`, `allowUserModeToggle`, `layoutColors`, `graphColors`
  - Sources: `server.ts`, `src/types.ts`, `sql/sqlite_schema.sql`, `sql/v1_schema.sql`, `docs/openapi.yaml`
- **Feature catalog (domain/module/feature)**
  - Fields observed: domain `id,name`; module `id,name,description`; feature `id,name,description`
  - Sources: `server.ts`, `src/types.ts`, `sql/schema.sql`, `sql/v1_schema.sql`
- **Platform audit trail**
  - Fields observed: actor, acting-as user, action, entity type/id, before/after snapshots, IP, user agent, timestamp
  - Sources: `server.ts`, `sql/sqlite_schema.sql`, `sql/schema.sql`, `sql/v1_schema.sql`

### Tenant management entities
- **Tenants**
  - Fields observed: `id`, `name`, `status`, `usersCount`, `lastActivity`, `themeConfig`
  - Sources: `server.ts`, `src/types.ts`, `sql/schema.sql`, `sql/v1_schema.sql`, `docs/openapi.yaml`
- **Tenant theme override**
  - Fields observed: `tenant_id`, theme json/config values
  - Sources: `server.ts`, `sql/sqlite_schema.sql`, `sql/v1_schema.sql`
- **Tenant feature subscriptions**
  - Fields observed: tenant-feature links
  - Sources: `sql/schema.sql`, `sql/v1_schema.sql`, `server.ts`
- **Tenant integrations and mappings**
  - Fields observed: integration type, endpoint/base URL, auth type, enabled, mapping keys, transform rules
  - Sources: `sql/schema.sql`, `sql/v1_schema.sql`

### User & access control entities
- **Tenant users**
  - Fields observed: name, email, division, role, department, status, assets[], sites[], remark
  - Sources: `server.ts` (`TenantUserAssignmentRecord`), `src/pages/TenantUserManagementPage.tsx`, `docs/openapi.yaml`, `sql/v1_schema.sql`
- **Tenant roles**
  - Fields observed: role id/name, users count, modules
  - Sources: `server.ts`, `src/pages/TenantRolesManagementPage.tsx`, `docs/openapi.yaml`, `sql/v1_schema.sql`
- **Tenant role permissions matrix**
  - Fields observed: permission id/label/note/section + role template defaults
  - Sources: `src/types/workflowFormContracts.ts`, `src/pages/TenantRolesManagementPage.tsx`
- **Role switching and impersonation session context**
  - Fields observed: `realUserId`, `realUserRole`, `actingAsUserId`, `actingAsTenantId`, `actingAsRole`, `targetBaseRole`, session id/timestamps
  - Sources: `server.ts`, `src/contexts/AuthContext.tsx`, `src/utils/api.ts`, `sql/schema.sql`, `sql/v1_schema.sql`
- **Auth/session tokens**
  - Observed via `auth_token` and `app_session` local storage flow
  - Sources: `src/contexts/AuthContext.tsx`, `src/utils/api.ts`

### Form builder entities
- **Form templates**
  - Fields observed: `id`, `tenantId`, `name`, `status`, sections count, conditional rules count, timestamps
  - Sources: `server.ts`, `src/pages/TenantFormBuilderPage.tsx`, `docs/openapi.yaml`
- **Form template schema model**
  - Fields observed: template `key,name,description`, section `key,label,order,visibleWhen`, field `key,label,type,required,validation,optionsSource,manualOptions,layout`
  - Sources: `src/types/workflowFormContracts.ts`, `src/pages/TenantFormBuilderPage.tsx`, `docs/tenant-config-openapi.yaml`
- **Form versions**
  - Fields observed: `formId`, `versionNumber`, `status`, `schema`, `publishedBy`, `publishedAt`, `createdAt`
  - Sources: `server.ts`, `src/pages/TenantFormBuilderPage.tsx`, `docs/openapi.yaml`
- **PTW special template**
  - Fields observed: tenant-specific PTW template JSON and updated timestamp
  - Sources: `server.ts`, `src/types/workflowFormContracts.ts`, `src/pages/TenantFormBuilderPage.tsx`
- **Form submissions**
  - Fields observed: `id`, `tenantId`, `formId`, `versionNumber`, `status`, `createdBy`, timestamps
  - Sources: `server.ts`, `src/pages/FormRunner.tsx`, `src/pages/SubmissionList.tsx`, `docs/openapi.yaml`, `sql/v1_schema.sql`

### Workflow entities
- **Workflow templates**
  - Fields observed: `id`, `tenantId`, `name`, `linkedForm`, `steps`, `sla`, `status`, timestamps
  - Sources: `server.ts`, `src/pages/TenantWorkflowEnginePage.tsx`, `docs/openapi.yaml`
- **Workflow graph definitions**
  - Fields observed: step `key,stepType,displayLabel,assignee,formBinding,slaHours`; transition `key,from,to,condition,isDefault`
  - Sources: `src/types/workflowFormContracts.ts`, `docs/tenant-config-openapi.yaml`
- **Workflow runtime constructs**
  - Fields observed in contracts: workflow instance status/current step/context; task summary with status/due date; task actions and audit events
  - Sources: `src/types/workflowFormContracts.ts`, `docs/tenant-config-openapi.yaml`

### Data library entities
- **Tenant data records / data domain records**
  - Fields observed: `scope(org|module)`, `type/module/entity/value`, status, metadata fields (`tagNo`,`criticality` in page model)
  - Sources: `server.ts`, `src/pages/TenantDataManagementPage.tsx`, `docs/openapi.yaml`, `docs/tenant-config-openapi.yaml`, `sql/v1_schema.sql`

### Task and personalization entities
- **Tasks**
  - Fields observed: `id,title,status,priority,module,assignedTo,createdAt,dueDate`
  - Sources: `server.ts`, `src/types.ts`, `src/pages/TasksPage.tsx`, `src/pages/UserPortal.tsx`, `sql/v1_schema.sql`
- **Dashboard layouts (user-specific)**
  - Fields observed: `tenantId`,`userId`,`layoutJson`,`updatedAt`
  - Sources: `server.ts`, `src/types.ts`, `sql/v1_schema.sql`

### Feedback and observability entities
- **Feedback submissions**
  - Fields observed: `type(CSAT/NPS/TEXT)`, score/message/category, route/page, app version, client metadata, acting-as user, tenant/user ids
  - Sources: `server.ts`, `src/components/FeedbackWidget.tsx`, `src/types.ts`, `sql/sqlite_schema.sql`, `sql/feedback_table.sql`, `sql/v1_schema.sql`, `docs/openapi.yaml`
- **Audit events**
  - Fields observed: CRUD event action/entity and snapshots
  - Sources: `server.ts`, `sql/*.sql`, `docs/openapi.yaml`, `docs/tenant-config-openapi.yaml`

---

## 2) Hardcoded values to normalize into lookup/reference tables

### Roles
- Platform/auth roles: `super_admin`, `support`, `tenant_admin`, `user`, `support_focal`
- Tenant assignment statuses: `Active`, `Inactive`, `Pending`
- PTW role templates:
  - `permit_originator`, `asset_owner`, `other_asset_owner`, `mech_elec_isolation_authority`, `system_operator`, `issuing_authority`, `performing_authority`, `oim`, `safety_officer`, `senior_supervisor`, `env_officer`, `chief_engineer`, `project_manager`

### Statuses and lifecycle states
- Tenant status: `active`, `suspended`, `draft` (plus `inactive` observed in in-memory tenant directory type)
- Resource status: `draft`, `published`, `archived`, `retired`
- Form submission status: `in_progress`, `submitted`, `cancelled`
- Workflow instance status: `running`, `completed`, `cancelled`, `failed`
- Task status: `pending`, `in_progress`, `completed`, `rejected`, `on_hold`, `cancelled`

### Classification values
- Task priority: `low`, `medium`, `high`, `critical`
- Feedback type: `CSAT`, `NPS`, `TEXT`
- Feedback category: `Bug`, `Feature Request`, `UX`, `Performance`, `Other`
- Data scope: `org`, `module`
- Data domain field type: `string`, `number`, `boolean`, `date`
- Rule operators: `eq`, `neq`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `exists`
- Option source type: `data_domain`
- Sort direction: `asc`, `desc`

### Form/workflow configuration values
- Form field types:
  - `text`, `static`, `textarea`, `number`, `date`, `time`, `datetime`, `checkbox`, `radio`, `yesno`, `select`, `multiselect`, `file`, `signature`, `table`, `user`, `role`
- Workflow step types:
  - `submit`, `approval`, `endorsement`, `verification`, `notification`, `task`, `form`
- Assignment strategy: `role`, `user`, `expression`
- Form binding mode: `create`, `edit`, `review`
- Permission sections: `form`, `data`, `security`

### Catalog hierarchy values (from hardcoded API response)
- Domains: `hse`, `productivity`, `logistic`
- Modules:
  - `ptw`, `passport`, `bbs`, `occ-safety`, `gov`, `barrier`, `task-mgmt`, `logbook`, `manning`, `innovation`, `transport`, `lodging`, `pob`
- Features (all literal IDs currently hardcoded):
  - `ptw-flow`, `ptw-jsa`, `ptw-certs`, `ptw-iso`, `ptw-audit`
  - `sp-osp`, `sp-ogsp`, `sp-comp`, `sp-sub`
  - `bbs-uauc`, `bbs-dash`
  - `os-fatigue`, `os-dev`, `os-must`, `os-inc`
  - `gov-task`
  - `bm-int`, `bm-dev`, `bm-def`, `bm-bowtie`, `bm-map`, `bm-emoc`
  - `tm-sched`, `tm-check`, `tm-ext`, `tm-proj`
  - `dl-shift`, `dl-find`, `dl-act`, `dl-gen`
  - `mm-plan`, `mm-role`, `mm-ot`, `mm-gen`
  - `ip-bank`, `ip-eval`, `ip-exec`
  - `tr-book`, `tr-stat`, `tr-man`
  - `la-room`, `la-gate`
  - `pob-mob`, `pob-tour`

---

## 3) Relationships discovered

- Domain hierarchy: `catalog_domain -> catalog_module -> catalog_feature`
- Tenant feature access: `tenant -> tenant_subscription -> catalog_feature`
- Tenant users and access:
  - `tenant -> tenant_user`
  - `tenant_user <-> tenant_role` via `tenant_user_role`
  - `tenant_role -> tenant_role_permission -> permission`
- Form model:
  - `form_template -> form_template_version -> form_section -> form_field`
  - `form_field -> form_field_option`
  - `form_template_version -> form_field_rule` (conditional logic)
  - `form_template_version -> form_submission -> form_submission_value`
- Workflow model:
  - `workflow_template -> workflow_step`
  - `workflow_template -> workflow_transition`
  - `workflow_template_version -> workflow_instance`
  - `workflow_instance -> workflow_task -> workflow_task_action`
  - `workflow_instance -> workflow_instance_event`
- Data library model:
  - `tenant_data_domain -> tenant_data_record`
- Integration model:
  - `tenant_integration` linked to tenant
  - `tenant_feature_integration` links feature and integration for tenant
  - `tenant_integration_mapping` stores key mappings per integration+feature
- Feedback and audit:
  - `feedback_submission` belongs to tenant user and optionally acting-as user
  - `tenant_audit_log` / `platform_audit_log` capture actor and entity metadata
- Personalization:
  - `user_dashboard_layout` belongs to `(tenant_id, tenant_user_id)`

---

## 4) Super admin vs tenant separation

### Platform-only
- Platform identity users (`super_admin`, `support`) and platform sessions
- Global system settings/theme defaults
- Catalog domain/module/feature master data
- Platform-level audit logs

### Tenant-scoped
- Tenant users, tenant roles, role permissions
- Tenant theme overrides
- Tenant form templates, versions, submissions
- Tenant workflow templates and runtime workflow/task state
- Tenant data library records
- Tenant feedback records
- Tenant integrations and field mappings
- Tenant-level dashboard layouts

---

## 5) Data modelling issues/risks found

1. **Status/enum drift across layers**
   - Different files use overlapping but inconsistent state sets (`inactive` vs `suspended`; `retired` vs `archived`; mixed `Active` vs `active`).
2. **Schema drift in existing SQL artifacts**
   - `audit_log` shape differs between `sql/schema.sql`, `sql/v1_schema.sql`, and `sql/sqlite_schema.sql`.
   - `feedback` constraints differ between Azure SQL draft and SQLite runtime schema.
3. **Persistence gap**
   - Many runtime entities are currently stored in in-memory `Map`s in `server.ts` and are not durable.
4. **Endpoint contract mismatch**
   - OpenAPI docs and implemented route prefixes differ (`/api/v1/...` vs unprefixed documented paths in places).
5. **ID shape inconsistency**
   - Runtime IDs are string prefixes (`F-...`, `WF-...`, `SUB-...`) rather than UUIDs.
6. **Tenant isolation depends on app logic**
   - Tenant scoping is currently enforced in route code (`resolveRequestedTenantScope`), not consistently at storage/query policy level.
7. **Role semantics mixed at multiple levels**
   - Platform access role, tenant assignment role, and workflow assignment role are conceptually different but currently conflated as plain strings.

---

## 6) Recommended modelling posture implemented in `schema.sql`

- Dedicated platform user table (no `tenant_id`) and dedicated tenant user table (`tenant_id` mandatory)
- Lookup-table driven statuses, roles, types, categories, priorities, operators, assignment modes
- Versioned form and workflow templates with explicit runtime instance/task/event tables
- Mandatory soft-delete and audit columns on all tables
- UUID PKs (`UNIQUEIDENTIFIER`) across all entities
- Indexes on all foreign keys, tenant keys, and `created_at`
- Explicit row-isolation comments on all tenant-scoped tables
