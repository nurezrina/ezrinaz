import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SystemSettings } from './pages/SystemSettings';
import { TenantSettings } from './pages/TenantSettings';
import { SuperAdminTenants } from './pages/SuperAdminTenants';
import { TenantSetupWizard } from './pages/TenantSetupWizard';
import { TemplateLibrary } from './pages/TemplateLibrary';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { UserPortal } from './pages/UserPortal';
import { FormRunner } from './pages/FormRunner';
import { SubmissionList } from './pages/SubmissionList';
import { UserManagement } from './pages/UserManagement';
import { TasksPage } from './pages/TasksPage';
import { LoginPage } from './pages/LoginPage';
import { ImpersonationBanner } from './components/ImpersonationBanner';

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
    const role = actingAs?.role;

    if (role === 'super_admin' || role === 'support') {
      if (path.startsWith('/super-admin/tenants/new')) return <TenantSetupWizard />;
      if (path.startsWith('/super-admin/tenants/edit')) return <TenantSetupWizard tenantId="demo" />;
      if (path.startsWith('/super-admin/tenants')) return <SuperAdminTenants />;
      if (path.startsWith('/super-admin/users')) return <UserManagement />;
      if (path.startsWith('/super-admin/settings')) return <SystemSettings />;
      return <SuperAdminDashboard />;
    }

    if (role === 'tenant_admin' || role === 'support_focal') {
      if (path.startsWith('/tenant-admin/templates/new')) return <TemplateBuilder />;
      if (path.startsWith('/tenant-admin/templates')) return <TemplateLibrary />;
      if (path.startsWith('/tenant-admin/users')) return <UserManagement />;
      if (path.startsWith('/tenant-admin/settings')) return <TenantSettings />;
      return <TemplateLibrary />; // Default for tenant_admin
    }

    if (role === 'user') {
      if (path.startsWith('/app/tasks')) return <TasksPage />;
      if (path.startsWith('/app/forms/new')) return <FormRunner templateId="demo" />;
      if (path.startsWith('/app/submissions')) return <SubmissionList />;
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
      {renderRoute()}
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
