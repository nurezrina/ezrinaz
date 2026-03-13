# SQL Audit Report

**Date**: 2026-03-13  
**Scope**: All `.sql` files, all `.ts`/`.js` files containing SQL statements

---

## TASK 1 — File Inventory & Analysis

### 1.1 SQL Files

| # | File | Purpose | Target DB | Tables Touched |
|---|------|---------|-----------|----------------|
| 1 | `sql/schema.sql` | Original Azure SQL schema draft | Azure SQL | `tenants`, `app_users`, `catalog_domains`, `catalog_modules`, `catalog_features`, `tenant_subscriptions`, `tenant_integrations`, `tenant_feature_integrations`, `tenant_integration_mappings`, `templates`, `submissions`, `impersonation_sessions`, `audit_log` |
| 2 | `sql/v1_schema.sql` | Enterprise Azure SQL schema (v1) | Azure SQL | `users`, `system_theme`, `audit_logs`, `catalog_domains`, `catalog_modules`, `catalog_features`, `tenants`, `tenant_theme`, `tenant_subscriptions`, `tenant_users`, `tenant_roles`, `tenant_role_permissions`, `tenant_user_roles`, `forms`, `form_versions`, `form_sections`, `form_fields`, `form_submissions`, `form_submission_values`, `data_library_datasets`, `data_library_values`, `workflow_templates`, `workflow_steps`, `tasks`, `dashboard_layouts`, `impersonation_sessions`, `feedback`, `tenant_integrations` |
| 3 | `sql/sqlite_schema.sql` | Runtime SQLite schema for dev server | SQLite | `feedback`, `audit_log`, `tenant_themes`, `system_config` |
| 4 | `sql/feedback_table.sql` | Standalone Azure SQL DDL for feedback | Azure SQL | `[dbo].[Feedback]` |
| 5 | `docs/database/seed.sql` | Reference/lookup seed INSERTs | Agnostic | (No CREATE; inserts into `lkp_*` tables that do not yet exist in any DDL file) |

### 1.2 TypeScript Files with Embedded SQL

| # | File | SQL Operations | Tables Touched |
|---|------|----------------|----------------|
| 1 | `server.ts` | `INSERT INTO system_config`, `INSERT INTO tenant_themes` (UPSERT), `INSERT INTO audit_log`, `INSERT INTO feedback`, `SELECT/UPDATE system_config`, `SELECT tenant_themes` | `system_config`, `tenant_themes`, `audit_log`, `feedback` |
| 2 | `scripts/db-init.ts` | Reads & executes `sql/sqlite_schema.sql`; `INSERT INTO system_config` | `system_config` (and all tables from `sqlite_schema.sql`) |
| 3 | `scripts/db-view.ts` | Read-only `SELECT` from all tables, `SELECT` from `feedback` | (all tables — read only) |

---

## 1.3 Table-by-Table Overlap Matrix

The table below shows every named table across all files, flagging overlap:

| Table Name | `schema.sql` | `v1_schema.sql` | `sqlite_schema.sql` | `feedback_table.sql` | `server.ts` |
|------------|:---:|:---:|:---:|:---:|:---:|
| **tenants** | CREATE | CREATE | — | — | — |
| **app_users** | CREATE | — | — | — | — |
| **users** | — | CREATE | — | — | — |
| **catalog_domains** | CREATE | CREATE | — | — | — |
| **catalog_modules** | CREATE | CREATE | — | — | — |
| **catalog_features** | CREATE | CREATE | — | — | — |
| **tenant_subscriptions** | CREATE | CREATE | — | — | — |
| **tenant_integrations** | CREATE | CREATE | — | — | — |
| **tenant_feature_integrations** | CREATE | — | — | — | — |
| **tenant_integration_mappings** | CREATE | — | — | — | — |
| **templates** | CREATE | — | — | — | — |
| **submissions** | CREATE | — | — | — | — |
| **impersonation_sessions** | CREATE | CREATE | — | — | — |
| **audit_log** | CREATE | — | CREATE | — | INSERT |
| **audit_logs** | — | CREATE | — | — | — |
| **system_theme** | — | CREATE | — | — | — |
| **system_config** | — | — | CREATE | — | INSERT/SELECT/UPDATE |
| **tenant_theme** | — | CREATE | — | — | — |
| **tenant_themes** | — | — | CREATE | — | INSERT/SELECT |
| **tenant_users** | — | CREATE | — | — | — |
| **tenant_roles** | — | CREATE | — | — | — |
| **tenant_role_permissions** | — | CREATE | — | — | — |
| **tenant_user_roles** | — | CREATE | — | — | — |
| **forms** | — | CREATE | — | — | — |
| **form_versions** | — | CREATE | — | — | — |
| **form_sections** | — | CREATE | — | — | — |
| **form_fields** | — | CREATE | — | — | — |
| **form_submissions** | — | CREATE | — | — | — |
| **form_submission_values** | — | CREATE | — | — | — |
| **data_library_datasets** | — | CREATE | — | — | — |
| **data_library_values** | — | CREATE | — | — | — |
| **workflow_templates** | — | CREATE | — | — | — |
| **workflow_steps** | — | CREATE | — | — | — |
| **tasks** | — | CREATE | — | — | — |
| **dashboard_layouts** | — | CREATE | — | — | — |
| **feedback** | — | CREATE | CREATE | — | INSERT/SELECT |
| **[dbo].[Feedback]** | — | — | — | CREATE | — |

