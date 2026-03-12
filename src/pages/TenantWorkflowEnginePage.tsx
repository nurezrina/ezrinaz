import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import { GitBranch, Edit3, Copy, Plus, Trash2, Upload, CheckCircle2, Archive } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { Modal } from '../components/Modal';
import { PTW_WORKFLOW_TEMPLATE_EXAMPLE } from '../types/workflowFormContracts';
import type { FormTemplate, StepType, WorkflowStep, WorkflowTemplate, WorkflowTemplateUpsert } from '../types/workflowFormContracts';

type ToastState = { type: 'success' | 'error'; message: string } | null;

type WorkflowFormStep = {
  key: string;
  stepType: StepType;
  displayLabel: string;
  description: string;
  formTemplateKey: string;
  assigneeRole: string;
  slaHours: string;
};

type WorkflowFormState = {
  key: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  steps: WorkflowFormStep[];
};

type WorkflowErrors = Partial<Record<'name' | 'key', string>> & {
  steps?: string;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: {
    traceId?: string;
    page?: number;
    pageSize?: number;
    total?: number;
  };
};

const STEP_TYPE_OPTIONS: StepType[] = ['submit', 'approval', 'endorsement', 'verification', 'notification', 'task', 'form'];

const makeStep = (seed: number): WorkflowFormStep => ({
  key: `step_${seed}`,
  stepType: seed === 1 ? 'submit' : 'approval',
  displayLabel: seed === 1 ? 'Submit' : 'Approval',
  description: '',
  formTemplateKey: '',
  assigneeRole: '',
  slaHours: '',
});

