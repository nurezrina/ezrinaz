import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Palette, Image as ImageIcon, Monitor, Save, RefreshCw } from 'lucide-react';
import { ThemeConfig, Tenant } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export const TenantSettings: React.FC = () => {
  const { actingAs, user } = useAuth();
  const { refreshTheme } = useTheme();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const tenantId = actingAs?.actingAsTenantId || user?.tenantId;

  useEffect(() => {
    if (tenantId) {
      fetch(`/api/tenants/${tenantId}`)
        .then(res => res.json())
        .then(setTenant);
    }
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenant || !tenantId) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ themeConfig: tenant.themeConfig })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Tenant theme updated successfully' });
        await refreshTheme();
      } else {
        setMessage({ type: 'error', text: 'Failed to update tenant theme' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tenant) return <div className="p-8">Loading...</div>;

  const themeConfig = tenant.themeConfig || {
    primaryColor: '#001689',
    defaultMode: 'light',
    allowUserModeToggle: true
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTenant({
      ...tenant,
      themeConfig: { ...themeConfig, ...updates }
    });
  };

  return (
    <DashboardLayout title="Tenant Settings">
      <div className="max-w-4xl space-y-8">
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <RefreshCw size={18} /> : <Save size={18} />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="card space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Palette className="text-primary" size={24} />
            <h2 className="text-lg font-bold text-primary">Tenant Branding</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Tenant Logo URL</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={themeConfig.logoUrl || ''}
                    onChange={e => updateTheme({ logoUrl: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Leave empty to use system logo"
                  />
                </div>
              </div>
              {themeConfig.logoUrl && (
                <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex justify-center">
                  <img src={themeConfig.logoUrl} alt="Logo Preview" className="h-8 object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeConfig.primaryColor}
                  onChange={e => updateTheme({ primaryColor: e.target.value })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeConfig.primaryColor}
                  onChange={e => updateTheme({ primaryColor: e.target.value })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Header Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeConfig.layoutColors?.header || '#0055B8'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, header: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeConfig.layoutColors?.header || '#0055B8'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, header: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Left Panel Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeConfig.layoutColors?.leftPanel || '#001689'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, leftPanel: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeConfig.layoutColors?.leftPanel || '#001689'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, leftPanel: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Main Page Background</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeConfig.layoutColors?.mainPage || '#f8fafc'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, mainPage: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeConfig.layoutColors?.mainPage || '#f8fafc'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, mainPage: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Font Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={themeConfig.layoutColors?.font || '#0f172a'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, font: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={themeConfig.layoutColors?.font || '#0f172a'}
                  onChange={e => updateTheme({ layoutColors: { ...themeConfig.layoutColors, font: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="col-span-full space-y-4">
              <label className="text-sm font-bold text-slate-700">Graph Colors (Up to 5)</label>
              <div className="flex flex-wrap gap-4">
                {[0, 1, 2, 3, 4].map(idx => (
                  <div key={idx} className="flex flex-col gap-2">
                    <input
                      type="color"
                      value={themeConfig.graphColors?.[idx] || '#cbd5e1'}
                      onChange={e => {
                        const newColors = [...(themeConfig.graphColors || [])];
                        newColors[idx] = e.target.value;
                        updateTheme({ graphColors: newColors });
                      }}
                      className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="text-[10px] text-center font-bold text-slate-400">Color {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                id="allowToggleTenant"
                checked={themeConfig.allowUserModeToggle}
                onChange={e => updateTheme({ allowUserModeToggle: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="allowToggleTenant" className="text-sm font-bold text-slate-700 cursor-pointer">
                Allow users to toggle light/dark mode
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              Save Branding
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
