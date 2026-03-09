import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  FileJson,
  Printer
} from 'lucide-react';

export const SubmissionList: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const submissions = [
    { id: 'SUB-1024', template: 'Hot Work Permit', user: 'John Doe', status: 'Pending Approval', date: '2024-03-05 09:15', location: 'Tank Farm A' },
    { id: 'SUB-1023', template: 'Cold Work Permit', user: 'Jane Smith', status: 'Approved', date: '2024-03-04 14:30', location: 'Main Workshop' },
    { id: 'SUB-1022', template: 'Working At Height', user: 'Mike Ross', status: 'Rejected', date: '2024-03-04 11:00', location: 'Cooling Tower' },
    { id: 'SUB-1021', template: 'Hot Work Permit', user: 'John Doe', status: 'Closed', date: '2024-03-03 16:45', location: 'Warehouse B' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Pending Approval': return 'bg-amber-100 text-amber-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Closed': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <DashboardLayout title="My Submissions">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
          {['all', 'pending', 'approved', 'closed'].map(tab => (
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
              placeholder="Search by ID or name..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Submission ID</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Template</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {submissions.map((sub) => (
                <tr key={sub.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-virtus-navy">{sub.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{sub.template}</span>
                      <span className="text-xs text-slate-400">{sub.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{sub.location}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusStyle(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={14} />
                      <span className="text-xs font-medium">{sub.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-virtus-blue/10 text-virtus-blue rounded-lg transition-colors" title="View Details">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors" title="Export JSON">
                        <FileJson size={18} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors" title="Print PDF">
                        <Printer size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Showing 4 of 24 submissions</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-400 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-virtus-blue hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