const initialFormState: WorkflowFormState = {
  key: PTW_WORKFLOW_TEMPLATE_EXAMPLE.key,
  name: PTW_WORKFLOW_TEMPLATE_EXAMPLE.name,
  description: PTW_WORKFLOW_TEMPLATE_EXAMPLE.description || '',
  status: 'draft',
  steps:
    PTW_WORKFLOW_TEMPLATE_EXAMPLE.steps.length > 0
      ? PTW_WORKFLOW_TEMPLATE_EXAMPLE.steps.map((step, index) => ({
          key: step.key,
          stepType: step.stepType,
          displayLabel: step.displayLabel,
          description: step.description || '',
          formTemplateKey: step.formBinding?.formTemplateKey || '',
          assigneeRole: step.assignee.roleKey || '',
          slaHours: typeof step.slaHours === 'number' ? String(step.slaHours) : '',
        }))
      : [makeStep(1), makeStep(2)],
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const labelFromStepType = (stepType: StepType) => {
  if (stepType === 'submit') return 'Submit';
  if (stepType === 'approval') return 'Approval';
  if (stepType === 'endorsement') return 'Endorse';
  if (stepType === 'verification') return 'Verify';
  if (stepType === 'notification') return 'Notification';
  if (stepType === 'task') return 'Task';
  return 'Form';
};

const unwrapData = <T,>(payload: unknown): T => {
  if (Array.isArray(payload)) return payload as T;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

const toFormTemplateOptions = (records: FormTemplate[]) =>
  records.map((item) => ({ key: item.key, name: item.name }));

const toFormState = (template: WorkflowTemplate): WorkflowFormState => ({
  key: template.key,
  name: template.name,
  description: template.description || '',
  status: template.status,
  steps:
    template.steps.length > 0
      ? template.steps.map((step, index) => ({
          key: step.key || `step_${index + 1}`,
          stepType: step.stepType,
          displayLabel: step.displayLabel || labelFromStepType(step.stepType),
          description: step.description || '',
          formTemplateKey: step.formBinding?.formTemplateKey || '',
          assigneeRole: step.assignee.roleKey || '',
          slaHours: typeof step.slaHours === 'number' ? String(step.slaHours) : '',
        }))
      : [makeStep(1)],
});

const buildUpsertPayload = (state: WorkflowFormState): WorkflowTemplateUpsert => {
  const steps: WorkflowStep[] = state.steps.map((step, index) => {
    const parsedSla = Number(step.slaHours);
    const stepPayload: WorkflowStep = {
      key: step.key.trim(),
      stepType: step.stepType,
      displayLabel: step.displayLabel.trim() || labelFromStepType(step.stepType),
      description: step.description.trim() || undefined,
      assignee: step.assigneeRole.trim()
        ? { strategy: 'role', roleKey: step.assigneeRole.trim() }
        : { strategy: 'expression', expression: { fact: 'workflow.initiator.userId', op: 'exists' } },
      slaHours: Number.isFinite(parsedSla) && parsedSla >= 0 ? parsedSla : undefined,
      formBinding: step.formTemplateKey.trim()
        ? {
            formTemplateKey: step.formTemplateKey.trim(),
            mode: index === 0 ? 'create' : 'review',
          }
        : undefined,
    };
    return stepPayload;
  });

  const transitions = steps.slice(0, -1).map((step, index) => ({
    key: `t_${step.key}_${steps[index + 1].key}`,
    fromStepKey: step.key,
    toStepKey: steps[index + 1].key,
    isDefault: true,
  }));

  return {
    key: state.key.trim(),
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    steps,
    transitions,
  };
};

export const TenantWorkflowEnginePage: React.FC = () => {
  const [items, setItems] = useState<WorkflowTemplate[]>([]);
  const [formTemplates, setFormTemplates] = useState<Array<{ key: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WorkflowFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<WorkflowErrors>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const payload = await fetchWithAuth('/api/v1/tenant-admin/workflow-templates');
      const data = unwrapData<WorkflowTemplate[] | unknown[]>(payload);
      setItems(Array.isArray(data) ? (data as WorkflowTemplate[]) : []);
    } catch (error) {
      console.error('Failed to load workflow templates', error);
      setToast({ type: 'error', message: 'Failed to load workflow templates.' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFormTemplates = async () => {
    try {
      const payload = await fetchWithAuth('/api/v1/tenant-admin/form-templates');
      const data = unwrapData<FormTemplate[] | unknown[]>(payload);
      setFormTemplates(Array.isArray(data) ? toFormTemplateOptions(data as FormTemplate[]) : []);
    } catch (error) {
      console.error('Failed to load form templates for binding', error);
      setFormTemplates([]);
    }
  };

  useEffect(() => {
    void Promise.all([loadWorkflows(), loadFormTemplates()]);
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormState(initialFormState);
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WorkflowTemplate) => {
    setEditingId(item.id);
    setFormState(toFormState(item));
    setFormErrors({});
    setModalError(null);
    setIsModalOpen(true);
  };

  const addStep = () => {
    setFormState((prev) => {
      const nextIndex = prev.steps.length + 1;
      return { ...prev, steps: [...prev.steps, makeStep(nextIndex)] };
    });
  };

  const removeStep = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, idx) => idx !== index),
    }));
  };

  const updateStep = (index: number, patch: Partial<WorkflowFormStep>) => {
    setFormState((prev) => ({
      ...prev,
      steps: prev.steps.map((step, idx) => (idx === index ? { ...step, ...patch } : step)),
    }));
  };

  const submitModal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: WorkflowErrors = {};
    if (!formState.name.trim()) nextErrors.name = 'Workflow name is required.';
    const nextKey = formState.key.trim() || toSlug(formState.name);
    if (!nextKey) nextErrors.key = 'Workflow key is required.';
    if (formState.steps.length === 0) nextErrors.steps = 'At least one step is required.';
    if (formState.steps.some((step) => !step.key.trim())) nextErrors.steps = 'Each step key is required.';

    setFormErrors(nextErrors);
    setModalError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildUpsertPayload({ ...formState, key: nextKey });

    setIsSubmitting(true);
    try {
      if (editingId) {
        await fetchWithAuth(`/api/v1/tenant-admin/workflow-templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'Workflow template updated.' });
      } else {
        await fetchWithAuth('/api/v1/tenant-admin/workflow-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setToast({ type: 'success', message: 'Workflow template created.' });
      }
      setIsModalOpen(false);
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to save workflow template', error);
      setModalError('Could not save workflow template. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicateItem = async (item: WorkflowTemplate) => {
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/workflow-templates/${item.id}/duplicate`, { method: 'POST' });
      setToast({ type: 'success', message: 'Workflow template duplicated.' });
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to duplicate workflow template', error);
      setToast({ type: 'error', message: 'Failed to duplicate workflow template.' });
    }
  };

  const publishItem = async (item: WorkflowTemplate) => {
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/workflow-templates/${item.id}/publish`, { method: 'POST' });
      setToast({ type: 'success', message: 'Workflow template published.' });
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to publish workflow template', error);
      setToast({ type: 'error', message: 'Failed to publish workflow template.' });
    }
  };

  const archiveItem = async (item: WorkflowTemplate) => {
    if (!window.confirm(`Archive workflow '${item.name}'?`)) return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/workflow-templates/${item.id}/archive`, { method: 'POST' });
      setToast({ type: 'success', message: 'Workflow template archived.' });
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to archive workflow template', error);
      setToast({ type: 'error', message: 'Failed to archive workflow template.' });
    }
  };

  const deleteItem = async (item: WorkflowTemplate) => {
    if (!window.confirm(`Delete workflow '${item.name}'?`)) return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/workflow-templates/${item.id}`, { method: 'DELETE' });
      setToast({ type: 'success', message: 'Workflow template deleted.' });
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow template', error);
      setToast({ type: 'error', message: 'Delete endpoint not yet available.' });
    }
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items]
  );

  return (
    <DashboardLayout title="Workflow Engine">
      <div className="space-y-6">
        {toast ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Configure tenant workflows with customizable step labels, role assignment, and form bindings.
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 flex items-center gap-2">
              <Upload size={14} /> Import
            </button>
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Workflow Template
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="card text-sm text-slate-400">Loading workflow templates...</div>
          ) : sortedItems.length === 0 ? (
            <div className="card text-sm text-slate-500">No workflow templates yet.</div>
          ) : (
            sortedItems.map((item) => (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-virtus-blue/10 flex items-center justify-center">
                    <GitBranch size={16} className="text-virtus-blue" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">v{item.version}</span>
                </div>
                <h3 className="font-bold text-virtus-navy mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{item.key}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="bg-slate-50 rounded p-2">
                    <span className="text-slate-400">Steps</span>
                    <p className="font-bold text-slate-700">{item.steps.length}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-2">
                    <span className="text-slate-400">Status</span>
                    <p className="font-bold text-slate-700 capitalize">{item.status}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-xs font-bold py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => duplicateItem(item)}
                    className="text-xs font-bold py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1"
                  >
                    <Copy size={13} /> Duplicate
                  </button>
                  <button
                    onClick={() => publishItem(item)}
                    disabled={item.status === 'published'}
                    className="text-xs font-bold py-2 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} /> Publish
                  </button>
                  <button
                    onClick={() => archiveItem(item)}
                    disabled={item.status === 'archived'}
                    className="text-xs font-bold py-2 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <Archive size={13} /> Archive
                  </button>
                </div>
                <button
                  onClick={() => deleteItem(item)}
                  className="mt-2 w-full text-xs font-bold py-2 rounded border border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit Workflow Template' : 'Create Workflow Template'}
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
            <label className="text-xs font-bold text-slate-500 uppercase">Workflow Name</label>
            <input
              className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.name ? 'border-red-300' : 'border-slate-200'}`}
              value={formState.name}
              onChange={(e) => {
                const nextName = e.target.value;
                setFormState((prev) => ({
                  ...prev,
                  name: nextName,
                  key: prev.key || toSlug(nextName),
                }));
                setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {formErrors.name ? <p className="mt-1 text-xs text-red-600">{formErrors.name}</p> : null}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Workflow Key</label>
            <input
              className={`mt-1 w-full px-3 py-2 rounded-lg border ${formErrors.key ? 'border-red-300' : 'border-slate-200'}`}
              value={formState.key}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, key: toSlug(e.target.value) }));
                setFormErrors((prev) => ({ ...prev, key: undefined }));
              }}
            />
            {formErrors.key ? <p className="mt-1 text-xs text-red-600">{formErrors.key}</p> : null}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
          <textarea
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200"
            rows={2}
            value={formState.description}
            onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase">Workflow Steps</p>
            <button type="button" onClick={addStep} className="text-xs font-bold text-virtus-brand-blue hover:underline">
              + Add Step
            </button>
          </div>

          {formState.steps.map((step, index) => (
            <div key={`${step.key}-${index}`} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Step {index + 1}</p>
                <button
                  type="button"
                  disabled={formState.steps.length <= 1}
                  onClick={() => removeStep(index)}
                  className="text-xs text-red-600 font-semibold disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  placeholder="Step key"
                  value={step.key}
                  onChange={(e) => updateStep(index, { key: toSlug(e.target.value) })}
                />
                <select
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  value={step.stepType}
                  onChange={(e) => {
                    const nextType = e.target.value as StepType;
                    updateStep(index, {
                      stepType: nextType,
                      displayLabel: step.displayLabel || labelFromStepType(nextType),
                    });
                  }}
                >
                  {STEP_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  placeholder="Display label (example: Verify/Endorse)"
                  value={step.displayLabel}
                  onChange={(e) => updateStep(index, { displayLabel: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  placeholder="Assignee role key"
                  value={step.assigneeRole}
                  onChange={(e) => updateStep(index, { assigneeRole: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  value={step.formTemplateKey}
                  onChange={(e) => updateStep(index, { formTemplateKey: e.target.value })}
                >
                  <option value="">No linked form</option>
                  {formTemplates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <input
                  className="px-3 py-2 rounded border border-slate-200 text-sm"
                  placeholder="SLA hours"
                  value={step.slaHours}
                  onChange={(e) => updateStep(index, { slaHours: e.target.value })}
                />
              </div>
              <textarea
                className="w-full px-3 py-2 rounded border border-slate-200 text-sm"
                rows={2}
                placeholder="Step description"
                value={step.description}
                onChange={(e) => updateStep(index, { description: e.target.value })}
              />
            </div>
          ))}

          {formErrors.steps ? <p className="text-xs text-red-600">{formErrors.steps}</p> : null}
        </div>
      </Modal>
    </DashboardLayout>
  );
};
