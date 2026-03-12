import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { ShieldCheck, UserPlus, Search, Bell, Settings, Eye, PencilLine, MessageSquare } from 'lucide-react';
import {
  DEFAULT_TENANT_ROLE_PERMISSION_CONFIG,
  type PermissionSectionKey,
  type TenantPermissionDefinition,
} from '../types/workflowFormContracts';

type RoleKey = string;

type ToastState = { type: 'success' | 'error'; message: string } | null;

const PERMISSIONS = DEFAULT_TENANT_ROLE_PERMISSION_CONFIG.permissions;
const ROLE_TEMPLATES = DEFAULT_TENANT_ROLE_PERMISSION_CONFIG.roleTemplates;
const ROLE_CONFIGS = Object.fromEntries(
  ROLE_TEMPLATES.map((roleTemplate) => [
    roleTemplate.key,
    {
      name: roleTemplate.name,
      badge: roleTemplate.badge,
      defaults: roleTemplate.permissions,
    },
  ])
) as Record<RoleKey, { name: string; badge: string; defaults: Record<string, boolean> }>;

const SECTION_LABELS: Record<PermissionSectionKey, string> = {
  form: 'Form Management',
  data: 'Data & Responses',
  security: 'Security & Team',
};

const ROLE_ICONS: Record<RoleKey, React.ReactNode> = {
  admin: <ShieldCheck size={14} />,
  editor: <PencilLine size={14} />,
  reviewer: <MessageSquare size={14} />,
  viewer: <Eye size={14} />,
};

export const TenantRolesManagementPage: React.FC = () => {
  const [activeRole, setActiveRole] = useState<RoleKey>(ROLE_TEMPLATES[0]?.key || 'admin');
  const [search, setSearch] = useState('');
  const [permissionsByRole, setPermissionsByRole] = useState<Record<RoleKey, Record<string, boolean>>>(
    Object.fromEntries(ROLE_TEMPLATES.map((roleTemplate) => [roleTemplate.key, { ...roleTemplate.permissions }])) as Record<RoleKey, Record<string, boolean>>
  );
  const [draftPermissions, setDraftPermissions] = useState<Record<string, boolean>>({ ...(ROLE_TEMPLATES[0]?.permissions || {}) });
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    setDraftPermissions({ ...permissionsByRole[activeRole] });
    setIsDirty(false);
  }, [activeRole, permissionsByRole]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const sectionedPermissions = useMemo(
    () => ({
      form: PERMISSIONS.filter((permission: TenantPermissionDefinition) => permission.section === 'form'),
      data: PERMISSIONS.filter((permission: TenantPermissionDefinition) => permission.section === 'data'),
      security: PERMISSIONS.filter((permission: TenantPermissionDefinition) => permission.section === 'security'),
    }),
    []
  );

  const togglePermission = (id: string) => {
    setDraftPermissions((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setIsDirty(true);
      return next;
    });
  };

  const discardChanges = () => {
    setDraftPermissions({ ...permissionsByRole[activeRole] });
    setIsDirty(false);
    setToast({ type: 'success', message: 'Changes discarded.' });
  };

  const saveChanges = async () => {
    setPermissionsByRole((prev) => ({ ...prev, [activeRole]: { ...draftPermissions } }));
    setIsDirty(false);
    setToast({ type: 'success', message: `${ROLE_CONFIGS[activeRole].name} permissions saved.` });
  };

  return (
    <DashboardLayout title="Roles Management">
      <div className="space-y-4">
        {toast ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-virtus-teal/40 bg-virtus-teal/10 text-virtus-navy'}`}>
            {toast.message}
          </div>
        ) : null}

        <div className="card p-4 lg:p-5 overflow-hidden">
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-virtus-navy">Roles & Permissions</h1>
                  <p className="text-sm text-slate-500">Manage global access levels and user roles for form builder assets.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search team members..."
                      className="w-56 pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                    />
                  </div>
                  <button className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Bell size={16} /></button>
                  <button className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Settings size={16} /></button>
                  <button className="px-4 py-2 rounded-lg bg-virtus-blue text-white font-bold text-sm flex items-center gap-2 shadow hover:opacity-90">
                    <UserPlus size={15} /> Invite Team Member
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-200 mb-4 overflow-x-auto">
                <div className="flex gap-6 min-w-max">
                  {Object.keys(ROLE_CONFIGS).map((role) => (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 ${activeRole === role ? 'text-virtus-blue border-virtus-blue' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                      {ROLE_ICONS[role] || <ShieldCheck size={14} />}
                      {ROLE_CONFIGS[role].name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">Permission Matrix: {ROLE_CONFIGS[activeRole].name}</h2>
                  <span className="text-[11px] font-bold text-virtus-blue bg-virtus-blue/10 px-2 py-1 rounded">{ROLE_CONFIGS[activeRole].badge}</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {(Object.keys(sectionedPermissions) as PermissionSectionKey[]).map((sectionKey) => (
                    <div key={sectionKey} className="p-4 lg:p-5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{SECTION_LABELS[sectionKey]}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sectionedPermissions[sectionKey].map((permission) => (
                          <label key={permission.id} className="border border-slate-200 rounded-lg p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50 cursor-pointer">
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{permission.label}</p>
                              <p className="text-xs text-slate-500">{permission.note}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(draftPermissions[permission.id])}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 rounded border-slate-300 text-virtus-blue"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 lg:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    onClick={discardChanges}
                    disabled={!isDirty}
                    className={`px-4 py-2 text-sm font-bold rounded-lg border ${isDirty ? 'border-slate-200 text-slate-700 hover:bg-slate-100' : 'border-slate-100 text-slate-300 cursor-not-allowed'}`}
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={!isDirty}
                    className={`px-5 py-2 rounded-lg text-sm font-bold ${isDirty ? 'bg-virtus-blue text-white hover:opacity-90' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    Save Changes
                  </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
