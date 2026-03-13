# Database Schema Analysis (Full Workspace Scan)

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
