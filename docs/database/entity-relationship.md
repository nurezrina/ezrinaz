# Entity Relationship Description

This ERD description is based on the canonical SQL model in `sql/v1_schema.sql`.

## 1) Platform/Core Tables

### `users`
- **Key columns**: `id` (PK), `external_id` (unique), `email`, `role`, `is_active`, `is_deleted`.
- **Relationships**:
  - Referenced by many audit columns (`created_by`, `updated_by`, `deleted_by`) across tenant tables.
  - Referenced directly by `system_theme.created_by/updated_by`.
  - Referenced directly by `tasks.assigned_to` and `tasks.created_by/updated_by`.
  - Referenced directly by `impersonation_sessions.real_user_id/impersonated_user_id`.
  - Referenced directly by `feedback.user_id` and `feedback.acting_as_user_id`.

### `system_theme`
- **Key columns**: `id` (PK), color/font/theme settings, `default_mode`.
- **Relationships**:
  - `created_by` → `users.id`
  - `updated_by` → `users.id`

### `audit_logs`
- **Key columns**: `id` (PK), `tenant_id` (nullable), `actor_id`, `acting_as_id`, `entity_type`, `entity_id`, snapshots.
- **Relationships**:
  - Logical relation to `tenants` via nullable `tenant_id`.
  - Actor/acting-as values map to `users.id` (not enforced as FK in this file).

## 2) Catalog Hierarchy

### `catalog_domains`
- **Key columns**: `id` (PK), `slug` (unique), `name`.
- **Relationships**:
  - One-to-many to `catalog_modules`.

### `catalog_modules`
- **Key columns**: `id` (PK), `domain_id` (FK), `slug` (unique), `name`.
- **Relationships**:
  - `domain_id` → `catalog_domains.id`
  - One-to-many to `catalog_features`.

### `catalog_features`
- **Key columns**: `id` (PK), `module_id` (FK), `slug` (unique), `name`.
- **Relationships**:
  - `module_id` → `catalog_modules.id`
  - Many-to-many with tenants through `tenant_subscriptions`.

## 3) Tenant & Access Control

### `tenants`
- **Key columns**: `id` (PK), `slug` (unique), `name`, `status`.
- **Relationships**:
  - Parent for most tenant-scoped entities.

### `tenant_theme`
- **Key columns**: `id` (PK), `tenant_id` (unique FK), theme overrides.
- **Relationships**:
  - `tenant_id` → `tenants.id` (1:1)
  - `created_by` / `updated_by` → `users.id`

### `tenant_subscriptions`
- **Key columns**: composite PK (`tenant_id`, `feature_id`).
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `feature_id` → `catalog_features.id`

### `tenant_users`
- **Key columns**: `id` (PK), `tenant_id` (FK), optional `user_id` (FK), `email`, `status`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `user_id` → `users.id` (optional platform identity link)
  - Many-to-many with `tenant_roles` via `tenant_user_roles`.

### `tenant_roles`
- **Key columns**: `id` (PK), `tenant_id` (FK), `name`, `is_system`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - One-to-many to `tenant_role_permissions`.
  - Many-to-many to `tenant_users` via `tenant_user_roles`.

### `tenant_role_permissions`
- **Key columns**: `id` (PK), `role_id` (FK), `permission_key`, `granted`; unique (`role_id`, `permission_key`).
- **Relationships**:
  - `role_id` → `tenant_roles.id`

### `tenant_user_roles`
- **Key columns**: composite PK (`tenant_user_id`, `role_id`).
- **Relationships**:
  - `tenant_user_id` → `tenant_users.id`
  - `role_id` → `tenant_roles.id`

## 4) Form Builder & Submission Model

### `forms`
- **Key columns**: `id` (PK), `tenant_id` (FK), `name`, `form_key`, `status`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - One-to-many to `form_versions`.
  - One-to-many to `form_submissions`.

### `form_versions`
- **Key columns**: `id` (PK), `form_id` (FK), `version_number`; unique (`form_id`, `version_number`).
- **Relationships**:
  - `form_id` → `forms.id`
  - `published_by` / `created_by` → `users.id`
  - One-to-many to `form_sections`.