---

## 1.4 Duplicate / Overlapping Definitions

### A. Tables defined in BOTH `schema.sql` AND `v1_schema.sql` (7 tables)

| Table | Contradiction? | Details |
|-------|:-:|---------|
| `tenants` | **YES** | `schema.sql` has `primary_color`/`secondary_color` columns, no `slug`, no soft-delete, no audit columns. `v1_schema.sql` has `slug`, `is_deleted`, `created_by`/`updated_by`, CHECK constraint, no color columns. |
| `catalog_domains` | **YES** | `schema.sql` has only `id`, `name`. `v1_schema.sql` adds `slug`, `sort_order`, `is_deleted`, timestamps. |
| `catalog_modules` | **YES** | `schema.sql` has only `id`, `domain_id`, `name`. `v1_schema.sql` adds `slug`, `description`, `sort_order`, `is_deleted`, timestamps. |
| `catalog_features` | **YES** | `schema.sql` has only `id`, `module_id`, `name`. `v1_schema.sql` adds `slug`, `description`, `sort_order`, `is_deleted`, timestamps. |
| `tenant_subscriptions` | **YES** | `schema.sql` has no `created_at`. `v1_schema.sql` includes `created_at`, different index name. |
| `tenant_integrations` | **YES** | `schema.sql` has no CHECK constraints, no `is_deleted`, no audit columns. `v1_schema.sql` has all of those. |
| `impersonation_sessions` | **YES** | `schema.sql` references `app_users`; `v1_schema.sql` references `users`. `v1_schema.sql` adds indexes and NOT NULL on `started_at`. |

### B. Three competing definitions of Feedback (3 files)

| File | Table Name | Dialect | Key Differences |
|------|-----------|---------|-----------------|
| `sql/v1_schema.sql` | `feedback` | Azure SQL | snake_case, UNIQUEIDENTIFIER PK, FK to `users(id)` and `tenants(id)`, CHECK constraints, `user_agent`, viewport, locale columns |
| `sql/sqlite_schema.sql` | `feedback` | SQLite | TEXT PK, no FKs, no CHECK constraints, `client_meta_json` blob instead of separate viewport/locale columns |
| `sql/feedback_table.sql` | `[dbo].[Feedback]` | Azure SQL | PascalCase `[dbo]` schema, NVARCHAR(50) tenant/user IDs (not UNIQUEIDENTIFIER), includes `UserAgent`/viewport/locale like v1 |

### C. Three competing definitions of Audit Log (3 files)

| File | Table Name | Key Differences |
|------|-----------|-----------------|
| `sql/schema.sql` | `audit_log` | References `app_users`, has `real_actor_id`, `details_json`, no snapshots |
| `sql/v1_schema.sql` | `audit_logs` (plural) | References `users`, has `actor_id`, `before_snapshot`/`after_snapshot`, `ip_address`/`user_agent` |
| `sql/sqlite_schema.sql` | `audit_log` (singular) | TEXT columns, matches v1 column names but no FKs or types |

### D. Two competing definitions of Tenant Theme (2 files)

