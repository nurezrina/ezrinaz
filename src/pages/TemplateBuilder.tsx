import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Layout, Type, List, CheckSquare, Calendar, FileText, GripVertical, Settings2, Eye, Save, Send, Trash2 } from 'lucide-react';
import { motion, Reorder } from 'motion/react';

export const TemplateBuilder: React.FC = () => {
  const [sections, setSections] = useState([
    { id: 's1', title: 'General Information', fields: [
      { id: 'f1', type: 'text', label: 'Permit Number', required: true },
      { id: 'f2', type: 'date', label: 'Issue Date', required: true }
    ]},
    { id: 's2', title: 'Work Scope', fields: [
      { id: 'f3', type: 'textarea', label: 'Description of Work' }
    ]}
  ]);

  const fieldTypes = [
    { type: 'text', icon: Type, label: 'Text Input' },
    { type: 'textarea', icon: FileText, label: 'Text Area' },
    { type: 'dropdown', icon: List, label: 'Dropdown' },
    { type: 'checkbox', icon: CheckSquare, label: 'Checkbox' },
    { type: 'date', icon: Calendar, label: 'Date Picker' },
  ];

  return (
    <DashboardLayout title="Form Template Builder">
      <div className="flex h-[calc(100vh-12rem)] gap-8">
        {/* Toolbox */}
        <aside className="w-72 flex flex-col gap-6">
          <div className="card">
            <h3 className="font-bold text-virtus-navy mb-4 text-sm uppercase tracking-wider">Field Types</h3>
            <div className="space-y-2">
              {fieldTypes.map(ft => (
                <div key={ft.type} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-virtus-teal hover:bg-virtus-teal/5 cursor-move transition-all group">
                  <ft.icon size={18} className="text-slate-400 group-hover:text-virtus-teal" />
                  <span className="text-sm font-medium text-slate-600">{ft.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card flex-1">
            <h3 className="font-bold text-virtus-navy mb-4 text-sm uppercase tracking-wider">Workflow Designer</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { id: 'w1', label: 'Initial Submission', type: 'start' },
                  { id: 'w2', label: 'Technical Review', type: 'step' },
                  { id: 'w3', label: 'Safety Approval', type: 'step' },
                  { id: 'w4', label: 'Closed', type: 'end' }
                ].map((step, i) => (
                  <div key={step.id} className="relative">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 group hover:border-virtus-teal transition-all">
                      <div className={`w-2 h-2 rounded-full ${
                        step.type === 'start' ? 'bg-emerald-500' : 
                        step.type === 'end' ? 'bg-slate-800' : 'bg-virtus-blue'
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{step.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">{step.type}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-virtus-blue transition-all">
                        <Settings2 size={14} />
                      </button>
                    </div>
                    {i < 3 && (
                      <div className="flex justify-center my-1">
                        <div className="w-0.5 h-4 bg-slate-200" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="w-full py-2 bg-virtus-blue/10 text-virtus-blue font-bold text-xs rounded-lg hover:bg-virtus-blue/20 transition-colors mt-4">
                + Add Workflow Step
              </button>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input 
                type="text" 
                defaultValue="Hot Work Permit v4" 
                className="text-2xl font-bold text-virtus-navy bg-transparent border-b-2 border-transparent focus:border-virtus-teal outline-none px-1"
              />
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Published</span>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">
                <Eye size={18} />
                Preview
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-virtus-blue font-bold text-sm hover:bg-virtus-blue/5 rounded-lg transition-colors">
                <Save size={18} />
                Save Draft
              </button>
              <button className="btn-primary flex items-center gap-2">
                <Send size={18} />
                Publish
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-6">
            <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-6">
              {sections.map(section => (
                <Reorder.Item key={section.id} value={section}>
                  <div className="card group relative">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                      <GripVertical size={20} className="text-slate-300" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-6">
                      <input 
                        type="text" 
                        value={section.title} 
                        onChange={() => {}} 
                        className="font-bold text-lg text-virtus-navy bg-transparent outline-none border-b border-transparent focus:border-slate-200"
                      />
                      <button className="p-2 text-slate-300 hover:text-slate-600">
                        <Settings2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {section.fields.map(field => (
                        <div key={field.id} className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-slate-400 border border-slate-100">
                              {field.type === 'text' ? <Type size={16} /> : <Calendar size={16} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700">{field.label}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{field.type} {field.required && '• Required'}</p>
                            </div>
                          </div>
                          <button className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button className="w-full py-3 border-2 border-dashed border-slate-100 rounded-lg text-slate-400 text-sm font-medium hover:border-virtus-teal hover:text-virtus-teal transition-all">
                        + Add Field
                      </button>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            
            <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:bg-slate-50 transition-colors">
              + Add New Section
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
