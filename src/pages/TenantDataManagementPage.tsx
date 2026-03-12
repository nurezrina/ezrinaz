import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import {
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  Building2,
  Briefcase,
  Shield,
  Truck,
  FolderTree,
  Boxes,
  Tag,
  Wrench,
  ClipboardList,
  Edit3,
  Copy,
  Trash2,
  Upload,
} from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { Modal } from '../components/Modal';

type DataRecord = {
  id: string;
  scope: 'org' | 'module';
  type?: string;
  module?: string;
  entity?: string;
  value: string;
  updatedAt: string;
  status?: string;
  tagNo?: string;
  criticality?: string;
  isMock?: boolean;
};

type TreeNode = {
  id: string;
  label: string;
  icon: 'folder' | 'module' | 'leaf';
  children?: TreeNode[];
  recordId?: string;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;
type OrgErrors = Partial<Record<'type' | 'value', string>>;
type ModuleErrors = Partial<Record<'module' | 'entity' | 'value', string>>;
type LeftNavKey = 'org' | 'asset' | 'personnel' | 'hse' | 'logistics';

const initialOrg = { type: 'Department', value: '' };
const initialModule = { module: 'PTW', entity: 'Category', value: '' };

const NOW = new Date().toISOString();

const MOCK_BY_NAV: Record<LeftNavKey, DataRecord[]> = {
  org: [
    { id: 'mock-org-1', scope: 'org', type: 'Department', value: 'Operations', updatedAt: NOW, status: 'Operational', isMock: true },
    { id: 'mock-org-2', scope: 'org', type: 'Department', value: 'Maintenance', updatedAt: NOW, status: 'Operational', isMock: true },
    { id: 'mock-org-3', scope: 'org', type: 'Region', value: 'North Field', updatedAt: NOW, status: 'Operational', isMock: true },
    { id: 'mock-org-4', scope: 'org', type: 'Region', value: 'Offshore Cluster', updatedAt: NOW, status: 'Operational', isMock: true },
  ],
  asset: [
    { id: 'mock-asset-1', scope: 'module', module: 'Topsides Module B', entity: 'Separator', value: 'Separator Tank ST-44', updatedAt: NOW, status: 'Operational', tagNo: 'ST-44-A', criticality: 'Safety Critical', isMock: true },
    { id: 'mock-asset-2', scope: 'module', module: 'Topsides Module B', entity: 'Valve', value: 'Pressure Valve PV-901', updatedAt: NOW, status: 'Operational', tagNo: 'PV-901', criticality: 'Medium', isMock: true },
    { id: 'mock-asset-3', scope: 'module', module: 'Heat Recovery Unit', entity: 'Heat Exchanger', value: 'Heat Exchanger HE-11', updatedAt: NOW, status: 'Operational', tagNo: 'HE-11', criticality: 'High', isMock: true },
  ],
  personnel: [
    { id: 'mock-person-1', scope: 'module', module: 'Offshore Crew', entity: 'Role', value: 'Shift Supervisor', updatedAt: NOW, status: 'Assigned', isMock: true },
    { id: 'mock-person-2', scope: 'module', module: 'Offshore Crew', entity: 'Role', value: 'Maintenance Lead', updatedAt: NOW, status: 'Assigned', isMock: true },
    { id: 'mock-person-3', scope: 'module', module: 'HSE Team', entity: 'Role', value: 'Safety Officer', updatedAt: NOW, status: 'Assigned', isMock: true },
  ],
  hse: [
    { id: 'mock-hse-1', scope: 'module', module: 'HSE', entity: 'Permit Category', value: 'Confined Space Entry', updatedAt: NOW, status: 'Active', isMock: true },
    { id: 'mock-hse-2', scope: 'module', module: 'HSE', entity: 'Permit Category', value: 'Hot Work Permit', updatedAt: NOW, status: 'Active', isMock: true },
    { id: 'mock-hse-3', scope: 'module', module: 'HSE', entity: 'Risk Level', value: 'High Risk Zone', updatedAt: NOW, status: 'Active', isMock: true },
  ],
  logistics: [
    { id: 'mock-log-1', scope: 'module', module: 'Logistics', entity: 'Transport', value: 'Supply Vessel Route A', updatedAt: NOW, status: 'Operational', isMock: true },
    { id: 'mock-log-2', scope: 'module', module: 'Logistics', entity: 'Warehouse', value: 'Spare Parts Store West', updatedAt: NOW, status: 'Operational', isMock: true },
    { id: 'mock-log-3', scope: 'module', module: 'Logistics', entity: 'Tagging', value: 'Container Tag Group C', updatedAt: NOW, status: 'Operational', isMock: true },
  ],
};

export const TenantDataManagementPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<LeftNavKey>('asset');
  const [items, setItems] = useState<DataRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState(initialOrg);
  const [moduleForm, setModuleForm] = useState(initialModule);
  const [orgErrors, setOrgErrors] = useState<OrgErrors>({});
  const [moduleErrors, setModuleErrors] = useState<ModuleErrors>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scope: 'org' | 'module' = activeNav === 'org' ? 'org' : 'module';
  const usesApiData = activeNav === 'org' || activeNav === 'asset';

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const loadItems = async (requestedScope = scope) => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth(`/api/v1/tenant-admin/data?scope=${requestedScope}`);
      const list = Array.isArray(data) ? data : [];
      setItems(list);
    } catch (error) {
      console.error('Failed to load data records', error);
      setToast({ type: 'error', message: 'Failed to load data records.' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(scope);
  }, [scope]);

  const apiRecords = useMemo<DataRecord[]>(
    () =>
      items.map((item) => ({
        ...item,
        status: item.status || 'Operational',
        tagNo: item.tagNo || `${item.id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 8)}`,
        criticality: item.criticality || 'Standard',
        isMock: false,
      })),
    [items]
  );

  const displayRecords = useMemo<DataRecord[]>(() => {
    if (usesApiData && apiRecords.length > 0) return apiRecords;
    return MOCK_BY_NAV[activeNav] || [];
  }, [activeNav, apiRecords, usesApiData]);

  const buildOrgTree = (records: DataRecord[]): TreeNode[] => {
    const groups = new Map<string, DataRecord[]>();
    records.forEach((record) => {
      const key = record.type || 'General';
      const list = groups.get(key) || [];
      list.push(record);
      groups.set(key, list);
    });

    return [{
      id: 'root-org',
      label: 'Organization Registry',
      icon: 'folder',
      children: Array.from(groups.entries()).map(([type, entries]) => ({
        id: `group-org-${type}`,
        label: type,
        icon: 'module',
        children: entries.map((entry) => ({
          id: `leaf-${entry.id}`,
          label: entry.value,
          icon: 'leaf',
          recordId: entry.id,
        })),
      })),
    }];
  };

  const buildModuleTree = (records: DataRecord[], rootLabel: string, midLabel: string): TreeNode[] => {
    const byModule = new Map<string, Map<string, DataRecord[]>>();
    records.forEach((record) => {
      const moduleName = record.module || 'General Module';
      const entityName = record.entity || 'General Entity';
      const entityMap = byModule.get(moduleName) || new Map<string, DataRecord[]>();
      const list = entityMap.get(entityName) || [];
      list.push(record);
      entityMap.set(entityName, list);
      byModule.set(moduleName, entityMap);
    });

    return [{
      id: `root-${rootLabel}`,
      label: rootLabel,
      icon: 'folder',
      children: [{
        id: `mid-${midLabel}`,
        label: midLabel,
        icon: 'module',
        children: Array.from(byModule.entries()).map(([moduleName, entityMap]) => ({
          id: `module-${moduleName}`,
          label: moduleName,
          icon: 'module',
          children: Array.from(entityMap.entries()).map(([entityName, entries]) => {
            if (entries.length === 1) {
              return {
                id: `leaf-${entries[0].id}`,
                label: entries[0].value,
                icon: 'leaf' as const,
                recordId: entries[0].id,
              };
            }
            return {
              id: `entity-${moduleName}-${entityName}`,
              label: entityName,
              icon: 'module' as const,
              children: entries.map((entry) => ({
                id: `leaf-${entry.id}`,
                label: entry.value,
                icon: 'leaf' as const,
                recordId: entry.id,
              })),
            };
          }),
        })),
      }],
    }];
  };

  const hierarchyTree = useMemo<TreeNode[]>(() => {
    if (displayRecords.length === 0) return [];

    if (activeNav === 'org') return buildOrgTree(displayRecords);
    if (activeNav === 'asset') return buildModuleTree(displayRecords, 'Offshore Asset-01', 'Topsides Module B');
    if (activeNav === 'personnel') return buildModuleTree(displayRecords, 'Personnel Master', 'Crew Structure');
    if (activeNav === 'hse') return buildModuleTree(displayRecords, 'HSE Framework', 'Permit and Risk Matrix');
    return buildModuleTree(displayRecords, 'Logistics Network', 'Supply Chain Structure');
  }, [activeNav, displayRecords]);

  const collectLeafIds = (nodes: TreeNode[]): string[] =>
    nodes.flatMap((node) => {
      if (node.recordId) return [node.recordId];
      if (!node.children) return [];
      return collectLeafIds(node.children);
    });

  const collectExpandableIds = (nodes: TreeNode[], depth = 0): string[] =>
    nodes.flatMap((node) => {
      if (!node.children || node.children.length === 0) return [];
      if (depth >= 2) return [node.id];
      return [node.id, ...collectExpandableIds(node.children, depth + 1)];
    });

  useEffect(() => {
    setExpandedNodes(new Set(collectExpandableIds(hierarchyTree).slice(0, 4)));
    const availableLeafIds = collectLeafIds(hierarchyTree);
    setSelectedId((prev) => (prev && availableLeafIds.includes(prev) ? prev : availableLeafIds[0] || null));
  }, [activeNav, hierarchyTree]);

  const selectedRecord = useMemo(() => displayRecords.find((record) => record.id === selectedId) || null, [displayRecords, selectedId]);

  const openCreateModal = () => {
    setEditingId(null);
    setOrgForm(initialOrg);
    setModuleForm(initialModule);
    setOrgErrors({});
    setModuleErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DataRecord) => {
    if (item.isMock) {
      setToast({ type: 'error', message: 'Mock records are view-only. Use Add New Data to create real records.' });
      return;
    }

    setEditingId(item.id);
    if (scope === 'org') {
      setOrgForm({ type: item.type || 'Department', value: item.value });
    } else {
      setModuleForm({ module: item.module || 'PTW', entity: item.entity || 'Category', value: item.value });
    }
    setOrgErrors({});
    setModuleErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const submitModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalError(null);

    if (scope === 'org') {
      const nextOrgErrors: OrgErrors = {};
      if (!orgForm.type.trim()) nextOrgErrors.type = 'Type is required.';
      if (!orgForm.value.trim()) nextOrgErrors.value = 'Value is required.';
      setOrgErrors(nextOrgErrors);
      if (Object.keys(nextOrgErrors).length > 0) return;
      setModuleErrors({});
    } else {
      const nextModuleErrors: ModuleErrors = {};
      if (!moduleForm.module.trim()) nextModuleErrors.module = 'Module is required.';
      if (!moduleForm.entity.trim()) nextModuleErrors.entity = 'Entity is required.';
      if (!moduleForm.value.trim()) nextModuleErrors.value = 'Value is required.';
      setModuleErrors(nextModuleErrors);
      if (Object.keys(nextModuleErrors).length > 0) return;
      setOrgErrors({});
    }

    const payload = scope === 'org' ? { scope: 'org', ...orgForm } : { scope: 'module', ...moduleForm };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await fetchWithAuth(`/api/v1/tenant-admin/data/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'Data entry updated.' });
      } else {
        await fetchWithAuth('/api/v1/tenant-admin/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'Data entry created.' });
      }

      setIsModalOpen(false);
      await loadItems(scope);
    } catch (error) {
      console.error('Failed to save data entry', error);
      setModalError('Could not save data entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateItem = async (item: DataRecord) => {
    if (item.isMock) {
      setToast({ type: 'error', message: 'Mock records cannot be duplicated. Create a real record first.' });
      return;
    }

    try {
      await fetchWithAuth(`/api/v1/tenant-admin/data/${item.id}/duplicate`, { method: 'POST' });
      setToast({ type: 'success', message: 'Data entry duplicated.' });
      await loadItems(scope);
    } catch (error) {
      console.error('Failed to duplicate data entry', error);
      setToast({ type: 'error', message: 'Failed to duplicate data entry.' });
    }
  };

  const deleteItem = async (item: DataRecord) => {
    if (item.isMock) {
      setToast({ type: 'error', message: 'Mock records cannot be deleted.' });
      return;
    }

    if (!window.confirm(`Delete data entry '${item.value}'?`)) return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/data/${item.id}`, { method: 'DELETE' });
      setToast({ type: 'success', message: 'Data entry deleted.' });
      await loadItems(scope);
    } catch (error) {
      console.error('Failed to delete data entry', error);
      setToast({ type: 'error', message: 'Failed to delete data entry.' });
    }
  };

  const onBulkFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    try {
      await fetchWithAuth('/api/v1/tenant-admin/data/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, scope }),
      });
      setToast({ type: 'success', message: 'Bulk upload completed.' });
      await loadItems(scope);
    } catch (error) {
      console.error('Failed bulk upload for data entries', error);
      setToast({ type: 'error', message: 'Bulk upload failed for data entries.' });
    } finally {
      event.target.value = '';
    }
  };

  const navItems: Array<{ key: LeftNavKey; label: string; icon: React.ReactNode }> = [
    { key: 'org', label: 'Org Hierarchy', icon: <Building2 size={15} /> },
    { key: 'asset', label: 'Asset Management', icon: <FolderTree size={15} /> },
    { key: 'personnel', label: 'Personnel & Teams', icon: <Briefcase size={15} /> },
    { key: 'hse', label: 'HSE Domain', icon: <Shield size={15} /> },
    { key: 'logistics', label: 'Logistics Domain', icon: <Truck size={15} /> },
  ];

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = Boolean(node.recordId && selectedId === node.recordId);

    const baseIndent = 14;
    const depthStep = depth === 0 ? 18 : depth === 1 ? 20 : 22;
    const rowIndent = baseIndent + depth * depthStep;
    const elbowColor = depth <= 1 ? 'rgb(203 213 225 / 0.75)' : 'rgb(148 163 184 / 0.95)';
    const trunkColor = depth <= 1 ? 'rgb(226 232 240 / 0.9)' : 'rgb(148 163 184 / 0.75)';
    const trunkWidth = depth <= 1 ? 1 : 1.5;

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (hasChildren) toggleNode(node.id);
            else if (node.recordId) setSelectedId(node.recordId);
          }}
          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${isSelected ? 'bg-cyan-50 text-virtus-navy font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          style={{ paddingLeft: `${rowIndent}px` }}
        >
          {depth > 0 ? (
            <span className="h-px shrink-0" style={{ width: `${depth <= 1 ? 11 : 13}px`, backgroundColor: elbowColor, borderRadius: '999px' }} />
          ) : null}
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          {node.icon === 'folder' ? <FolderTree size={14} className="shrink-0" /> : node.icon === 'module' ? <Boxes size={14} className="shrink-0" /> : (scope === 'org' ? <Tag size={14} className="shrink-0" /> : <Wrench size={14} className="shrink-0" />)}
          <span className="text-sm">{node.label}</span>
        </button>

        {hasChildren && isExpanded ? (
          <div className="relative space-y-0.5">
            <span
              className="absolute top-0 bottom-0"
              style={{
                left: `${baseIndent + (depth + 1) * (depth + 1 === 1 ? 18 : depth + 1 === 2 ? 20 : 22) - 6}px`,
                borderLeft: `${trunkWidth}px solid ${trunkColor}`,
              }}
            />
            {node.children?.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <DashboardLayout title="Data Management">
      <div className="space-y-4">
        {toast ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {toast.message}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-virtus-navy tracking-tight">Master Data Management</h1>
            <p className="text-sm text-slate-500">Unified registry for organizational structures, industrial assets, and module configurations.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadItems(scope)} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 flex items-center gap-2">
              <RefreshCw size={14} /> Sync External
            </button>
            <button onClick={openCreateModal} className="px-4 py-2 rounded-xl bg-virtus-blue text-white font-bold text-sm hover:opacity-90 flex items-center gap-2">
              <Plus size={15} /> Add New Data <ChevronDown size={14} />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Bulk Upload">
              <Upload size={14} />
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onBulkFileSelect} className="hidden" />

        <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)] gap-4">
          <aside className="card p-3">
            <div className="space-y-1">
              {navItems.slice(0, 3).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 ${activeNav === item.key ? 'bg-virtus-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 my-3" />
            <p className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Module-specific data</p>

            <div className="space-y-1">
              {navItems.slice(3).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 ${activeNav === item.key ? 'bg-virtus-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-virtus-blue text-white flex items-center justify-center">
                <Boxes size={16} />
              </div>
              <div>
                <h2 className="font-black text-virtus-navy uppercase tracking-wide text-lg">Asset Hierarchy</h2>
                <p className="text-xs text-slate-500">Verified master data repository.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] min-h-[470px]">
              <div className="border-r border-slate-200 p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Functional Hierarchy</h3>
                {isLoading && usesApiData ? (
                  <p className="text-sm text-slate-400">Loading hierarchy...</p>
                ) : hierarchyTree.length === 0 ? (
                  <p className="text-sm text-slate-400">No records available for this domain.</p>
                ) : (
                  <div className="space-y-1">{hierarchyTree.map((node) => renderTreeNode(node))}</div>
                )}
              </div>

              <div className="p-6">
                {selectedRecord ? (
                  <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-black text-virtus-navy">{selectedRecord.value}</h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Industrial Asset Record</p>
                      </div>
                      <button onClick={() => openEditModal(selectedRecord)} className="text-sm font-bold text-cyan-600 hover:underline">Update Schema</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">UID</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.id}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">Scope</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.scope === 'org' ? 'Organizational' : 'Module Specific'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">Type / Entity</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.type || selectedRecord.entity || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">Module</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.module || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">Status</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.status || 'Operational'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs uppercase font-bold">Tag / Criticality</p>
                        <p className="text-slate-700 font-medium">{selectedRecord.tagNo || '-'} / {selectedRecord.criticality || 'Standard'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-200">
                      <button onClick={() => openEditModal(selectedRecord)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-white flex items-center gap-2"><Edit3 size={14} /> Edit</button>
                      <button onClick={() => duplicateItem(selectedRecord)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-white flex items-center gap-2"><Copy size={14} /> Duplicate</button>
                      <button onClick={() => deleteItem(selectedRecord)} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                    </div>
                    {selectedRecord.isMock ? <p className="text-xs text-slate-400 mt-3">This is mock preview data for visual guidance.</p> : null}
                  </div>
                ) : (
                  <div className="h-full min-h-[320px] border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <ClipboardList size={24} className="mx-auto mb-2" />
                      Select a hierarchy item to view details.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit Data Entry' : 'Create Data Entry'}
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
          setOrgErrors({});
          setModuleErrors({});
          setModalError(null);
        }}
        onSubmit={submitModal}
        submitLabel={editingId ? 'Update' : 'Create'}
        errorMessage={modalError}
        isSubmitting={isSubmitting}
      >
        {scope === 'org' ? (
          <>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
              <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${orgErrors.type ? 'border-red-300' : 'border-slate-200'}`} value={orgForm.type} onChange={(e) => {
                setOrgForm((prev) => ({ ...prev, type: e.target.value }));
                setOrgErrors((prev) => ({ ...prev, type: undefined }));
              }} />
              {orgErrors.type ? <p className="mt-1 text-xs text-red-600">{orgErrors.type}</p> : null}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Value</label>
              <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${orgErrors.value ? 'border-red-300' : 'border-slate-200'}`} value={orgForm.value} onChange={(e) => {
                setOrgForm((prev) => ({ ...prev, value: e.target.value }));
                setOrgErrors((prev) => ({ ...prev, value: undefined }));
              }} />
              {orgErrors.value ? <p className="mt-1 text-xs text-red-600">{orgErrors.value}</p> : null}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Module</label>
              <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${moduleErrors.module ? 'border-red-300' : 'border-slate-200'}`} value={moduleForm.module} onChange={(e) => {
                setModuleForm((prev) => ({ ...prev, module: e.target.value }));
                setModuleErrors((prev) => ({ ...prev, module: undefined }));
              }} />
              {moduleErrors.module ? <p className="mt-1 text-xs text-red-600">{moduleErrors.module}</p> : null}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Entity</label>
              <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${moduleErrors.entity ? 'border-red-300' : 'border-slate-200'}`} value={moduleForm.entity} onChange={(e) => {
                setModuleForm((prev) => ({ ...prev, entity: e.target.value }));
                setModuleErrors((prev) => ({ ...prev, entity: undefined }));
              }} />
              {moduleErrors.entity ? <p className="mt-1 text-xs text-red-600">{moduleErrors.entity}</p> : null}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Value</label>
              <input className={`mt-1 w-full px-3 py-2 rounded-lg border ${moduleErrors.value ? 'border-red-300' : 'border-slate-200'}`} value={moduleForm.value} onChange={(e) => {
                setModuleForm((prev) => ({ ...prev, value: e.target.value }));
                setModuleErrors((prev) => ({ ...prev, value: undefined }));
              }} />
              {moduleErrors.value ? <p className="mt-1 text-xs text-red-600">{moduleErrors.value}</p> : null}
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
};
