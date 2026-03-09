import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, User, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-virtus-navy">
      <div className="card w-full max-w-md p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-virtus-teal rounded-2xl flex items-center justify-center text-virtus-navy text-3xl font-bold shadow-xl shadow-virtus-teal/20 mx-auto mb-4">V</div>
          <h1 className="text-3xl font-bold text-virtus-navy tracking-tight">VIRTUS</h1>
          <p className="text-slate-500 font-medium">Enterprise HSE Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all"
                  placeholder="superadmin, tenantadmin, user, support"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  defaultValue="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-virtus-teal outline-none transition-all bg-slate-50"
                  readOnly
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-4 text-lg shadow-lg shadow-virtus-teal/20 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center uppercase font-bold tracking-widest mb-4">Test Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {['superadmin', 'tenantadmin', 'user', 'support'].map(u => (
              <button 
                key={u}
                onClick={() => setUsername(u)}
                className="text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 py-2 rounded-lg transition-colors border border-slate-100"
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
