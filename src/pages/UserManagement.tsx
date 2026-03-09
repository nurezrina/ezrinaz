import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Users, Search, Filter, Plus, UserCheck, MoreVertical, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { fetchWithAuth } from '../utils/api';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser, actingAs, startImpersonation } = useAuth();

  useEffect(() => {
    fetchWithAuth('/api/users')
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Expected array of users, got:", data);
          setUsers([]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch users", err);
        setError(err.message);
        setUsers([]);
      });
  }, []);

  const filteredUsers = Array.isArray(users) ? users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const canImpersonate = (targetUser: User) => {
    const role = actingAs?.role || currentUser?.role;
    if (role === 'super_admin' || role === 'support') return true;
    if (role === 'tenant_admin' && targetUser.tenantId === currentUser?.tenantId) return true;
    return false;
  };

  return (
    <DashboardLayout title="User Management">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-virtus-teal w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Invite New User
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">User</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-virtus-blue/10 flex items-center justify-center font-bold text-virtus-blue">
                        {u.displayName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-virtus-navy">{u.displayName}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 
                        u.role === 'support' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'tenant_admin' ? 'bg-virtus-teal/10 text-virtus-teal' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{u.tenantId || 'Platform'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canImpersonate(u) && u.id !== currentUser?.id && (
                        <button 
                          onClick={() => startImpersonation(u.id, u.tenantId || 'platform')}
                          className="p-2 hover:bg-virtus-teal/10 text-virtus-teal rounded-lg transition-colors" 
                          title="Impersonate User"
                        >
                          <UserCheck size={18} />
                        </button>
                      )}
                      <button className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
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
