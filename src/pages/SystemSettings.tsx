import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Palette, Type, Monitor, Save, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { ThemeConfig, SystemConfig } from '../types';
import { useTheme } from '../contexts/ThemeContext';

export const SystemSettings: React.FC = () => {
  const { refreshTheme } = useTheme();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetch('/api/system/config')
      .then(res => res.json())
      .then(setConfig);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/system/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'System configuration updated successfully' });
        await refreshTheme();
      } else {
        setMessage({ type: 'error', text: 'Failed to update system configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!config) return <div className="p-8">Loading...</div>;

  return (
    <DashboardLayout title="System Settings">
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
            <h2 className="text-lg font-bold text-primary">Global Theme Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Logo URL</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={config.theme.logoUrl || ''}
                    onChange={e => setConfig({ ...config, theme: { ...config.theme, logoUrl: e.target.value } })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
              {config.theme.logoUrl && (
                <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex justify-center">
                  <img src={config.theme.logoUrl} alt="Logo Preview" className="h-8 object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Font Family</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={config.theme.fontFamily || 'Montserrat, sans-serif'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, fontFamily: e.target.value } })}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="Montserrat, sans-serif">Montserrat (Default)</option>
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="system-ui, sans-serif">System UI</option>
                  <option value="'Courier New', Courier, monospace">Monospace</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Primary Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.primaryColor}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, primaryColor: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.primaryColor}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, primaryColor: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Accent Color (Teal)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.accentColor || '#2ED9C3'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, accentColor: e.target.value } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.accentColor || '#2ED9C3'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, accentColor: e.target.value } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Header Color (Deep Blue)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.layoutColors?.header || '#0055B8'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, header: e.target.value } } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.layoutColors?.header || '#0055B8'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, header: e.target.value } } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Left Panel Color (Navy Blue)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.layoutColors?.leftPanel || '#001689'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, leftPanel: e.target.value } } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.layoutColors?.leftPanel || '#001689'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, leftPanel: e.target.value } } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Main Page Background</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.layoutColors?.mainPage || '#f8fafc'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, mainPage: e.target.value } } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.layoutColors?.mainPage || '#f8fafc'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, mainPage: e.target.value } } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Default Font Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={config.theme.layoutColors?.font || '#0f172a'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, font: e.target.value } } })}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.theme.layoutColors?.font || '#0f172a'}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, layoutColors: { ...config.theme.layoutColors, font: e.target.value } } })}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Default Appearance</label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={config.theme.defaultMode}
                  onChange={e => setConfig({ ...config, theme: { ...config.theme, defaultMode: e.target.value as any } })}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                  <option value="system">Follow System</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                id="allowToggle"
                checked={config.theme.allowUserModeToggle}
                onChange={e => setConfig({ ...config, theme: { ...config.theme, allowUserModeToggle: e.target.checked } })}
                className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="allowToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
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
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
