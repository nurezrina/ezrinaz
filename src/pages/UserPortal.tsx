import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { FileText, Clock, CheckCircle2, AlertCircle, ChevronRight, Search, Filter, Shield, Briefcase, Truck, HardHat, ClipboardCheck, Activity, Zap, Users, Lightbulb, Settings, GripVertical, Eye, EyeOff } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { navigate } from '../utils/navigation';
import { CatalogDomain } from '../types';
import { fetchWithAuth } from '../utils/api';

export const UserPortal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [domains, setDomains] = useState<CatalogDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  const defaultWidgets = [
    { id: 'activity', label: 'My Activity', visible: true },
    { id: 'submissions', label: 'Recent Submissions', visible: true },
    { id: 'help', label: 'Need Help?', visible: true },
    { id: 'kpis', label: 'KPIs', visible: true }
  ];

  const [widgets, setWidgets] = useState(defaultWidgets);

  useEffect(() => {
    fetchWithAuth('/api/catalog')
      .then(data => {
        if (data.domains && Array.isArray(data.domains)) {
          setDomains(data.domains);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch catalog", err);
        setIsLoading(false);
      });

    // Load custom layout
    fetchWithAuth('/api/dashboard/layout')
      .then(data => {
        if (data.layoutJson) {
          try {
            const parsed = JSON.parse(data.layoutJson);
            if (Array.isArray(parsed)) {
              setWidgets(parsed);
            }
          } catch (e) {
            console.error("Failed to parse layout JSON", e);
          }
        }
      })
      .catch(err => {
        console.error("Failed to fetch dashboard layout", err);
      });
  }, []);

  const saveLayout = async (newWidgets: any) => {
    if (!Array.isArray(newWidgets)) return;
    setWidgets(newWidgets);
    try {
      await fetchWithAuth('/api/dashboard/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutJson: JSON.stringify(newWidgets) })
      });
    } catch (err) {
      console.error("Failed to save dashboard layout", err);
    }
  };

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    saveLayout(newWidgets);
  };

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'ptw': return <Shield className="text-virtus-teal" />;
      case 'passport': return <Users className="text-virtus-blue" />;
      case 'bbs': return <Activity className="text-amber-500" />;
      case 'occ-safety': return <HardHat className="text-orange-500" />;
      case 'gov': return <ClipboardCheck className="text-indigo-500" />;
      case 'barrier': return <Zap className="text-yellow-500" />;
      case 'task-mgmt': return <Briefcase className="text-virtus-teal" />;
      case 'logbook': return <FileText className="text-virtus-blue" />;
      case 'manning': return <Users className="text-emerald-500" />;
      case 'innovation': return <Lightbulb className="text-amber-400" />;
      case 'transport': return <Truck className="text-virtus-teal" />;
      case 'lodging': return <Clock className="text-virtus-blue" />;
      case 'pob': return <Users className="text-slate-500" />;
      default: return <FileText className="text-slate-400" />;
    }
  };

  const recentSubmissions = [
    { id: 'SUB-001', template: 'Hot Work Permit', status: 'Pending Approval', date: '2024-03-04', color: 'text-amber-500' },
    { id: 'SUB-002', template: 'Cold Work Permit', status: 'Approved', date: '2024-03-02', color: 'text-emerald-500' },
    { id: 'SUB-003', template: 'WAH Certificate', status: 'Draft', date: '2024-03-01', color: 'text-slate-400' },
  ];

  const renderWidget = (id: string) => {
    switch (id) {
      case 'activity':
        return (
          <div className="card bg-virtus-navy text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-virtus-teal/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="font-bold mb-4 relative z-10" style={{ color: 'white' }}>My Activity</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/10 p-3 rounded-lg">
                <p className="text-2xl font-bold">12</p>
                <p className="text-[10px] uppercase font-bold text-white/60">Submitted</p>
              </div>
              <div className="bg-white/10 p-3 rounded-lg">
                <p className="text-2xl font-bold">3</p>
                <p className="text-[10px] uppercase font-bold text-white/60">Pending</p>
              </div>
            </div>
          </div>
        );
      case 'submissions':
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-virtus-navy">Recent Submissions</h3>
              <button 
                onClick={() => navigate('/app/submissions')}
                className="text-xs font-bold text-virtus-blue hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentSubmissions.map(sub => (
                <div 
                  key={sub.id} 
                  onClick={() => navigate('/app/submissions')}
                  className="flex items-start gap-3 group cursor-pointer"
                >
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${sub.color.replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-virtus-blue transition-colors">{sub.template}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{sub.id}</span>
                      <span className="text-[10px] font-medium text-slate-400">{sub.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'help':
        return (
          <div className="card border-dashed border-2 border-slate-200 bg-slate-50/50">
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 mb-3 shadow-sm">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-bold text-slate-600">Need Help?</p>
              <p className="text-xs text-slate-400 mt-1">Contact your HSE supervisor for permit guidance.</p>
              <button className="mt-4 text-xs font-bold text-virtus-blue border border-virtus-blue px-4 py-2 rounded-lg hover:bg-virtus-blue/5 transition-colors">
                Open Support Ticket
              </button>
            </div>
          </div>
        );
      case 'kpis':
        return (
          <div className="card bg-white">
            <h3 className="font-bold text-virtus-navy mb-4">Safety KPIs</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Compliance</span>
                <span className="text-xs font-bold" style={{ color: 'var(--graph-color-1, #2ED9C3)' }}>98%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: '98%', backgroundColor: 'var(--graph-color-1, #2ED9C3)' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Training</span>
                <span className="text-xs font-bold" style={{ color: 'var(--graph-color-2, #2A7DE1)' }}>85%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: '85%', backgroundColor: 'var(--graph-color-2, #2A7DE1)' }} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Unified HSE Portal">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-virtus-navy">Form Catalog</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${isCustomizing ? 'bg-virtus-teal text-virtus-navy shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Settings size={16} />
            {isCustomizing ? 'Done Customizing' : 'Customize Dashboard'}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search permits & forms..." 
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal w-64 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Catalog */}
        <div className="lg:col-span-3 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-virtus-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            domains.map(domain => (
              <div key={domain.id} className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-virtus-teal rounded-full" />
                  <h3 className="text-lg font-bold text-virtus-navy uppercase tracking-wider">{domain.name}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {domain.modules.map(module => (
                    <div key={module.id} className="space-y-4">
                      <div className="flex items-center gap-3 px-1">
                        {getModuleIcon(module.id)}
                        <div>
                          <p className="text-sm font-bold text-virtus-navy">{module.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{module.description}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {module.features.map(feature => (
                          <motion.button
                            key={feature.id}
                            onClick={() => navigate('/app/forms/new')}
                            whileHover={{ x: 4 }}
                            className="w-full bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4 text-left hover:border-virtus-teal hover:shadow-md transition-all group"
                          >
                            <div className="flex-1">
                              <p className="font-bold text-virtus-navy text-sm">{feature.name}</p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">{feature.description}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-virtus-teal" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Activity & Stats (Customizable) */}
        <div className="space-y-6">
          {isCustomizing ? (
            <div className="card border-virtus-teal border-2 bg-virtus-teal/5">
              <p className="text-xs font-bold text-virtus-navy uppercase mb-4">Reorder & Toggle Widgets</p>
              <Reorder.Group axis="y" values={widgets} onReorder={saveLayout} className="space-y-2">
                {widgets.map((widget) => (
                  <Reorder.Item key={widget.id} value={widget}>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-slate-300 cursor-grab" />
                        <span className="text-sm font-bold text-slate-700">{widget.label}</span>
                      </div>
                      <button 
                        onClick={() => toggleWidget(widget.id)}
                        className={`p-1.5 rounded-md transition-colors ${widget.visible ? 'text-virtus-teal bg-virtus-teal/10' : 'text-slate-300 bg-slate-100'}`}
                      >
                        {widget.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          ) : (
            widgets.filter(w => w.visible).map(widget => (
              <div key={widget.id}>
                {renderWidget(widget.id)}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
