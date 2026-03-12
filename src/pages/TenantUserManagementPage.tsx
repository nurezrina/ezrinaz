import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { Search, RotateCcw, UserPlus, Edit3, Upload, UserX, Trash2 } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { Modal } from '../components/Modal';

type TenantUser = {
  id: string;
  name: string;
  email: string;
  division: string;
  role: string;
  companyDepartment: string;
  status: 'Active' | 'Inactive' | 'Pending';
  assets: string[];
  sites: string[];
  remark: string;
  updatedAt?: string;
};

type Filters = {
  name: string;
  email: string;
  division: string;
  role: string;
  companyDepartment: string;
  status: string;
  asset: string;
  site: string;
};

type OptionLists = {
  roles: string[];
  divisions: string[];
  departments: string[];
  assets: string[];
  sites: string[];
  statuses: string[];
};

type FormState = {
  name: string;
  email: string;
  division: string;
  role: string;
  companyDepartment: string;
  status: 'Active' | 'Inactive' | 'Pending';
  assets: string;
  sites: string;
  remark: string;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;
type FormErrors = Partial<Record<'name' | 'email' | 'role' | 'division', string>>;

const emptyFilters: Filters = {
  name: '',
  email: '',
  division: '',
  role: '',
  companyDepartment: '',
  status: '',
  asset: '',
  site: '',
};

const emptyForm: FormState = {
  name: '',
  email: '',
  division: '',
  role: '',
  companyDepartment: '',
  status: 'Active',
  assets: '',
  sites: '',
  remark: '',
};

const defaultOptions: OptionLists = {
  roles: [],
  divisions: [],
  departments: [],
  assets: [],
  sites: [],
  statuses: ['Active', 'Inactive', 'Pending'],
};

const statusClass = (status: TenantUser['status']) => {
  if (status === 'Active') return 'bg-virtus-teal/20 text-virtus-navy';
  if (status === 'Pending') return 'bg-virtus-blue/15 text-virtus-brand-blue';
  return 'bg-slate-200 text-slate-600';
};

const toList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const TenantUserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [options, setOptions] = useState<OptionLists>(defaultOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [submittedFilters, setSubmittedFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [toast, setToast] = useState<ToastState>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const fetchUsers = async (activeFilters: Filters = submittedFilters) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const query = params.toString();
      const data = await fetchWithAuth(`/api/v1/tenant-admin/user-management${query ? `?${query}` : ''}`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tenant users', error);
      setToast({ type: 'error', message: 'Failed to load users.' });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const data = await fetchWithAuth('/api/v1/tenant-admin/user-management/options');
      setOptions({
        roles: Array.isArray(data?.roles) ? data.roles : [],
        divisions: Array.isArray(data?.divisions) ? data.divisions : [],
        departments: Array.isArray(data?.departments) ? data.departments : [],
        assets: Array.isArray(data?.assets) ? data.assets : [],
        sites: Array.isArray(data?.sites) ? data.sites : [],
        statuses: Array.isArray(data?.statuses) ? data.statuses : ['Active', 'Inactive', 'Pending'],
      });
    } catch (error) {
      console.error('Failed to fetch user options', error);
      setToast({ type: 'error', message: 'Failed to load filter options.' });
    }
  };

  useEffect(() => {
    fetchUsers(emptyFilters);
    fetchOptions();
  }, []);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage, pageSize]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: TenantUser) => {
    setEditingId(user.id);
    setFormState({
      name: user.name,
      email: user.email,
      division: user.division,
      role: user.role,
      companyDepartment: user.companyDepartment,
      status: user.status,
      assets: user.assets.join(', '),
      sites: user.sites.join(', '),
      remark: user.remark,
    });
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const submitModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) nextErrors.name = 'Name is required.';
    if (!formState.email.trim()) nextErrors.email = 'Email is required.';
    if (!formState.role.trim()) nextErrors.role = 'Role is required.';
    if (!formState.division.trim()) nextErrors.division = 'Division is required.';
    setFormErrors(nextErrors);
    setModalError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: formState.name.trim(),
      email: formState.email.trim(),
      division: formState.division.trim(),
      role: formState.role.trim(),
      companyDepartment: formState.companyDepartment.trim(),
      status: formState.status,
      assets: toList(formState.assets),
      sites: toList(formState.sites),
      remark: formState.remark.trim(),
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await fetchWithAuth(`/api/v1/tenant-admin/user-management/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'User assignment updated.' });
      } else {
        await fetchWithAuth('/api/v1/tenant-admin/user-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'User registered successfully.' });
      }

      setIsModalOpen(false);
      await Promise.all([fetchUsers(submittedFilters), fetchOptions()]);
    } catch (error) {
      console.error('Failed to save user assignment', error);
      setModalError('Could not save user assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deactivateUser = async (user: TenantUser) => {
    if (user.status === 'Inactive') return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/user-management/${user.id}/deactivate`, { method: 'POST' });
      setToast({ type: 'success', message: `${user.name} deactivated.` });
      await Promise.all([fetchUsers(submittedFilters), fetchOptions()]);
    } catch (error) {
      console.error('Failed to deactivate user', error);
      setToast({ type: 'error', message: 'Failed to deactivate user.' });
    }
  };

  const deleteUser = async (user: TenantUser) => {
    if (!window.confirm(`Delete user '${user.name}'?`)) return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/user-management/${user.id}`, { method: 'DELETE' });
      setToast({ type: 'success', message: `${user.name} deleted.` });
      await Promise.all([fetchUsers(submittedFilters), fetchOptions()]);
    } catch (error) {
      console.error('Failed to delete user', error);
      setToast({ type: 'error', message: 'Failed to delete user.' });
    }
  };

  const onBulkFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();

    setIsBulkUploading(true);
    try {
      await fetchWithAuth('/api/v1/tenant-admin/user-management/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      setToast({ type: 'success', message: 'Bulk user import completed.' });
      await Promise.all([fetchUsers(submittedFilters), fetchOptions()]);
    } catch (error) {
      console.error('Failed user bulk upload', error);
      setToast({ type: 'error', message: 'Bulk user import failed.' });
    } finally {
      setIsBulkUploading(false);
      setFileInputKey((prev) => prev + 1);
    }
  };

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-5">
        {toast ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {toast.message}
          </div>
        ) : null}

        <div className="card p-0 overflow-hidden">
          <div className="bg-virtus-brand-blue px-4 py-2 text-white font-black tracking-wide uppercase text-sm">Search User</div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-slate-700">Name:</label>
                <input value={filters.name} onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter name" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-slate-700">Email:</label>
                <input value={filters.email} onChange={(e) => setFilters((prev) => ({ ...prev, email: e.target.value }))} placeholder="Enter email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-slate-700">Division:</label>
                <select value={filters.division} onChange={(e) => setFilters((prev) => ({ ...prev, division: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.divisions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Role:</label>
                <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.roles.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Company/Department:</label>
                <select value={filters.companyDepartment} onChange={(e) => setFilters((prev) => ({ ...prev, companyDepartment: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.departments.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Status:</label>
                <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Assets:</label>
                <select value={filters.asset} onChange={(e) => setFilters((prev) => ({ ...prev, asset: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.assets.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Sites:</label>
                <select value={filters.site} onChange={(e) => setFilters((prev) => ({ ...prev, site: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
                  <option value="">-- Select --</option>
                  {options.sites.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <input key={fileInputKey} id="tenant-user-bulk-upload" type="file" accept=".csv,text/csv" onChange={onBulkFileSelect} className="hidden" />
              <button onClick={openCreateModal} className="px-4 py-2 bg-virtus-blue text-white rounded font-semibold hover:opacity-90 flex items-center gap-2">
                <UserPlus size={15} /> Register New User
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('tenant-user-bulk-upload') as HTMLInputElement | null;
                  input?.click();
                }}
                disabled={isBulkUploading}
                className="px-4 py-2 bg-virtus-blue text-white rounded font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
              >
                <Upload size={15} /> {isBulkUploading ? 'Importing...' : 'Bulk Upload'}
              </button>
              <button
                onClick={() => {
                  setSubmittedFilters(filters);
                  setPage(1);
                  fetchUsers(filters);
                }}
                className="px-4 py-2 bg-virtus-blue text-white rounded font-semibold hover:opacity-90 flex items-center gap-2"
              >
                <Search size={15} /> Search
              </button>
              <button
                onClick={() => {
                  setFilters(emptyFilters);
                  setSubmittedFilters(emptyFilters);
                  setPage(1);
                  fetchUsers(emptyFilters);
                }}
                className="px-4 py-2 bg-virtus-blue text-white rounded font-semibold hover:opacity-90 flex items-center gap-2"
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead>
                <tr className="bg-virtus-brand-blue text-white text-sm">
                  <th className="px-3 py-3 font-bold uppercase">Name</th>
                  <th className="px-3 py-3 font-bold uppercase">Email</th>
                  <th className="px-3 py-3 font-bold uppercase">Company/Department</th>
                  <th className="px-3 py-3 font-bold uppercase">Roles</th>
                  <th className="px-3 py-3 font-bold uppercase">Assets</th>
                  <th className="px-3 py-3 font-bold uppercase">Sites</th>
                  <th className="px-3 py-3 font-bold uppercase">Status</th>
                  <th className="px-3 py-3 font-bold uppercase">Remark</th>
                  <th className="px-3 py-3 font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">Loading users...</td></tr>
                ) : pageUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-semibold text-slate-800">{user.name}</td>
                    <td className="px-3 py-3 text-slate-600">{user.email}</td>
                    <td className="px-3 py-3 text-slate-600">{user.companyDepartment}</td>
                    <td className="px-3 py-3"><span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-virtus-blue/15 text-virtus-brand-blue">{user.role}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.assets.map((asset) => (
                          <span key={asset} className="inline-flex px-2 py-1 rounded text-xs font-medium bg-virtus-navy/10 text-virtus-navy">{asset}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.sites.map((site) => (
                          <span key={site} className="inline-flex px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">{site}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${statusClass(user.status)}`}>{user.status}</span></td>
                    <td className="px-3 py-3 text-slate-600 text-sm">{user.remark}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(user)} className="text-virtus-brand-blue hover:underline text-sm font-semibold inline-flex items-center gap-1"><Edit3 size={14} /> Edit</button>
                        <button onClick={() => deactivateUser(user)} disabled={user.status === 'Inactive'} className="text-amber-600 hover:underline text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40"><UserX size={14} /> Deactivate</button>
                        <button onClick={() => deleteUser(user)} className="text-red-600 hover:underline text-sm font-semibold inline-flex items-center gap-1"><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && pageUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-400">No users found for selected filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold">View</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || 15;
                  setPageSize(next);
                  setPage(1);
                }}
                className="rounded border border-slate-300 px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={currentPage === 1} className="px-2 py-1 border rounded disabled:opacity-50">&laquo;</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 border rounded disabled:opacity-50">&lsaquo;</button>
              <span className="px-3 py-1 border rounded bg-virtus-brand-blue text-white font-semibold">{currentPage}</span>
              <span className="px-3 py-1 text-slate-500">/ {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-50">&rsaquo;</button>
              <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-50">&raquo;</button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit User Assignment' : 'Register New User'}
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
          setFormErrors({});
          setModalError(null);
        }}
        onSubmit={submitModal}
        submitLabel={editingId ? 'Update' : 'Create'}
        errorMessage={modalError}
        isSubmitting={isSubmitting}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
            <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.name ? 'border-red-300' : 'border-slate-200'}`} value={formState.name} onChange={(e) => {
              setFormState((prev) => ({ ...prev, name: e.target.value }));
              setFormErrors((prev) => ({ ...prev, name: undefined }));
            }} />
            {formErrors.name ? <p className="mt-1 text-xs text-red-600">{formErrors.name}</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.email ? 'border-red-300' : 'border-slate-200'}`} value={formState.email} onChange={(e) => {
              setFormState((prev) => ({ ...prev, email: e.target.value }));
              setFormErrors((prev) => ({ ...prev, email: undefined }));
            }} />
            {formErrors.email ? <p className="mt-1 text-xs text-red-600">{formErrors.email}</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Division</label>
            <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.division ? 'border-red-300' : 'border-slate-200'}`} value={formState.division} onChange={(e) => {
              setFormState((prev) => ({ ...prev, division: e.target.value }));
              setFormErrors((prev) => ({ ...prev, division: undefined }));
            }} />
            {formErrors.division ? <p className="mt-1 text-xs text-red-600">{formErrors.division}</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
            <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.role ? 'border-red-300' : 'border-slate-200'}`} value={formState.role} onChange={(e) => {
              setFormState((prev) => ({ ...prev, role: e.target.value }));
              setFormErrors((prev) => ({ ...prev, role: undefined }));
            }} />
            {formErrors.role ? <p className="mt-1 text-xs text-red-600">{formErrors.role}</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Company/Department</label>
            <input className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" value={formState.companyDepartment} onChange={(e) => setFormState((prev) => ({ ...prev, companyDepartment: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" value={formState.status} onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as 'Active' | 'Inactive' | 'Pending' }))}>
              {options.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Assets (comma separated)</label>
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" value={formState.assets} onChange={(e) => setFormState((prev) => ({ ...prev, assets: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Sites / Location (comma separated)</label>
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" value={formState.sites} onChange={(e) => setFormState((prev) => ({ ...prev, sites: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Remark</label>
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" value={formState.remark} onChange={(e) => setFormState((prev) => ({ ...prev, remark: e.target.value }))} />
        </div>
      </Modal>
    </DashboardLayout>
  );
};
