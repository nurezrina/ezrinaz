import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  HardHat,
  Lightbulb,
  Search,
  Settings,
  Shield,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { Reorder } from 'motion/react';
import { navigate } from '../utils/navigation';
import { CatalogDomain, Task } from '../types';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

type UserTab = 'dashboard' | 'tasks' | 'modules';

interface UserPortalProps {
  initialTab?: UserTab;
}

type DashboardWidget = {
  id: 'total' | 'completed' | 'in_progress' | 'pending' | 'module_volume' | 'performance';
  label: string;
  visible: boolean;
  type: 'metric' | 'panel';
};

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: 'total', label: 'Total', visible: true, type: 'metric' },
  { id: 'completed', label: 'Completed', visible: true, type: 'metric' },
  { id: 'in_progress', label: 'In Progress', visible: true, type: 'metric' },
  { id: 'pending', label: 'Pending', visible: true, type: 'metric' },
  { id: 'module_volume', label: 'Volume by Module', visible: true, type: 'panel' },
  { id: 'performance', label: 'Performance', visible: true, type: 'panel' },
];

const MOCK_DOMAINS: CatalogDomain[] = [
  {
    id: 'ops',
    name: 'Operations Safety',
    modules: [
      {
        id: 'ptw',
        name: 'Permit To Work',
        description: 'Issue and track work permits by risk level.',
        features: [
          { id: 'hot-work', name: 'Hot Work Permit', description: 'Create permit for hot work operations.' },
          { id: 'cold-work', name: 'Cold Work Permit', description: 'Create permit for non-hot work tasks.' },
        ],
      },
      {
        id: 'occ-safety',
        name: 'Occupational Safety',
        description: 'Workplace and personnel safety controls.',
        features: [
          { id: 'incident-report', name: 'Incident Report', description: 'Log safety incidents and actions.' },
          { id: 'inspection-checklist', name: 'Inspection Checklist', description: 'Run routine field checks.' },
        ],
      },
    ],
  },
  {
    id: 'workflow',
    name: 'Workflow & Reporting',
    modules: [
      {
        id: 'task-mgmt',
        name: 'Task Management',
        description: 'Track assigned forms, permits, and reports.',
        features: [
          { id: 'task-board', name: 'Task Board', description: 'View all assigned work in one board.' },
          { id: 'daily-summary', name: 'Daily Summary', description: 'Generate day-end completion reports.' },
        ],
      },
      {
        id: 'logbook',
        name: 'Digital Logbook',
        description: 'Maintain operational and audit records.',
        features: [
          { id: 'shift-log', name: 'Shift Log', description: 'Capture shift handover notes.' },
          { id: 'audit-record', name: 'Audit Record', description: 'Track compliance audit outcomes.' },
        ],
      },
    ],
  },
  {
    id: 'mobility-logistics',
    name: 'Mobility & Logistics',
    modules: [
      {
        id: 'transport',
        name: 'Transport Safety',
        description: 'Vehicle movement, route approvals, and deviations.',
        features: [
          { id: 'trip-approval', name: 'Trip Approval', description: 'Approve transport and escort requests.' },
          { id: 'route-risk', name: 'Route Risk Assessment', description: 'Assess and record route hazards.' },
        ],
      },
      {
        id: 'barrier',
        name: 'Barrier Management',
        description: 'Track barriers, overrides, and mitigation follow-up.',
        features: [
          { id: 'barrier-register', name: 'Barrier Register', description: 'Maintain active barrier controls.' },
          { id: 'override-request', name: 'Override Request', description: 'Submit and approve barrier overrides.' },
        ],
      },
    ],
  },
];