| File | Table Name | Key Differences |
|------|-----------|-----------------|
| `sql/v1_schema.sql` | `tenant_theme` | Full column-per-value model with typed NVARCHAR(7) color columns, FK to `users` |
| `sql/sqlite_schema.sql` | `tenant_themes` (plural) | Single JSON blob `theme_config_json`, no typed columns |

### E. Two competing definitions of System Config/Theme (2 files)

| File | Table Name | Key Differences |
|------|-----------|-----------------|
| `sql/v1_schema.sql` | `system_theme` | Column-per-value model (colors, fonts), references `users` |
| `sql/sqlite_schema.sql` | `system_config` | Single JSON blob `config_json`, integer PK |

### F. Users table naming collision

| File | Table Name | Notes |
|------|-----------|-------|
| `sql/schema.sql` | `app_users` | 3 roles (`super_admin`, `tenant_admin`, `user`), no soft-delete |
| `sql/v1_schema.sql` | `users` | 5 roles (adds `support`, `support_focal`), full soft-delete + audit |

### G. Templates / Submissions divergence

| Concept | `schema.sql` | `v1_schema.sql` |
|---------|-------------|-----------------|
| Form templates | `templates` (monolithic, includes `definition_json`) | `forms` + `form_versions` (versioned with `schema_json`) |
| Submissions | `submissions` (references `templates`, has `current_step`) | `form_submissions` (references `forms`, version-pinned) + `form_submission_values` |

### H. seed.sql references non-existent tables

`docs/database/seed.sql` inserts into `lkp_*` tables (e.g. `lkp_status_types`, `lkp_user_roles`, `lkp_form_field_types`, `lkp_catalog_domains`, etc.) that have **no corresponding CREATE TABLE** in any SQL file.

---

## TASK 2 — Deduplication Plan

### 2.1 Redundant Files (safe to delete)

| File | Reason |
|------|--------|
| **`sql/schema.sql`** | Original draft; every table it defines is superseded by `v1_schema.sql` with richer columns, CHECK constraints, soft-deletes, and audit fields. It is a strict **subset** of `v1_schema.sql` but with contradictory column definitions. No runtime code references it. |
| **`sql/feedback_table.sql`** | Standalone feedback DDL; fully superseded by the `feedback` table in `v1_schema.sql`. Uses PascalCase `[dbo]` convention that contradicts the snake_case convention everywhere else. No code references it. |

### 2.2 Files That Need Merging / Alignment

| File | Action |
|------|--------|
| **`sql/sqlite_schema.sql`** | Must remain (runtime dev DB). But its 4 tables (`feedback`, `audit_log`, `tenant_themes`, `system_config`) need to be **column-aligned** with `v1_schema.sql` counterparts (`feedback`, `audit_logs`, `tenant_theme`, `system_theme`) so the dev server writes data structurally compatible with production. Currently mismatched in naming, column count, and data shape. |
| **`docs/database/seed.sql`** | INSERT targets (`lkp_*` tables) don't exist in any DDL. Either add `CREATE TABLE` statements for lookup tables to `v1_schema.sql` (or a dedicated `lookup_tables.sql`), or restructure the seed file to insert into existing tables. |
| **`server.ts`** | SQL statements are currently the **only consumer** of `sqlite_schema.sql` tables. They use `audit_log` (singular) and `tenant_themes` (plural) which match `sqlite_schema.sql` but contradict `v1_schema.sql` naming. When sqlite_schema is aligned, server.ts queries must be updated to match. |

### 2.3 Files That Are Clean / No Action

