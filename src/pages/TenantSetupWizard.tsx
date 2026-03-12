import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Check, ChevronRight, Building2, Layers, Globe, Shield, Palette, Mail, Save, Image as ImageIcon, Monitor } from 'lucide-react';
import { CatalogDomain, ThemeConfig } from '../types';
import { navigate } from '../utils/navigation';

const STEPS = [
  { id: 'company', label: 'Company Info', icon: Building2 },
  { id: 'subscription', label: 'Subscriptions', icon: Layers },
  { id: 'integration', label: 'Integrations', icon: Globe },
  { id: 'auth', label: 'Authentication', icon: Shield },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'admin', label: 'Invite Admin', icon: Mail },
  { id: 'review', label: 'Review', icon: Check },
];

export const TenantSetupWizard: React.FC<{ tenantId?: string }> = ({ tenantId }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [catalog, setCatalog] = useState<CatalogDomain[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    subscriptions: [] as string[],
    themeConfig: {
      logoUrl: '',
      primaryColor: '#001689',
      accentColor: '#2ED9C3',
      defaultMode: 'light' as 'light' | 'dark' | 'system',
      allowUserModeToggle: true,
      layoutColors: {
        header: '#0055B8',
        leftPanel: '#001689',
        mainPage: '#f8fafc',
        font: '#0f172a'
      },
      graphColors: ['#2ED9C3', '#2A7DE1', '#0055B8', '#001689', '#64748b']
    }
  });

  useEffect(() => {
    fetch('/api/v1/catalog').then(res => res.json()).then(data => setCatalog(data.domains));
    
    if (tenantId) {
      fetch(`/api/v1/tenants/${tenantId}`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            name: data.name,
            industry: 'Oil & Gas', // Mock
            subscriptions: [], // Mock
            themeConfig: data.themeConfig || {
              logoUrl: '',
              primaryColor: '#001689',
              accentColor: '#2ED9C3',
              defaultMode: 'light',
              allowUserModeToggle: true
            }
          });
        });
    }
  }, [tenantId]);

  const handleComplete = async () => {
    if (tenantId) {
      // Update existing
      await fetch(`/api/v1/tenants/${tenantId}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeConfig: formData.themeConfig })
      });
    }
    navigate('/super-admin/tenants');
  };

  const next = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setCurrentStep(s => Math.max(s - 1, 0));

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'company':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Company Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                placeholder="e.g. Acme Corporation"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Industry</label>
              <select className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none">
                <option>Oil & Gas</option>
                <option>Construction</option>
                <option>Manufacturing</option>
              </select>
            </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="space-y-8">
            {catalog.map(domain => (
              <div key={domain.id}>
                <h3 className="font-bold text-virtus-navy mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-virtus-teal rounded-full" />
                  {domain.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domain.modules.map(module => (
                    <div key={module.id} className="card p-4 border-slate-100 bg-slate-50/30">
                      <div className="mb-3">
                        <p className="font-bold text-sm text-virtus-navy">{module.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">{module.description}</p>
                      </div>
                      <div className="space-y-2">
                        {module.features.map(feature => (
                          <label key={feature.id} className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-virtus-teal focus:ring-virtus-teal" />
                            <div className="flex-1">
                              <p className="text-sm text-slate-600 group-hover:text-virtus-navy transition-colors">{feature.name}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{feature.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      case 'branding':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Logo URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.themeConfig.logoUrl}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, logoUrl: e.target.value } })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Primary Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.primaryColor}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, primaryColor: e.target.value } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.primaryColor}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, primaryColor: e.target.value } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Accent Color (Teal)</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.accentColor}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, accentColor: e.target.value } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.accentColor}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, accentColor: e.target.value } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Header Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.layoutColors?.header || '#0055B8'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, header: e.target.value } } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.layoutColors?.header || '#0055B8'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, header: e.target.value } } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Left Panel Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.layoutColors?.leftPanel || '#001689'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, leftPanel: e.target.value } } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.layoutColors?.leftPanel || '#001689'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, leftPanel: e.target.value } } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Main Page Background</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.layoutColors?.mainPage || '#f8fafc'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, mainPage: e.target.value } } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.layoutColors?.mainPage || '#f8fafc'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, mainPage: e.target.value } } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Font Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.themeConfig.layoutColors?.font || '#0f172a'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, font: e.target.value } } })}
                    className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.themeConfig.layoutColors?.font || '#0f172a'}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, layoutColors: { ...formData.themeConfig.layoutColors, font: e.target.value } } })}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Default Appearance</label>
                <div className="relative">
                  <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={formData.themeConfig.defaultMode}
                    onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, defaultMode: e.target.value as any } })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none appearance-none"
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">Follow System</option>
                  </select>
                </div>
              </div>

              <div className="col-span-full space-y-4">
                <label className="text-sm font-bold text-slate-700">Graph Colors (Up to 5)</label>
                <div className="flex flex-wrap gap-4">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div key={idx} className="flex flex-col gap-2">
                      <input
                        type="color"
                        value={formData.themeConfig.graphColors?.[idx] || '#cbd5e1'}
                        onChange={e => {
                          const newColors = [...(formData.themeConfig.graphColors || [])];
                          newColors[idx] = e.target.value;
                          setFormData({ ...formData, themeConfig: { ...formData.themeConfig, graphColors: newColors } });
                        }}
                        className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                      />
                      <span className="text-[10px] text-center font-bold text-slate-400">Color {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="allowToggleWizard"
                  checked={formData.themeConfig.allowUserModeToggle}
                  onChange={e => setFormData({ ...formData, themeConfig: { ...formData.themeConfig, allowUserModeToggle: e.target.checked } })}
                  className="w-5 h-5 rounded border-slate-300 text-virtus-teal focus:ring-virtus-teal"
                />
                <label htmlFor="allowToggleWizard" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Allow users to toggle light/dark mode
                </label>
              </div>
            </div>

            {formData.themeConfig.logoUrl && (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Logo Preview</p>
                <div className="flex justify-center">
                  <img src={formData.themeConfig.logoUrl} alt="Preview" className="h-12 object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <div className="py-20 text-center text-slate-400">Step content for {STEPS[currentStep].label}</div>;
    }
  };

  return (
    <DashboardLayout title={tenantId ? 'Edit Tenant Setup' : 'New Tenant Setup'}>
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  idx <= currentStep ? 'bg-virtus-teal text-virtus-navy shadow-lg shadow-virtus-teal/20' : 'bg-slate-200 text-slate-400'
                }`}>
                  <step.icon size={20} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  idx <= currentStep ? 'text-virtus-navy' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-200 rounded-full relative">
            <div 
              className="h-full bg-virtus-teal transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="card min-h-[400px] flex flex-col">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-virtus-navy mb-8">{STEPS[currentStep].label}</h2>
                {renderStep()}
              </div>
              
              <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={prev}
                  disabled={currentStep === 0}
                  className="px-6 py-2 font-bold text-slate-400 hover:text-virtus-navy disabled:opacity-30 transition-colors"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button className="px-6 py-2 font-bold text-virtus-blue hover:bg-virtus-blue/5 rounded-lg transition-colors flex items-center gap-2">
                    <Save size={18} />
                    Save as Draft
                  </button>
                  <button 
                    onClick={currentStep === STEPS.length - 1 ? handleComplete : next}
                    className="btn-primary flex items-center gap-2"
                  >
                    {currentStep === STEPS.length - 1 ? 'Complete Setup' : 'Next Step'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card bg-slate-50 border-none">
              <h3 className="font-bold text-virtus-navy mb-4">Setup Summary</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Company</p>
                  <p className="font-bold text-slate-700">{formData.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Subscribed Features</p>
                  <p className="font-bold text-slate-700">{formData.subscriptions.length} selected</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 italic">You can revisit any step before final submission.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
