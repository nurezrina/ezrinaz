import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { 
  LayoutDashboard, 
  ListTodo, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Settings,
  Calendar,
  Tag,
  Briefcase,
  Shield,
  Users,
  Activity,
  HardHat,
  ClipboardCheck,
  Zap,
  FileText,
  Truck,
  Lightbulb
} from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { fetchWithAuth } from '../utils/api';
import { Task } from '../types';
import { navigate } from '../utils/navigation';

export const TasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const defaultWidgets = [
    { id: 'tasks_by_module', label: 'My Tasks by Module', visible: true },
    { id: 'upcoming_deadlines', label: 'Upcoming Deadlines', visible: true },
    { id: 'task_stats', label: 'Task Statistics', visible: true }
  ];

  const [widgets, setWidgets] = useState(defaultWidgets);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const tasksData = await fetchWithAuth('/api/tasks');
        setTasks(tasksData);

        const layoutData = await fetchWithAuth('/api/tasks/dashboard/layout');
        if (layoutData.layoutJson) {
          try {
            const parsed = JSON.parse(layoutData.layoutJson);
            if (Array.isArray(parsed)) {
              setWidgets(parsed);
            }
          } catch (e) {
            console.error("Failed to parse layout JSON", e);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tasks or layout", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveLayout = async (newWidgets: any) => {
    if (!Array.isArray(newWidgets)) return;
    setWidgets(newWidgets);
    try {
      await fetchWithAuth('/api/tasks/dashboard/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutJson: JSON.stringify(newWidgets) })
      });
    } catch (err) {
      console.error("Failed to save task dashboard layout", err);
    }
  };

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    saveLayout(newWidgets);
  };

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'ptw': return <Shield size={16} className="text-virtus-teal" />;
      case 'passport': return <Users size={16} className="text-virtus-blue" />;
      case 'bbs': return <Activity size={16} className="text-amber-500" />;
      case 'occ-safety': return <HardHat size={16} className="text-orange-500" />;
      case 'gov': return <ClipboardCheck size={16} className="text-indigo-500" />;
      case 'barrier': return <Zap size={16} className="text-yellow-500" />;
      case 'task-mgmt': return <Briefcase size={16} className="text-virtus-teal" />;
      case 'logbook': return <FileText size={16} className="text-virtus-blue" />;
      case 'manning': return <Users size={16} className="text-emerald-500" />;
      case 'innovation': return <Lightbulb size={16} className="text-amber-400" />;
      case 'transport': return <Truck size={16} className="text-virtus-teal" />;
      default: return <Tag size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-600';
      case 'in_progress': return 'bg-amber-100 text-amber-600';
      case 'completed': return 'bg-emerald-100 text-emerald-600';
      case 'on_hold': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-emerald-600';
      default: return 'text-slate-600';
    }
  };

  const tasksByModule = tasks.reduce((acc, task) => {
    acc[task.module] = (acc[task.module] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const upcomingTasks = [...tasks]
    .filter(t => t.status !== 'completed' && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const [moduleFilter, setModuleFilter] = useState('all');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesModule = moduleFilter === 'all' || task.module === moduleFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesModule;
  });

  const renderWidget = (id: string) => {
    switch (id) {
      case 'tasks_by_module':
        return (
          <div className="card h-full">
            <h3 className="font-bold text-virtus-navy mb-6">My Tasks by Module</h3>
            <div className="space-y-3">
              {Object.entries(tasksByModule).map(([module, count]) => (
                <button
                  key={module}
                  onClick={() => {
                    setModuleFilter(module);
                    setActiveTab('list');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-virtus-teal hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                      {getModuleIcon(module)}
                    </div>
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">{module}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-virtus-blue bg-virtus-blue/10 px-2 py-1 rounded-md">{count}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-virtus-teal transition-colors" />
                  </div>
                </button>
              ))}
              {Object.keys(tasksByModule).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">No tasks assigned yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'upcoming_deadlines':
        return (
          <div className="card h-full">
            <h3 className="font-bold text-virtus-navy mb-6">Upcoming Deadlines</h3>
            <div className="space-y-4">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${getPriorityColor(task.priority).replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Calendar size={10} />
                        {new Date(task.dueDate!).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Tag size={10} />
                        {task.module.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">No upcoming deadlines.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'task_stats':
        return (
          <div className="card h-full bg-virtus-navy text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-virtus-teal/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="font-bold mb-6 relative z-10" style={{ color: 'white' }}>Task Statistics</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'pending').length}</p>
                <p className="text-[10px] uppercase font-bold text-white/60 mt-1">Pending</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'completed').length}</p>
                <p className="text-[10px] uppercase font-bold text-white/60 mt-1">Completed</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'in_progress').length}</p>
                <p className="text-[10px] uppercase font-bold text-white/60 mt-1">In Progress</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="text-3xl font-bold">{tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length}</p>
                <p className="text-[10px] uppercase font-bold text-white/60 mt-1">High Priority</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="My Tasks">
      <div className="flex flex-col gap-8">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-virtus-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-white text-virtus-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListTodo size={18} />
              My Tasks
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <button 
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${isCustomizing ? 'bg-virtus-teal text-virtus-navy shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Settings size={16} />
              {isCustomizing ? 'Done Customizing' : 'Manage Widgets'}
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            {isCustomizing ? (
              <div className="card border-virtus-teal border-2 bg-virtus-teal/5 max-w-md">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {widgets.filter(w => w.visible).map(widget => (
                  <div key={widget.id}>
                    {renderWidget(widget.id)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search tasks by ID or title..." 
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <select 
                  className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border-none outline-none focus:ring-2 focus:ring-virtus-teal"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  <option value="all">All Modules</option>
                  {Object.keys(tasksByModule).map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
                <select 
                  className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border-none outline-none focus:ring-2 focus:ring-virtus-teal"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
                <select 
                  className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border-none outline-none focus:ring-2 focus:ring-virtus-teal"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task Title</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Module</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-virtus-teal border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase">Loading tasks...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <p className="text-sm text-slate-400">No tasks found matching your criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-virtus-blue uppercase">{task.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-700 group-hover:text-virtus-blue transition-colors">{task.title}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getModuleIcon(task.module)}
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{task.module}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(task.priority).replace('text-', 'bg-')}`} />
                              <span className={`text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                              <Clock size={14} className="text-slate-300" />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 hover:bg-white rounded-lg transition-colors text-slate-300 hover:text-slate-600">
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
