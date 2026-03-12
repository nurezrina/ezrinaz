import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Building2, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';
import { Tenant } from '../types';

export const SuperAdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    fetch('/api/v1/tenants')
      .then(res => res.json())
      .then(setTenants);
  }, []);

  const kpis = [
    { label: 'Total Tenants', value: tenants.length, icon: Building2, color: 'text-virtus-blue' },
    { label: 'Active Permits', value: '4,521', icon: FileText, color: 'text-virtus-teal' },
    { label: 'Compliance Rate', value: '98.2%', icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Incident Reports', value: '12', icon: ShieldAlert, color: 'text-red-500' },
  ];

  return (
    <DashboardLayout title="Global Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-50 ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
              <p className="text-2xl font-bold text-virtus-navy">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};