const MOCK_TASKS: Task[] = [
  {
    id: 'PTW-1042',
    title: 'Hot Work Permit - Compressor Bay',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-03-14',
    module: 'ptw',
    assignedTo: 'user',
    createdAt: '2026-03-09',
  },
  {
    id: 'RPT-2201',
    title: 'Monthly Incident Trend Report',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-03-20',
    module: 'logbook',
    assignedTo: 'user',
    createdAt: '2026-03-08',
  },
  {
    id: 'INS-3308',
    title: 'Area B Safety Inspection Checklist',
    status: 'completed',
    priority: 'low',
    dueDate: '2026-03-07',
    module: 'occ-safety',
    assignedTo: 'user',
    createdAt: '2026-03-05',
  },
  {
    id: 'TSK-4420',
    title: 'Barrier Control Follow-up Actions',
    status: 'in_progress',
    priority: 'critical',
    dueDate: '2026-03-12',
    module: 'barrier',
    assignedTo: 'user',
    createdAt: '2026-03-10',
  },
  {
    id: 'TRN-1183',
    title: 'Transport Safety Deviation Form',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-03-18',
    module: 'transport',
    assignedTo: 'user',
    createdAt: '2026-03-09',
  },
  {
    id: 'PTW-9987',
    title: 'Cold Work Permit - Utility Corridor',
    status: 'on_hold',
    priority: 'high',
    dueDate: '2026-03-16',
    module: 'ptw',
    assignedTo: 'tenantadmin',
    createdAt: '2026-03-06',
  },
  {
    id: 'PTW-1058',
    title: 'Confined Space Permit - Tank Farm A',
    status: 'pending',
    priority: 'critical',
    dueDate: '2026-03-13',
    module: 'ptw',
    assignedTo: 'user',
    createdAt: '2026-03-10',
  },
  {
    id: 'BMS-5510',
    title: 'Barrier Deviation Corrective Plan',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-15',
    module: 'barrier',
    assignedTo: 'user',
    createdAt: '2026-03-09',
  },
  {
    id: 'TRP-6122',
    title: 'Route Risk Assessment - Coastal Access',
    status: 'completed',
    priority: 'medium',
    dueDate: '2026-03-08',
    module: 'transport',
    assignedTo: 'user',
    createdAt: '2026-03-06',
  },
  {
    id: 'LOG-7091',
    title: 'Night Shift Handover Log',
    status: 'pending',
    priority: 'low',
    dueDate: '2026-03-11',
    module: 'logbook',
    assignedTo: 'user',
    createdAt: '2026-03-10',
  },
  {
    id: 'OHS-8844',
    title: 'PPE Compliance Spot Check Report',
    status: 'completed',
    priority: 'low',
    dueDate: '2026-03-07',
    module: 'occ-safety',
    assignedTo: 'user',
    createdAt: '2026-03-05',
  },
  {
    id: 'TSK-9305',
    title: 'Close-out Verification for Audit CAPA',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-19',
    module: 'task-mgmt',
    assignedTo: 'user',
    createdAt: '2026-03-09',
  },
];

const getModuleIcon = (moduleId: string) => {
  switch (moduleId) {
    case 'ptw': return <Shield className="text-virtus-teal" size={16} />;
    case 'passport': return <Users className="text-virtus-blue" size={16} />;
    case 'bbs': return <Activity className="text-amber-500" size={16} />;
    case 'occ-safety': return <HardHat className="text-orange-500" size={16} />;
    case 'gov': return <CheckCircle2 className="text-indigo-500" size={16} />;
    case 'barrier': return <Zap className="text-yellow-500" size={16} />;
    case 'task-mgmt': return <Briefcase className="text-virtus-teal" size={16} />;
    case 'logbook': return <FileText className="text-virtus-blue" size={16} />;
    case 'innovation': return <Lightbulb className="text-amber-400" size={16} />;
    case 'transport': return <Truck className="text-virtus-teal" size={16} />;
    default: return <CircleDashed className="text-slate-500" size={16} />;
  }
};

const formatModule = (module: string) => module.replace(/[-_]/g, ' ').toUpperCase();

