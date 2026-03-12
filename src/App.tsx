import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SystemSettings } from './pages/SystemSettings';
import { TenantSettings } from './pages/TenantSettings';
import { SuperAdminTenants } from './pages/SuperAdminTenants';
import { TenantSetupWizard } from './pages/TenantSetupWizard';
import { UserPortal } from './pages/UserPortal';
import { FormRunner } from './pages/FormRunner';
import { SubmissionList } from './pages/SubmissionList';
import { UserManagement } from './pages/UserManagement';
import { LoginPage } from './pages/LoginPage';
import { ImpersonationBanner } from './components/ImpersonationBanner';

const TemplateLibrary = lazy(() => import('./pages/TemplateLibrary').then((m) => ({ default: m.TemplateLibrary })));
const TemplateBuilder = lazy(() => import('./pages/TemplateBuilder').then((m) => ({ default: m.TemplateBuilder })));
const TenantFormBuilderPage = lazy(() => import('./pages/TenantFormBuilderPage').then((m) => ({ default: m.TenantFormBuilderPage })));
const TenantWorkflowEnginePage = lazy(() => import('./pages/TenantWorkflowEnginePage').then((m) => ({ default: m.TenantWorkflowEnginePage })));
const TenantRolesManagementPage = lazy(() => import('./pages/TenantRolesManagementPage').then((m) => ({ default: m.TenantRolesManagementPage })));
const TenantDataManagementPage = lazy(() => import('./pages/TenantDataManagementPage').then((m) => ({ default: m.TenantDataManagementPage })));
const TenantUserManagementPage = lazy(() => import('./pages/TenantUserManagementPage').then((m) => ({ default: m.TenantUserManagementPage })));

function AppContent() {
  const { user, actingAs, isLoading } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    // Custom event for internal navigation
    window.addEventListener('app-navigate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('app-navigate', handleLocationChange);
    };
  }, []);

  // Simple router
  const renderRoute = () => {
    if (path.startsWith('/app/tasks')) return <UserPortal initialTab="tasks" />;
    if (path.startsWith('/app/modules')) return <UserPortal initialTab="modules" />;
    if (path.startsWith('/app/forms/new')) return <FormRunner templateId="ptw-example" />;
    const formRunnerMatch = path.match(/^\/app\/forms\/([^/]+)$/);
    if (formRunnerMatch) return <FormRunner templateId={decodeURIComponent(formRunnerMatch[1])} />;
    if (path.startsWith('/app/submissions')) return <SubmissionList />;
    if (path === '/app') return <UserPortal />;

    const role =
      actingAs?.actingAsRole ||
      actingAs?.targetBaseRole ||
      actingAs?.role ||
      user?.role;

    if (role === 'super_admin' || role === 'support') {
      if (path.startsWith('/super-admin/tenants/new')) return <TenantSetupWizard />;
      if (path.startsWith('/super-admin/tenants/edit')) return <TenantSetupWizard tenantId="demo" />;
      if (path.startsWith('/super-admin/tenants')) return <SuperAdminTenants />;
      if (path.startsWith('/super-admin/users')) return <UserManagement />;
      if (path.startsWith('/super-admin/settings')) return <SystemSettings />;
      return <SuperAdminDashboard />;
    }

    if (role === 'tenant_admin' || role === 'support_focal') {
      if (path.startsWith('/tenant-admin/form-builder') && role !== 'tenant_admin') return <UserPortal />;
      if (path === '/tenant-admin/form-builder') return <TenantFormBuilderPage />;
      if (path === '/tenant-admin/form-builder/new') return <TenantFormBuilderPage />;
      if (/^\/tenant-admin\/form-builder\/[^/]+$/.test(path)) return <TenantFormBuilderPage />;
      if (path.startsWith('/tenant-admin/form-builder')) return <TenantFormBuilderPage />;
      if (path.startsWith('/tenant-admin/workflow-engine')) return <TenantWorkflowEnginePage />;
      if (path.startsWith('/tenant-admin/roles-management')) return <TenantRolesManagementPage />;
      if (path.startsWith('/tenant-admin/data-management')) return <TenantDataManagementPage />;
      if (path.startsWith('/tenant-admin/user-management')) return <TenantUserManagementPage />;
      if (path.startsWith('/tenant-admin/templates/new')) return <TemplateBuilder />;
      if (path.startsWith('/tenant-admin/templates')) return <TemplateLibrary />;
      if (path.startsWith('/tenant-admin/users')) return <UserManagement />;
      if (path.startsWith('/tenant-admin/settings')) return <TenantSettings />;
      return <TenantFormBuilderPage />;
    }

    if (role === 'user') {
      return <UserPortal />;
    }
    
    // Default fallback
    return <UserPortal />;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-virtus-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-virtus-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 font-bold text-xs uppercase tracking-widest">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <ImpersonationBanner />
      <Suspense
        fallback={
          <div className="h-[calc(100vh-48px)] flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-virtus-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading page...</p>
            </div>
          </div>
        }
      >
        {renderRoute()}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
