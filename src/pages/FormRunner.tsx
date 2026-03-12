import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '../components/Layout';
import { 
  ChevronLeft, 
  Save, 
  Send, 
  Plus,
  Minus,
  Printer,
  Play,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { navigate } from '../utils/navigation';
import { PTW_FORM_TEMPLATE_EXAMPLE } from '../types/workflowFormContracts';
import type { FormFieldConfig } from '../types/workflowFormContracts';
import type { FormSectionConfig } from '../types/workflowFormContracts';
import type { FormTemplateUpsert } from '../types/workflowFormContracts';
import { fetchWithAuth } from '../utils/api';

type SubmissionRecord = {
  id: string;
  formId: string;
  versionNumber: number;
  status: 'in_progress' | 'submitted' | 'cancelled';
  createdAt: string;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

type TenantDataRecord = {
  id: string;
  scope: 'org' | 'module';
  type?: string;
  module?: string;
  entity?: string;
  value: string;
};

export const FormRunner: React.FC<{ templateId: string }> = ({ templateId }) => {
  const [template, setTemplate] = useState<FormTemplateUpsert>(PTW_FORM_TEMPLATE_EXAMPLE);
  const [dataLibraryRecords, setDataLibraryRecords] = useState<TenantDataRecord[]>([]);
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const tid = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(tid);
  }, [toast]);

  const startSubmission = useCallback(async () => {
    setIsStarting(true);
    try {
      const record = await fetchWithAuth(
        `/api/v1/forms/templates/${encodeURIComponent(templateId)}/submissions/start`,
        { method: 'POST' }
      );
      if (record?.id) {
        setSubmission({
          id: record.id,
          formId: record.formId,
          versionNumber: record.versionNumber,
          status: record.status,
          createdAt: record.createdAt,
        });
      }
    } catch (error) {
      console.error('Failed to start submission', error);
      setToast({ type: 'error', message: 'Failed to start submission. The form may not have a published version.' });
    } finally {
      setIsStarting(false);
    }
  }, [templateId]);

  const handleSaveDraft = useCallback(async () => {
    if (!submission) return;
    setIsSaving(true);
    // Simulate a brief save - in production this would persist formValues
    await new Promise((r) => setTimeout(r, 400));
    setIsSaving(false);
    setToast({ type: 'success', message: `Draft saved for ${submission.id}.` });
  }, [submission]);

  const handleSubmitForm = useCallback(async () => {
    if (!submission) return;
    setIsSubmitting(true);
    // Simulate submission - in production this would POST formValues + change status
    await new Promise((r) => setTimeout(r, 600));
    setSubmission((prev) => prev ? { ...prev, status: 'submitted' } : prev);
    setIsSubmitting(false);
    setToast({ type: 'success', message: `Submission ${submission.id} submitted successfully.` });
  }, [submission]);

  useEffect(() => {
    let cancelled = false;

    const loadTemplate = async () => {
      try {
        const response = await fetchWithAuth(`/api/v1/forms/templates/${encodeURIComponent(templateId || 'ptw-example')}`);
        const persistedTemplate = response?.template as FormTemplateUpsert | null;
        if (cancelled) return;
        if (persistedTemplate && Array.isArray(persistedTemplate.sections)) {
          setTemplate(persistedTemplate);
          return;
        }

        if (templateId === 'ptw-example' || templateId === 'new' || templateId === 'demo') {
          setTemplate(PTW_FORM_TEMPLATE_EXAMPLE);
          return;
        }

        setTemplate({
          key: `form_${templateId}`,
          name: `Form ${templateId}`,
          description: 'Fallback form template',
          sections: [
            {
              key: 'section_1',
              label: 'Section 1',
              order: 1,
              fields: [{ key: 'field_1', label: 'Field 1', type: 'text' }],
            },
          ],
        });
      } catch (error) {
        console.error('Failed to load persisted PTW template for runner', error);
        if (!cancelled) {
          setTemplate(PTW_FORM_TEMPLATE_EXAMPLE);
        }
      }

      try {
        const data = await fetchWithAuth('/api/v1/forms/data-library');
        if (!cancelled) {
          setDataLibraryRecords(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load form data library', error);
      }
    };

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const sortedSections = useMemo(
    () => [...template.sections].sort((a, b) => a.order - b.order),
    [template.sections]
  );

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sortedSections.map((section, index) => [section.key, index === 0]))
  );

  useEffect(() => {
    setExpandedSections(Object.fromEntries(sortedSections.map((section, index) => [section.key, index === 0])));
  }, [sortedSections]);

  const [formValues, setFormValues] = useState<Record<string, unknown>>({
    applicant_name: 'ARCHIT GOEL',
    company: 'CPOC',
    staff_id: '123455677788',
    telephone_no: '019-9529696',
    asset: 'General Platform A',
    site: 'Site A',
    area_unit: 'Area 1',
    permit_type: 'Cold Work',
    confined_space_entry: 'No',
    risk_rating: 'High',
    work_description: 'Testing for ENEOS system',
  });

  const handleBackToPortal = () => {
    navigate('/app/modules');

    // Fallback: if SPA navigation is blocked for any reason, force a full redirect.
    window.setTimeout(() => {
      if (!window.location.pathname.startsWith('/app/modules')) {
        window.location.assign('/app/modules');
      }
    }, 0);
  };

  const ptwNo = useMemo(() => `0000${String(templateId || '94').replace(/\D/g, '').slice(-2).padStart(2, '0')}`, [templateId]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fieldOptions: Record<string, string[]> = {
    permit_type: ['Cold Work', 'Hot Work'],
    confined_space_entry: ['Yes', 'No'],
    risk_rating: ['Low', 'Medium', 'High', 'Very High'],
    area_classification: ['Zone 0', 'Zone 1', 'Zone 2', 'Non Hazardous Area', 'Non Hydrocarbon Area'],
    site_visit_required: ['Yes', 'No'],
  };

  const getOptionsForField = (field: FormFieldConfig): string[] => {
    if (field.manualOptions && field.manualOptions.length > 0) return field.manualOptions;

    if (field.optionsSource?.domainKey) {
      const options = Array.from(
        new Set<string>(
          dataLibraryRecords
            .filter((item) => `${item.scope}:${item.module || item.type || 'General'}:${item.entity || 'Value'}` === field.optionsSource?.domainKey)
            .map((item) => item.value)
        )
      );
      if (options.length > 0) return options;
    }

    if (field.type === 'yesno') return ['Yes', 'No'];
    return fieldOptions[field.key] || ['Yes', 'No'];
  };

  const setValue = (fieldKey: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const renderField = (field: FormFieldConfig) => {
    const currentValue = formValues[field.key] ?? '';
    const requiredMark = field.required ? <span className="text-red-500 ml-1">*</span> : null;

    if (field.type === 'textarea') {
      return (
        <label key={field.key} className="text-sm block">
          <span className="font-semibold">{field.label}{requiredMark}</span>
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            rows={4}
            value={String(currentValue)}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        </label>
      );
    }

    if (field.type === 'radio' || field.type === 'yesno') {
      const options = getOptionsForField(field);
      return (
        <div key={field.key}>
          <p className="font-semibold text-sm">{field.label}{requiredMark}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.key}
                  checked={String(currentValue) === option}
                  onChange={() => setValue(field.key, option)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label key={field.key} className="text-sm flex items-center gap-2 border border-slate-200 rounded p-2">
          <input
            type="checkbox"
            checked={Boolean(currentValue)}
            onChange={(e) => setValue(field.key, e.target.checked)}
          />
          <span>{field.label}{requiredMark}</span>
        </label>
      );
    }

    if (field.type === 'multiselect') {
      const options = getOptionsForField(field);
      const current = Array.isArray(currentValue) ? currentValue.map(String) : [];
      return (
        <label key={field.key} className="text-sm">
          <span className="font-semibold">{field.label}{requiredMark}</span>
          <select
            multiple
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={current}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((option: HTMLOptionElement) => option.value);
              setValue(field.key, values);
            }}
          >
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === 'select') {
      const sourceOptions = getOptionsForField(field);
      const fallbackOptions = ['-- Select --', ...sourceOptions].filter((value, index, arr) => arr.indexOf(value) === index);

      return (
        <label key={field.key} className="text-sm">
          <span className="font-semibold">{field.label}{requiredMark}</span>
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={String(currentValue)}
            onChange={(e) => setValue(field.key, e.target.value)}
          >
            {fallbackOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === 'static') {
      return (
        <div key={field.key} className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-700">
          {field.label}
        </div>
      );
    }

    if (field.type === 'signature') {
      return (
        <label key={field.key} className="text-sm block">
          <span className="font-semibold">{field.label}{requiredMark}</span>
          <div className="mt-1 h-20 border border-dashed border-slate-300 rounded bg-white px-3 py-2 text-slate-400">Signature area</div>
        </label>
      );
    }

    if (field.type === 'table') {
      const columns = field.tableColumns && field.tableColumns.length > 0 ? field.tableColumns : ['Column 1', 'Column 2'];
      return (
        <div key={field.key} className="text-sm block md:col-span-2">
          <p className="font-semibold">{field.label}{requiredMark}</p>
          <div className="mt-1 overflow-x-auto border border-slate-200 rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-2 py-1 text-left border-b border-slate-200">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {columns.map((column) => (
                    <td key={column} className="px-2 py-1 border-b border-slate-100">
                      <input className="w-full rounded border border-slate-200 px-2 py-1" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (field.type === 'file') {
      return (
        <label key={field.key} className="text-sm block">
          <span className="font-semibold">{field.label}{requiredMark}</span>
          <input type="file" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white" />
        </label>
      );
    }

    return (
      <label key={field.key} className="text-sm block">
        <span className="font-semibold">{field.label}{requiredMark}</span>
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'datetime' ? 'datetime-local' : 'text'}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={String(currentValue)}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      </label>
    );
  };

  const renderSectionContent = (section: FormSectionConfig) => {
    const fieldsByKey = new Map(section.fields.map((field) => [field.key, field]));
    const consumedKeys = new Set<string>();
    const groups = section.layout?.groups || [];

    const getFieldColSpanClassName = (field: FormFieldConfig, columns?: 1 | 2 | 3) => {
      const targetColumns = columns || 2;
      const span = field.layout?.colSpan;

      if (!span || span <= 1 || targetColumns === 1) {
        return '';
      }

      if (targetColumns === 2) {
        return span >= 2 ? 'md:col-span-2' : '';
      }

      if (targetColumns === 3) {
        if (span >= 3) {
          return 'md:col-span-3';
        }
        if (span === 2) {
          return 'md:col-span-2';
        }
      }

      return '';
    };

    const getGridClassName = (columns?: 1 | 2 | 3) => {
      if (columns === 1) {
        return 'grid-cols-1';
      }
      if (columns === 3) {
        return 'grid-cols-1 md:grid-cols-3';
      }
      return 'grid-cols-1 md:grid-cols-2';
    };

    return (
      <div className="space-y-4">
        {groups.map((group) => {
          const groupFields = group.fieldKeys
            .map((fieldKey) => fieldsByKey.get(fieldKey))
            .filter((field): field is FormFieldConfig => Boolean(field));

          groupFields.forEach((field) => consumedKeys.add(field.key));

          if (groupFields.length === 0) {
            return null;
          }

          return (
            <div key={group.key} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">{group.label}</div>
              <div className={`p-3 grid gap-4 ${getGridClassName(group.columns)}`}>
                {groupFields.map((field) => (
                  <div key={field.key} className={getFieldColSpanClassName(field, group.columns)}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {section.fields.some((field) => !consumedKeys.has(field.key)) ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">Additional Details</div>
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields
                .filter((field) => !consumedKeys.has(field.key))
                .map((field) => (
                  <div key={field.key} className={getFieldColSpanClassName(field, 2)}>
                    {renderField(field)}
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {groups.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.key} className={getFieldColSpanClassName(field, 2)}>
                {renderField(field)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const isSubmitted = submission?.status === 'submitted';

  return (
    <DashboardLayout title="Permit To Work">
      <div className="max-w-5xl mx-auto space-y-4">
        {toast ? (
          <div className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.message}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToPortal}
            className="flex items-center gap-2 text-slate-500 font-bold hover:text-virtus-navy transition-colors"
          >
            <ChevronLeft size={20} />
            Back to Portal
          </button>
          {submission ? (
            <div className="flex gap-3">
              {!isSubmitted ? (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-virtus-blue font-bold text-sm hover:bg-virtus-blue/5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Save size={18} />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleSubmitForm}
                    disabled={isSubmitting}
                    className="btn-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    <Send size={18} />
                    {isSubmitting ? 'Submitting...' : 'Submit Permit'}
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-sm">
                  <CheckCircle2 size={16} /> Submitted
                </span>
              )}
            </div>
          ) : null}
        </div>

        {!submission ? (
          <section className="card p-0 overflow-hidden">
            <div className="bg-virtus-blue px-4 py-3">
              <h2 className="font-bold text-white text-lg">{template.name}</h2>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-virtus-blue/10 flex items-center justify-center">
                <FileText size={28} className="text-virtus-blue" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{template.name}</h3>
                {template.description ? <p className="text-sm text-slate-500 mt-1">{template.description}</p> : null}
                <p className="text-sm text-slate-500 mt-2">{template.sections.length} sections &middot; {template.sections.reduce((count, section) => count + section.fields.length, 0)} fields</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-w-md mx-auto text-left text-sm text-slate-600 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-slate-700"><Info size={14} /> What happens when you start?</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                  <li>A new submission record is created</li>
                  <li>The current published form version is pinned</li>
                  <li>You can save drafts and submit when ready</li>
                </ul>
              </div>
              <button
                onClick={startSubmission}
                disabled={isStarting}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base disabled:opacity-60"
              >
                <Play size={18} />
                {isStarting ? 'Starting...' : 'Start Submission'}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-virtus-blue/30 bg-virtus-blue/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-bold text-virtus-navy">Submission</span>
                <span className="font-mono text-xs bg-white border border-slate-200 rounded px-2 py-1">{submission.id}</span>
                <span className="text-slate-500">Pinned to <strong className="text-virtus-blue">v{submission.versionNumber}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isSubmitted ? <><CheckCircle2 size={12} /> Submitted</> : <><FileText size={12} /> In Progress</>}
                </span>
                <span className="text-slate-400">Started {new Date(submission.createdAt).toLocaleString()}</span>
              </div>
            </section>

            <section className="card p-0 overflow-hidden">
              <div className="bg-virtus-teal px-4 py-2 flex items-center justify-between">
                <h2 className="font-bold text-white">PTW Summary</h2>
                <button className="text-white/90 hover:text-white"><Minus size={16} /></button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <p><span className="text-virtus-teal font-semibold mr-2">ePTW No.</span>{ptwNo}</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Status</span>{isSubmitted ? 'Submitted' : 'In Progress'}</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Asset</span>General Platform A</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Permit Type</span>Cold Work</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Site</span>Site A</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Version</span>v{submission.versionNumber}</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Area/Unit</span>Area 1</p>
                <p><span className="text-virtus-teal font-semibold mr-2">Company</span>CPOC</p>
                <p className="md:col-span-2"><span className="text-virtus-teal font-semibold mr-2">Work description</span>Testing for ENEOS system</p>
              </div>
            </section>

            <section className="space-y-2">
              {sortedSections.map((section) => (
                <div key={section.key} className="card p-0 overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full bg-virtus-blue text-white px-4 py-2.5 flex items-center justify-between font-bold text-left"
                  >
                    <span>{section.label}</span>
                    {expandedSections[section.key] ? <Minus size={18} /> : <Plus size={18} />}
                  </button>

                  {expandedSections[section.key] ? (
                    <div className="p-4">
                      {renderSectionContent(section)}
                      <div className="flex justify-end mt-4">
                        <button className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-50">
                          <Printer size={15} /> Print
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </section>

            {!isSubmitted ? (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleSubmitForm}
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Permit'}
                </button>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 size={18} /> This submission has been completed.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
