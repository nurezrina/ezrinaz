import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Building2, Search, Filter, Plus, UserCheck, Edit3, Copy, MoreVertical } from 'lucide-react';
import { Tenant } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../utils/navigation';
import { fetchWithAuth } from '../utils/api';

export const SuperAdminTenants: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, startImpersonation } = useAuth();

  useEffect(() => {
    fetchWithAuth('/api/tenants')
      .then(data => {
        if (Array.isArray(data)) {
          setTenants(data);
        } else {
          setTenants([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch tenants", err);
        setTenants([]);
      });
  }, []);

  return (
    <DashboardLayout title="Tenant Management">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tenants..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
        <button 
          onClick={() => navigate('/super-admin/tenants/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create New Tenant
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Tenant Name</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Users</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                        {tenant.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-virtus-navy">{tenant.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: {tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{tenant.usersCount}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs font-medium">{new Date(tenant.lastActivity).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startImpersonation('ta-1', tenant.id);
                        }}
                        className="p-2 hover:bg-virtus-teal/10 text-virtus-teal rounded-lg transition-colors flex items-center justify-center" 
                        title="Impersonate Admin"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/super-admin/tenants/edit/${tenant.id}`);
                        }}
                        className="p-2 hover:bg-virtus-blue/10 text-virtus-blue rounded-lg transition-colors flex items-center justify-center" 
                        title="Edit Setup"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors flex items-center justify-center" 
                        title="Duplicate"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};