export const UserPortal: React.FC<UserPortalProps> = ({ initialTab = 'dashboard' }) => {
  const { user, actingAs } = useAuth();
  const [activeTab, setActiveTab] = useState<UserTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [domains, setDomains] = useState<CatalogDomain[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizingDashboard, setIsCustomizingDashboard] = useState(false);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>(DEFAULT_DASHBOARD_WIDGETS);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/v1/catalog'),
      fetchWithAuth('/api/v1/tasks'),
      fetchWithAuth('/api/v1/dashboard/layout').catch(() => ({})),
    ])
      .then(([catalogData, taskData, layoutData]) => {
        if (catalogData.domains && Array.isArray(catalogData.domains) && catalogData.domains.length > 0) {
          setDomains(catalogData.domains);
        } else {
          setDomains(MOCK_DOMAINS);
        }
        if (Array.isArray(taskData) && taskData.length > 0) {
          setTasks(taskData);
        } else {
          setTasks(MOCK_TASKS);
        }

        if (layoutData?.layoutJson) {
          try {
            const parsed = JSON.parse(layoutData.layoutJson);
            const source = Array.isArray(parsed) ? parsed : parsed.dashboardWidgets;
            if (Array.isArray(source)) {
              const byId = new Map(source.map((item: any) => [item.id, item]));
              const merged = DEFAULT_DASHBOARD_WIDGETS.map((widget) => {
                const saved = byId.get(widget.id);
                return saved ? { ...widget, ...saved } : widget;
              });
              setDashboardWidgets(merged);
            }
          } catch (error) {
            console.error('Failed to parse dashboard widget layout', error);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load user portal data', err);
        setDomains(MOCK_DOMAINS);
        setTasks(MOCK_TASKS);
        setIsLoading(false);
      });
  }, []);

  const userKeys = useMemo(() => {
    const keys = [
      user?.id,
      user?.email,
      user?.displayName,
      actingAs?.id,
      actingAs?.userId,
      actingAs?.actingAsUserId,
      actingAs?.email,
      actingAs?.displayName,
      actingAs?.actingAsDisplayName,
      'user',
    ]
      .filter(Boolean)
      .map(v => String(v).toLowerCase());
    return new Set(keys);
  }, [actingAs, user]);

  const myItems = useMemo(() => {
    return tasks.filter(task => userKeys.has(String(task.assignedTo).toLowerCase()));
  }, [tasks, userKeys]);

  const moduleCounts = useMemo(() => {
    return myItems.reduce((acc, item) => {
      acc[item.module] = (acc[item.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [myItems]);

  const filteredMyItems = useMemo(() => {
    if (!searchQuery.trim()) return myItems;
    const q = searchQuery.toLowerCase();
    return myItems.filter(item =>
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.module.toLowerCase().includes(q)
    );
  }, [myItems, searchQuery]);

  const moduleOptions = useMemo(() => {
    return Object.keys(moduleCounts).sort();
  }, [moduleCounts]);

  const moduleFilteredItems = useMemo(() => {
    if (selectedModule === 'all') return filteredMyItems;
    return filteredMyItems.filter(item => item.module === selectedModule);
  }, [filteredMyItems, selectedModule]);

  const statTotal = myItems.length;
  const statCompleted = myItems.filter(t => t.status === 'completed').length;
  const statInProgress = myItems.filter(t => t.status === 'in_progress').length;
  const statPending = myItems.filter(t => t.status === 'pending').length;
  const completionRate = statTotal > 0 ? Math.round((statCompleted / statTotal) * 100) : 0;

  const sortedModuleStats = (Object.entries(moduleCounts) as Array<[string, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const saveDashboardWidgets = async (nextWidgets: DashboardWidget[]) => {
    setDashboardWidgets(nextWidgets);
    try {
      await fetchWithAuth('/api/v1/dashboard/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutJson: JSON.stringify({ dashboardWidgets: nextWidgets }) }),
      });
    } catch (error) {
      console.error('Failed to save dashboard widgets', error);
    }
  };

  const toggleDashboardWidget = (id: DashboardWidget['id']) => {
    const nextWidgets = dashboardWidgets.map((widget) =>
      widget.id === id ? { ...widget, visible: !widget.visible } : widget
    );
    saveDashboardWidgets(nextWidgets);
  };

  const visibleMetricWidgets = dashboardWidgets.filter((widget) => widget.type === 'metric' && widget.visible);
  const visiblePanelWidgets = dashboardWidgets.filter((widget) => widget.type === 'panel' && widget.visible);

  return (
    <DashboardLayout title="User Workspace">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-virtus-navy">My Workspace</h2>
            <p className="text-sm text-slate-500">Dashboard, personal listings, and domain modules.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search tasks, permits, forms, reports..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="h-[72vh] min-h-[620px] grid grid-rows-[3fr_7fr] gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-virtus-navy">My Permit / Form / Report Count by Module</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Top Section (3)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {Object.entries(moduleCounts).map(([module, count]) => (
                  <button
                    key={module}
                    onClick={() => {
                      setSelectedModule(module);
                      setActiveTab('tasks');
                      navigate('/app/tasks');
                    }}
                    className="text-left rounded-xl border border-slate-200 hover:border-virtus-teal transition-colors p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        {getModuleIcon(module)}
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold">{formatModule(module)}</p>
                    <p className="text-2xl font-bold text-virtus-navy">{count}</p>
                    <p className="text-xs text-slate-500">Assigned to me</p>
                  </button>
                ))}
                {Object.keys(moduleCounts).length === 0 && (
                  <div className="sm:col-span-2 xl:col-span-4 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                    No user-specific permits/forms/reports found.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-5 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-virtus-navy">Statistics Dashboard</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bottom Section (7)</span>
                  <button
                    onClick={() => setIsCustomizingDashboard((prev) => !prev)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${isCustomizingDashboard ? 'bg-virtus-teal text-virtus-navy border-virtus-teal' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Settings size={12} className="inline mr-1" />
                    {isCustomizingDashboard ? 'Done' : 'Manage Widgets'}
                  </button>
                </div>
              </div>

              {isCustomizingDashboard && (
                <div className="mb-6 rounded-xl border-2 border-virtus-teal/40 bg-virtus-teal/5 p-4">
                  <p className="text-xs font-bold text-virtus-navy uppercase mb-3">Reorder and hide/show dashboard widgets</p>
                  <Reorder.Group
                    axis="y"
                    values={dashboardWidgets}
                    onReorder={(nextOrder) => saveDashboardWidgets(nextOrder as DashboardWidget[])}
                    className="space-y-2"
                  >
                    {dashboardWidgets.map((widget) => (
                      <Reorder.Item key={widget.id} value={widget}>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-slate-300" />
                            <span className="text-sm font-bold text-slate-700">{widget.label}</span>
                          </div>
                          <button
                            onClick={() => toggleDashboardWidget(widget.id)}
                            className={`p-1.5 rounded-md transition-colors ${widget.visible ? 'text-virtus-teal bg-virtus-teal/10' : 'text-slate-300 bg-slate-100'}`}
                          >
                            {widget.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {visibleMetricWidgets.map((widget) => {
                  if (widget.id === 'total') {
                    return (
                      <div key={widget.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="text-2xl font-bold text-virtus-navy">{statTotal}</p>
                      </div>
                    );
                  }
                  if (widget.id === 'completed') {
                    return (
                      <div key={widget.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500">Completed</p>
                        <p className="text-2xl font-bold text-emerald-600">{statCompleted}</p>
                      </div>
                    );
                  }
                  if (widget.id === 'in_progress') {
                    return (
                      <div key={widget.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="text-xs text-slate-500">In Progress</p>
                        <p className="text-2xl font-bold text-amber-600">{statInProgress}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={widget.id} className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="text-2xl font-bold text-slate-700">{statPending}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visiblePanelWidgets.some((widget) => widget.id === 'module_volume') && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-virtus-navy flex items-center gap-2"><BarChart3 size={16} /> Volume by Module</p>
                    <p className="text-xs text-slate-400">Graph</p>
                  </div>
                  <div className="space-y-3">
                    {sortedModuleStats.map(([module, count]) => (
                      <div key={module}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-600">{formatModule(module)}</span>
                          <span className="text-slate-400">{count}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-virtus-blue" style={{ width: `${statTotal === 0 ? 0 : Math.round((count / statTotal) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {visiblePanelWidgets.some((widget) => widget.id === 'performance') && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-virtus-navy">Performance</p>
                    <p className="text-xs text-slate-400">Metric</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Completion Rate</span>
                        <span className="font-bold text-emerald-600">{completionRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Pending Share</span>
                        <span className="font-bold text-amber-600">{statTotal === 0 ? 0 : Math.round((statPending / statTotal) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${statTotal === 0 ? 0 : Math.round((statPending / statTotal) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">In Progress Share</span>
                        <span className="font-bold text-virtus-blue">{statTotal === 0 ? 0 : Math.round((statInProgress / statTotal) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-virtus-blue" style={{ width: `${statTotal === 0 ? 0 : Math.round((statInProgress / statTotal) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-virtus-navy">My Tasks</h3>
                <p className="text-xs text-slate-500">All permits, forms, and reports assigned under my user name.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">{moduleFilteredItems.length} items</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Module Filter</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="all">All Modules</option>
                {moduleOptions.map(module => (
                  <option key={module} value={module}>{formatModule(module)}</option>
                ))}
              </select>
              {selectedModule !== 'all' && (
                <button
                  onClick={() => setSelectedModule('all')}
                  className="text-xs font-bold text-virtus-blue hover:underline"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">ID</th>
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Title</th>
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Module</th>
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status</th>
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Priority</th>
                      <th className="px-6 py-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">Loading...</td>
                      </tr>
                    ) : moduleFilteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <AlertCircle size={20} />
                            <p className="text-sm">No items found for the selected module under your user name.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      moduleFilteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-xs font-bold text-virtus-blue uppercase">{item.id}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.title}</td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-2 text-slate-600">
                              {getModuleIcon(item.module)}
                              {formatModule(item.module)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 uppercase">{item.status.replace('_', ' ')}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 uppercase">{item.priority}</td>
                          <td className="px-6 py-4 text-xs text-slate-500">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No date'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-8">
            {isLoading ? (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-virtus-teal border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              domains.map(domain => (
                <section key={domain.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-virtus-teal rounded-full" />
                    <h3 className="text-lg font-bold text-virtus-navy uppercase tracking-wider">{domain.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {domain.modules.map(module => (
                      <div key={module.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getModuleIcon(module.id)}
                          <p className="text-sm font-bold text-virtus-navy">{module.name}</p>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{module.description || 'Module workspace and related forms.'}</p>
                        <div className="space-y-2">
                          {module.features.slice(0, 4).map(feature => (
                            <button
                              key={feature.id}
                              onClick={() => navigate('/app/forms/new')}
                              className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              {feature.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
