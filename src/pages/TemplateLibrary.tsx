import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Plus, Search, Filter, MoreVertical, Play, Eye, Copy, Trash2, Globe, Edit3 } from 'lucide-react';

export const TemplateLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('published');

  const templates = [
    { id: '1', name: 'Hot Work Permit', feature: 'Permit-to-Work', version: 4, status: 'published', lastModified: '2024-03-01' },
    { id: '2', name: 'Confined Space Entry', feature: 'Permit-to-Work', version: 2, status: 'published', lastModified: '2024-02-15' },
    { id: '3', name: 'Excavation Permit', feature: 'Permit-to-Work', version: 1, status: 'draft', lastModified: '2024-03-04' },
  ];

  return (
    <DashboardLayout title="Template Library">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
          {['published', 'draft', 'retired'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-virtus-teal text-virtus-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search templates..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal w-64"
            />
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Create Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.filter(t => t.status === activeTab).map(template => (
          <div key={template.id} className="card group hover:border-virtus-teal transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg text-virtus-blue">
                <Globe size={20} />
              </div>
              <button className="p-1 text-slate-300 hover:text-slate-600">
                <MoreVertical size={18} />
              </button>
            </div>
            <h3 className="font-bold text-virtus-navy mb-1">{template.name}</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">{template.feature}</p>
            
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6">
              <span>v{template.version}</span>
              <span>Modified {template.lastModified}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors">
                <Eye size={14} />
                Preview
              </button>
              <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-virtus-blue/10 text-virtus-blue font-bold text-xs hover:bg-virtus-blue/20 transition-colors">
                <Edit3 size={14} />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};
