import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { 
  ChevronLeft, 
  Save, 
  Send, 
  Info, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const FormRunner: React.FC<{ templateId: string }> = ({ templateId }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const template = {
    name: 'Hot Work Permit',
    id: 'HWP-2024-001',
    sections: [
      {
        id: 's1',
        title: 'General Information',
        fields: [
          { id: 'f1', type: 'text', label: 'Work Location', placeholder: 'e.g. Tank Farm A', required: true },
          { id: 'f2', type: 'datetime', label: 'Start Date & Time', required: true },
          { id: 'f3', type: 'user-lookup', label: 'Performing Authority', required: true },
        ]
      },
      {
        id: 's2',
        title: 'Hazard Assessment',
        fields: [
          { id: 'f4', type: 'checkbox-group', label: 'Potential Hazards', options: ['Flammable Gas', 'Sparks', 'High Temperature', 'Confined Space'] },
          { id: 'f5', type: 'textarea', label: 'Mitigation Measures', placeholder: 'Describe how hazards will be managed...' },
        ]
      },
      {
        id: 's3',
        title: 'Precautions & PPE',
        fields: [
          { id: 'f6', type: 'multiselect', label: 'Required PPE', options: ['Fire Suit', 'Face Shield', 'Leather Gloves', 'Gas Detector'] },
          { id: 'f7', type: 'file', label: 'Upload Site Photo' },
        ]
      }
    ],
    workflow: {
      currentStep: 'Draft',
      nextSteps: ['Submit for Approval'],
      history: [
        { status: 'Created', user: 'John Doe', time: '2024-03-05 08:00' }
      ]
    }
  };

  const progress = ((currentSection + 1) / template.sections.length) * 100;

  return (
    <DashboardLayout title={`New Submission: ${template.name}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <button className="flex items-center gap-2 text-slate-500 font-bold hover:text-virtus-navy transition-colors">
            <ChevronLeft size={20} />
            Back to Portal
          </button>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-virtus-blue font-bold text-sm hover:bg-virtus-blue/5 rounded-lg transition-colors">
              <Save size={18} />
              Save Draft
            </button>
            <button className="btn-primary flex items-center gap-2 shadow-lg shadow-virtus-teal/20">
              <Send size={18} />
              Submit Permit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-virtus-navy">{template.sections[currentSection].title}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Section {currentSection + 1} of {template.sections.length}</p>
                </div>
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-virtus-teal transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="space-y-6">
                {template.sections[currentSection].fields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <input 
                        type="text" 
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all"
                      />
                    )}

                    {field.type === 'datetime' && (
                      <input 
                        type="datetime-local" 
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all"
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea 
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all"
                      />
                    )}

                    {field.type === 'user-lookup' && (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Search users..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all"
                        />
                      </div>
                    )}

                    {field.type === 'checkbox-group' && (
                      <div className="grid grid-cols-2 gap-3">
                        {field.options?.map(opt => (
                          <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-virtus-teal focus:ring-virtus-teal" />
                            <span className="text-sm font-medium text-slate-600">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'file' && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-virtus-teal transition-colors cursor-pointer bg-slate-50/50">
                        <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-sm font-bold text-slate-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
                  disabled={currentSection === 0}
                  className="px-6 py-2 font-bold text-slate-400 hover:text-virtus-navy disabled:opacity-30 transition-colors"
                >
                  Previous Section
                </button>
                <button 
                  onClick={() => setCurrentSection(s => Math.min(template.sections.length - 1, s + 1))}
                  className="btn-secondary flex items-center gap-2"
                >
                  {currentSection === template.sections.length - 1 ? 'Review Submission' : 'Next Section'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="card bg-virtus-navy text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-virtus-teal" />
                Workflow Status
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-virtus-teal text-virtus-navy flex items-center justify-center font-bold text-xs">1</div>
                  <div>
                    <p className="text-sm font-bold">Drafting</p>
                    <p className="text-[10px] text-white/60 uppercase">Current Step</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">2</div>
                  <div>
                    <p className="text-sm font-bold">Technical Review</p>
                    <p className="text-[10px] text-white/60 uppercase">Next Step</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white">3</div>
                  <div>
                    <p className="text-sm font-bold">Final Approval</p>
                    <p className="text-[10px] text-white/60 uppercase">Terminal Step</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-virtus-navy mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Safety Guidelines
              </h3>
              <ul className="space-y-3">
                {[
                  'Ensure gas testing is completed before start.',
                  'Fire watcher must be present at all times.',
                  'Maintain 10m clearance from flammable materials.'
                ].map((rule, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