### `form_sections`
- **Key columns**: `id` (PK), `form_version_id` (FK), `section_key`, `label`.
- **Relationships**:
  - `form_version_id` → `form_versions.id`
  - One-to-many to `form_fields`.

### `form_fields`
- **Key columns**: `id` (PK), `section_id` (FK), `field_key`, `field_type`.
- **Relationships**:
  - `section_id` → `form_sections.id`

### `form_submissions`
- **Key columns**: `id` (PK), `tenant_id` (FK), `form_id` (FK), `version_number`, `status`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `form_id` → `forms.id`
  - `created_by` / `updated_by` → `users.id`
  - One-to-many to `form_submission_values`.

### `form_submission_values`
- **Key columns**: `id` (PK), `submission_id` (FK), `field_key`, `value`.
- **Relationships**:
  - `submission_id` → `form_submissions.id`

## 5) Data Library

### `data_library_datasets`
- **Key columns**: `id` (PK), `tenant_id` (FK), `scope`, `type`, `module`, `entity`, `name`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `created_by` / `updated_by` → `users.id`
  - One-to-many to `data_library_values`.

### `data_library_values`
- **Key columns**: `id` (PK), `dataset_id` (FK), `value`, `is_active`.
- **Relationships**:
  - `dataset_id` → `data_library_datasets.id`

## 6) Workflow Engine

### `workflow_templates`
- **Key columns**: `id` (PK), `tenant_id` (FK), optional `linked_form_id` (FK), `status`, `definition_json`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `linked_form_id` → `forms.id` (optional)
  - `created_by` / `updated_by` → `users.id`
  - One-to-many to `workflow_steps`.

### `workflow_steps`
- **Key columns**: `id` (PK), `workflow_id` (FK), `step_number`, `step_type`, optional `assignee_role_id` (FK).
- **Relationships**:
  - `workflow_id` → `workflow_templates.id`
  - `assignee_role_id` → `tenant_roles.id` (optional)

## 7) Tasking, Personalization, and Support Ops

### `tasks`
- **Key columns**: `id` (PK), `tenant_id` (FK), `status`, `priority`, `module`, optional `assigned_to`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `assigned_to` → `users.id` (optional)
  - `created_by` / `updated_by` → `users.id`

### `dashboard_layouts`
- **Key columns**: `id` (PK), `tenant_id` (FK), `user_id` (FK), `layout_type`; unique (`tenant_id`, `user_id`, `layout_type`).
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `user_id` → `users.id`

### `impersonation_sessions`
- **Key columns**: `id` (PK), `real_user_id` (FK), `impersonated_user_id` (FK), `tenant_id` (FK), `started_at`.
- **Relationships**:
  - `real_user_id` → `users.id`
  - `impersonated_user_id` → `users.id`
  - `tenant_id` → `tenants.id`

### `feedback`
- **Key columns**: `id` (PK), nullable `tenant_id` (FK), `user_id` (FK), nullable `acting_as_user_id` (FK), `type`, `category`, `created_at`.
- **Relationships**:
  - `tenant_id` → `tenants.id` (optional)
  - `user_id` → `users.id`
  - `acting_as_user_id` → `users.id` (optional)

### `tenant_integrations`
- **Key columns**: `id` (PK), `tenant_id` (FK), `name`, `type`, `protocol`, `auth_type`.
- **Relationships**:
  - `tenant_id` → `tenants.id`
  - `created_by` / `updated_by` → `users.id`

## 8) High-level Relationship Summary

- **Tenant root**: `tenants` is the parent of subscriptions, users, roles, forms, data library, workflows, tasks, layouts, feedback, integrations, and impersonation sessions.
- **Catalog root**: `catalog_domains -> catalog_modules -> catalog_features` then `tenant_subscriptions` binds features to tenants.
- **Access control**: `tenant_users <-> tenant_roles` via `tenant_user_roles`, with fine-grained permissions in `tenant_role_permissions`.
- **Form runtime lineage**: `forms -> form_versions -> form_sections -> form_fields`, and submission path `forms -> form_submissions -> form_submission_values`.
- **Workflow linkage**: `workflow_templates` optionally bind to `forms`; `workflow_steps` can bind assignees to `tenant_roles`.
