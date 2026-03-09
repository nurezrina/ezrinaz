import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor, LayoutDashboard, Building2, Users, FileText, Settings, LogOut, ChevronRight, Plus, RefreshCw, ShieldCheck, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { navigate } from '../utils/navigation';
import { FeedbackWidget } from './FeedbackWidget';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, actingAs, isImpersonating, isLoading, logout, switchRole } = useAuth();
  const { theme, mode, setMode } = useTheme();

  const navItems = (actingAs?.role === 'super_admin' || actingAs?.role === 'support') ? [
    { label: 'Global Dashboard', icon: LayoutDashboard, path: '/super-admin' },
    { label: 'Tenant Management', icon: Building2, path: '/super-admin/tenants' },
    { label: 'Users', icon: Users, path: '/super-admin/users' },
    { label: 'System Settings', icon: Settings, path: '/super-admin/settings' },
  ] : (actingAs?.role === 'tenant_admin' || actingAs?.role === 'support_focal') ? [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/tenant-admin' },
    { label: 'Templates', icon: FileText, path: '/tenant-admin/templates' },
    { label: 'Users', icon: Users, path: '/tenant-admin/users' },
    { label: 'Settings', icon: Settings, path: '/tenant-admin/settings' },
  ] : [
    { label: 'HSE Portal', icon: LayoutDashboard, path: '/app' },
    { label: 'Tasks', icon: CheckSquare, path: '/app/tasks' },
    { label: 'New Permit', icon: Plus, path: '/app/forms/new' },
    { label: 'My Submissions', icon: FileText, path: '/app/submissions' },
  ];

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  const currentEffectiveRole = actingAs?.role || user?.role;

  return (
    <div className="flex h-screen bg-layout-main">
      {/* Sidebar */}
      <aside className="w-64 bg-layout-panel text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          {theme?.logoUrl ? (
            <img src={theme.logoUrl} alt="Logo" className="h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <>
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-primary font-bold">V</div>
              <span className="text-xl font-bold tracking-tight">VIRTUS</span>
            </>
          )}
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.path}
              onClick={(e) => handleNavigate(e, item.path)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors group"
            >
              <item.icon size={20} className="text-accent group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        {theme?.allowUserModeToggle && (
          <div className="px-6 py-4 border-t border-white/10">
            <div className="flex bg-black/20 p-1 rounded-lg">
              <button 
                onClick={() => setMode('light')}
                className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${mode === 'light' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                title="Light Mode"
              >
                <Sun size={16} />
              </button>
              <button 
                onClick={() => setMode('dark')}
                className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${mode === 'dark' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                title="Dark Mode"
              >
                <Moon size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-virtus-blue flex items-center justify-center font-bold relative">
              {actingAs?.displayName?.[0] || actingAs?.actingAsDisplayName?.[0] || user?.displayName?.[0] || 'U'}
              {(actingAs?.role === 'super_admin' || actingAs?.role === 'support' || actingAs?.realUserRole === 'super_admin' || actingAs?.realUserRole === 'support' || user?.role === 'super_admin' || user?.role === 'support') && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-virtus-navy">
                  <ShieldCheck size={10} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{actingAs?.displayName || actingAs?.actingAsDisplayName || user?.displayName}</p>
              <p className="text-xs text-white/60 truncate capitalize">{(actingAs?.role || actingAs?.actingAsRole || user?.role || 'user').replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors mt-2"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-layout-header border-b border-white/10 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            
            {/* View Switcher for Tenant Admin */}
            {(user?.role === 'tenant_admin' || 
              actingAs?.actingAsRole === 'tenant_admin' || 
              actingAs?.targetBaseRole === 'tenant_admin' ||
              actingAs?.realUserRole === 'tenant_admin') && (
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                <button 
                  onClick={() => currentEffectiveRole !== 'tenant_admin' && switchRole('tenant_admin')}
                  disabled={isLoading}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentEffectiveRole === 'tenant_admin' 
                      ? 'bg-white text-virtus-navy shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentEffectiveRole === 'tenant_admin' && <div className="w-1.5 h-1.5 rounded-full bg-virtus-teal animate-pulse" />}
                  Admin View
                </button>
                <button 
                  onClick={() => currentEffectiveRole !== 'user' && switchRole('user')}
                  disabled={isLoading}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 flex items-center gap-2 ${
                    currentEffectiveRole === 'user' 
                      ? 'bg-white text-virtus-navy shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentEffectiveRole === 'user' && <div className="w-1.5 h-1.5 rounded-full bg-virtus-teal animate-pulse" />}
                  User View
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {actingAs?.tenantId && (
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Tenant: {actingAs.tenantId}
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
      <FeedbackWidget />
    </div>
  );
};