| File | Status |
|------|--------|
| **`sql/v1_schema.sql`** | Canonical production schema. Keep as-is (it's the most complete and correct). |
| **`scripts/db-init.ts`** | Utility — references `sqlite_schema.sql`. Keep. |
| **`scripts/db-view.ts`** | Read-only utility. Keep. |

---

## TASK 3 — Consolidation Recommendation

### Recommended Target File Structure

```
sql/
├── v1_schema.sql            # KEEP — canonical Azure SQL / production DDL (29 tables)
├── sqlite_schema.sql        # KEEP — dev runtime DDL, but REALIGN to match v1 naming
├── lookup_tables.sql         # NEW  — CREATE TABLE for all lkp_* reference tables
│
├── schema.sql                # DELETE — superseded by v1_schema.sql
├── feedback_table.sql        # DELETE — superseded by v1_schema.sql

docs/database/
├── seed.sql                  # KEEP — but update to target lookup_tables.sql tables
├── entity-relationship.md    # KEEP
├── schema-analysis.md        # KEEP
├── sql-audit.md              # THIS FILE
```

### Specific Consolidation Steps

1. **Delete `sql/schema.sql`**  
   It is the original draft with 13 tables; all are now covered by the 29-table `v1_schema.sql` with superior definitions. No code references it.

2. **Delete `sql/feedback_table.sql`**  
   A standalone one-off DDL; the same table exists in `v1_schema.sql` with better typing and conventions.

3. **Realign `sql/sqlite_schema.sql`**  
   - Rename `audit_log` → `audit_logs` (match v1)
   - Rename `tenant_themes` → `tenant_theme` (match v1) OR keep singular JSON approach but add missing columns from v1's `feedback` table (e.g. `user_agent`, `viewport_width`, `viewport_height`, `locale`)
   - Decide system config strategy: keep `system_config` JSON blob (pragmatic for SQLite dev) or break into typed columns matching `system_theme`
   - Add `IF NOT EXISTS` on all tables (already present)

4. **Create `sql/lookup_tables.sql`** (or add to `v1_schema.sql`)  
   Define the `lkp_*` tables that `seed.sql` inserts into: `lkp_status_types`, `lkp_user_roles`, `lkp_theme_modes`, `lkp_permission_sections`, `lkp_permission_keys`, `lkp_role_templates`, `lkp_role_template_permission_defaults`, `lkp_form_field_types`, `lkp_workflow_step_types`, `lkp_assignment_strategies`, `lkp_form_binding_modes`, `lkp_rule_operators`, `lkp_data_scopes`, `lkp_data_domain_field_types`, `lkp_task_priorities`, `lkp_feedback_types`, `lkp_feedback_categories`, `lkp_catalog_domains`, `lkp_catalog_modules`, `lkp_catalog_features`.

5. **Update `server.ts` SQL**  
   After sqlite_schema alignment, update any table/column name references in `server.ts` queries.

### Naming Convention Decision Required

The biggest systemic issue is **singular vs. plural and column-name style**:

| Aspect | `schema.sql` (old) | `v1_schema.sql` (new) | `sqlite_schema.sql` (runtime) | `server.ts` (code) |
|--------|--------------------|-----------------------|-------------------------------|---------------------|
| Audit table | `audit_log` | `audit_logs` | `audit_log` | `audit_log` |
| Tenant theme | *(none)* | `tenant_theme` | `tenant_themes` | `tenant_themes` |
| Users table | `app_users` | `users` | *(none)* | *(none)* |
| ID style | UNIQUEIDENTIFIER | UNIQUEIDENTIFIER | TEXT | string |

**Recommendation**: Adopt `v1_schema.sql` naming as canonical. Align `sqlite_schema.sql` and `server.ts` to use the same table names (e.g. `audit_logs`, `tenant_theme`).

---

## Summary of Issues Found

| # | Severity | Issue |
|---|----------|-------|
| 1 | **HIGH** | `schema.sql` is an outdated draft that contradicts `v1_schema.sql` on 7 shared tables |
| 2 | **HIGH** | Feedback table defined 3× in 3 incompatible ways |
| 3 | **HIGH** | Audit log defined 3× with different names and columns |
| 4 | **HIGH** | `seed.sql` references 20 `lkp_*` tables that don't exist anywhere |
| 5 | **MEDIUM** | Tenant theme naming differs between `v1_schema.sql` (`tenant_theme`) and runtime (`tenant_themes`) |
| 6 | **MEDIUM** | System config strategy differs (typed columns vs JSON blob) between v1 and SQLite |
| 7 | **MEDIUM** | User table renamed from `app_users` (old) to `users` (v1) — any code referencing old name will break |
| 8 | **LOW** | `feedback_table.sql` uses PascalCase `[dbo].[Feedback]` contradicting project-wide snake_case |
| 9 | **LOW** | `schema.sql` uses `templates`/`submissions`; v1 uses versioned `forms`/`form_submissions` — different data model |
