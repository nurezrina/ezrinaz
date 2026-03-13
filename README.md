# VIRTUS Multi-Tenant SaaS Platform

## Overview
VIRTUS is a production-ready, multi-tenant SaaS application built for enterprise HSE management. It features strict data isolation, advanced form building with workflow automation, and secure impersonation capabilities.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Azure Functions (Node.js + TypeScript).
- **Database**: Azure SQL (Shared schema, tenant-isolated).
- **Auth**: Azure AD B2C with MSAL React.

## Key Features
1. **Multi-Tenancy**: Data isolation at the database level using `tenant_id`.
2. **Super Admin Wizard**: Reusable Tenant Setup wizard for creation and editing.
3. **Tenant Duplication**: Clone full tenant configurations (subscriptions, integrations, mappings).
4. **Secure Impersonation**: Super Admin can impersonate Tenant Admins; Tenant Admins can impersonate Users. Full audit trail.
5. **Form Builder**: Drag-and-drop builder with workflow status/action definitions and section visibility rules.
6. **Integration Mapping**: Per-tenant mapping of internal keys to external ERP/HR systems.

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your Azure B2C credentials.
   ```env
   GEMINI_API_KEY="..."
   APP_URL="http://localhost:3000"
   # Optional: local SQLite path (free, local file)
   DATABASE_PATH="./data/app.db"
   ```

3. **Initialize Local Database (SQLite, free)**:
   ```bash
   npm run db:init
   ```

4. **Run Application**:
   ```bash
   npm run dev
   ```

5. **View Database Contents**:
   ```bash
   npm run db:view
   ```

   Optional interactive query with sqlite3 CLI:
   ```bash
   sqlite3 data/app.db
   .tables
   SELECT * FROM feedback ORDER BY created_at DESC LIMIT 20;
   ```

## Azure Deployment

### 1. Azure SQL Setup
Run the scripts in `/sql/schema.sql` to initialize your database.

### 2. Azure Functions
Deploy the `/api` (or `server.ts` logic) to an Azure Function App. Ensure `NODE_ENV=production` is set.

### 3. Azure App Service
Deploy the React build (`dist/`) to an Azure App Service or Static Web App.

### 4. Azure AD B2C
- Create a B2C tenant.
- Register the application.
- Define App Roles (`super_admin`, `tenant_admin`, `user`).
- Add custom attribute `extension_tenantId`.

## Branding (VIRTUS Theme)
- **Teal**: `#2ED9C3` (Primary)
- **Blue**: `#2A7DE1` (Secondary)
- **Brand Blue**: `#0055B8` (Emphasis)
- **Navy**: `#001689` (Backgrounds)
- **Font**: Montserrat
