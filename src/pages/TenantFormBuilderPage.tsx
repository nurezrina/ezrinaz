import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '../components/Layout';
import {
  Plus,
  Minus,
  Search,
  Upload,
  Edit3,
  Copy,
  Trash2,
  ArrowLeft,
  Save,
  LayoutTemplate,
  SlidersHorizontal,
  Route,
  ShieldCheck,
  Grip,
  Eye,
  Share2,
  Bot,
  UserPlus,
  Play,
  ArrowUp,
  ArrowDown,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
  Type,
  Calendar,
  Clock3,
  ToggleLeft,
  List,
  ListChecks,
  CheckSquare,
  CircleDot,
  PenLine,
  Paperclip,
  Table,
  AlignLeft,
  X,
} from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { navigate } from '../utils/navigation';
import {
  DEFAULT_TENANT_ROLE_PERMISSION_CONFIG,
  PTW_FORM_TEMPLATE_EXAMPLE,
  type FormFieldConfig,
  type FormFieldType,
  type FormSectionConfig,
  type FormTemplateUpsert,
  type PermissionSectionKey,
  type TenantPermissionDefinition,
} from '../types/workflowFormContracts';

type FormTemplate = {
  id: string;
  name: string;
  sections: number;
  conditionalRules: number;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  activeVersionNumber?: number | null;
  draftVersionNumber?: number | null;
};

type FormVersionSummary = {
  formId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type FormDraft = {
  name: string;
  sections: string;
  conditionalRules: string;
  status: 'draft' | 'published' | 'archived';
};

type TenantDataRecord = {
  id: string;
  scope: 'org' | 'module';
  type?: string;
  module?: string;
  entity?: string;
  value: string;
};

type SelectedFieldRef = {
  sectionKey: string;
  fieldKey: string;
} | null;

type FormErrors = Partial<Record<'name', string>>;
type ToastState = { type: 'success' | 'error'; message: string } | null;
type BuilderTab = 'canvas' | 'rules' | 'workflow' | 'roles';

type RuleRow = {
  id: string;
  field: string;
  operator: string;
  value: string;
  action: 'show' | 'hide';
  target: string;
  status: 'active' | 'draft';
};

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  sla: string;
  active: boolean;
};

type DragState =
  | {
      kind: 'section';
      sectionKey: string;
      fromIndex: number;
    }
  | {
      kind: 'field';
      sectionKey: string;
      fieldKey: string;
      fromSectionIndex: number;
      fromFieldIndex: number;
    };

const initialForm: FormDraft = {
  name: '',
  sections: '',
  conditionalRules: '',
  status: 'draft',
};

const initialRuleRows: RuleRow[] = [
  { id: 'rule-1', field: 'Marital Status', operator: 'Equals', value: 'Married', action: 'show', target: 'Spouse Name', status: 'active' },
  { id: 'rule-2', field: 'Age', operator: 'Less Than', value: '18', action: 'show', target: 'Parental Consent', status: 'active' },
  { id: 'rule-3', field: 'Employment', operator: 'Equals', value: 'Unemployed', action: 'hide', target: 'Company Name', status: 'draft' },
];

const initialWorkflowSteps: WorkflowStep[] = [
  { id: 'wf-1', title: 'Form Trigger', description: 'Initiates when this form is submitted', assignee: 'System Default', sla: 'Immediate', active: true },
  { id: 'wf-2', title: 'Manager Approval', description: 'Manual review before routing onward', assignee: 'Direct Manager', sla: '24h', active: true },
  { id: 'wf-3', title: 'Notification', description: 'Send automatic email to submitter', assignee: 'Email Service', sla: 'Immediate', active: true },
];

const SECTION_LABELS: Record<PermissionSectionKey, string> = {
  form: 'Form Management',
  data: 'Data & Responses',
  security: 'Security & Team',
};

const TENANT_PERMISSION_DEFINITIONS = DEFAULT_TENANT_ROLE_PERMISSION_CONFIG.permissions;
const TENANT_ROLE_TEMPLATES = DEFAULT_TENANT_ROLE_PERMISSION_CONFIG.roleTemplates;

const clonePtwTemplate = (): FormTemplateUpsert => JSON.parse(JSON.stringify(PTW_FORM_TEMPLATE_EXAMPLE));

const createFallbackTemplateForForm = (name: string): FormTemplateUpsert => ({
  key: name.toLowerCase().replace(/\s+/g, '_'),
  name,
  description: `${name} editable schema`,
  sections: [
    {
      key: 'section_1',
      label: 'Section 1',
      order: 1,
      fields: [
        { key: 'field_1', label: 'Field 1', type: 'text', required: true },
        { key: 'field_2', label: 'Field 2', type: 'textarea' },
      ],
    },
  ],
});

const createNewTemplate = (): FormTemplateUpsert => ({
  key: `form_${Date.now()}`,
  name: 'Untitled Form',
  description: 'Tenant configurable form',
  sections: [
    {
      key: `section_${Date.now()}`,
      label: 'Section 1',
      order: 1,
      fields: [{ key: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false }],
    },
  ],
});

const countRuleLikeConditionsForTemplate = (template: FormTemplateUpsert) =>
  template.sections.reduce((count, section) => {
    const sectionRuleCount = section.visibleWhen ? 1 : 0;
    const fieldRuleCount = section.fields.reduce(
      (fieldCount, field) => fieldCount + (field.requiredWhen ? 1 : 0) + (field.visibleWhen ? 1 : 0) + (field.readOnlyWhen ? 1 : 0),
      0
    );
    return count + sectionRuleCount + fieldRuleCount;
  }, 0);

export const TenantFormBuilderPage: React.FC = () => {
  const [items, setItems] = useState<FormTemplate[]>([]);
  const [ptwTemplateUpdatedAt, setPtwTemplateUpdatedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormDraft>(initialForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [routeTick, setRouteTick] = useState(0);
  const [initializedRoute, setInitializedRoute] = useState('');
  const [workingTemplate, setWorkingTemplate] = useState<FormTemplateUpsert | null>(null);
  const [dataLibraryRecords, setDataLibraryRecords] = useState<TenantDataRecord[]>([]);
  const [activeTab, setActiveTab] = useState<BuilderTab>('canvas');

  const [rules, setRules] = useState<RuleRow[]>(initialRuleRows);
  const [ruleDraft, setRuleDraft] = useState({ field: '', operator: 'Equals', value: '', action: 'show' as 'show' | 'hide', target: '' });
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>(initialWorkflowSteps);
  const [activePermissionRoleKey, setActivePermissionRoleKey] = useState<string>(TENANT_ROLE_TEMPLATES[0]?.key || 'admin');
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, Record<string, boolean>>>(() =>
    Object.fromEntries(TENANT_ROLE_TEMPLATES.map((roleTemplate) => [roleTemplate.key, { ...roleTemplate.permissions }]))
  );
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedField, setSelectedField] = useState<SelectedFieldRef>(null);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [dataLibrarySearch, setDataLibrarySearch] = useState('');
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<FormVersionSummary[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  const [isReadOnlyVersionView, setIsReadOnlyVersionView] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);
  const [fieldDropTarget, setFieldDropTarget] = useState<{ sectionKey: string; index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const handleRouteChange = () => setRouteTick((tick) => tick + 1);
    window.addEventListener('app-navigate', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('app-navigate', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth('/api/v1/tenant-admin/form-templates');
      setItems(Array.isArray(data) ? data : []);
      try {
        const ptwTemplate = await fetchWithAuth('/api/v1/tenant-admin/ptw-form-template');
        setPtwTemplateUpdatedAt(ptwTemplate?.updatedAt || null);
      } catch {
        setPtwTemplateUpdatedAt(null);
      }

      try {
        const data = await fetchWithAuth('/api/v1/tenant-admin/data');
        setDataLibraryRecords(Array.isArray(data) ? data : []);
      } catch {
        setDataLibraryRecords([]);
      }
    } catch (error) {
      console.error('Failed to load form templates', error);
      setToast({ type: 'error', message: 'Failed to load form templates.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadVersionHistory = async (formId: string) => {
    try {
      const data = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(formId)}/versions`);
      setVersions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load form versions', error);
      setVersions([]);
    }
  };

  const pathname = window.location.pathname;
  const isCreateRoute = pathname === '/tenant-admin/form-builder/new';
  const editMatch = pathname.match(/^\/tenant-admin\/form-builder\/([^/]+)$/);
  const routeEditId = editMatch ? decodeURIComponent(editMatch[1]) : null;
  const routeKey = isCreateRoute ? 'new' : routeEditId ? `edit:${routeEditId}` : 'list';
  const isEditorRoute = routeKey !== 'list';

  useEffect(() => {
    if (routeKey === initializedRoute) return;

    if (routeKey === 'list') {
      setEditingId(null);
      setFormState(initialForm);
      setFormErrors({});
      setEditorError(null);
      setWorkingTemplate(null);
      setActiveTab('canvas');
      setInitializedRoute(routeKey);
      return;
    }

    setRules(initialRuleRows);
    setWorkflowSteps(initialWorkflowSteps);
    setActivePermissionRoleKey(TENANT_ROLE_TEMPLATES[0]?.key || 'admin');
    setPermissionsByRole(Object.fromEntries(TENANT_ROLE_TEMPLATES.map((roleTemplate) => [roleTemplate.key, { ...roleTemplate.permissions }])));
    setRuleDraft({ field: '', operator: 'Equals', value: '', action: 'show', target: '' });
    setRuleError(null);

    if (routeKey === 'new') {
      setEditingId(null);
      const nextTemplate = createNewTemplate();
      setWorkingTemplate(nextTemplate);
      setCurrentVersionNumber(null);
      setIsReadOnlyVersionView(false);
      setVersions([]);
      setFormState({
        name: nextTemplate.name,
        sections: String(nextTemplate.sections.length),
        conditionalRules: String(countRuleLikeConditionsForTemplate(nextTemplate)),
        status: 'draft',
      });
      setFormErrors({});
      setEditorError(null);
      setActiveTab('canvas');
      setInitializedRoute(routeKey);
      return;
    }

    if (routeEditId === 'ptw-example') {
      const nextTemplate = clonePtwTemplate();
      setEditingId('ptw-example');
      setWorkingTemplate(nextTemplate);
      setCurrentVersionNumber(null);
      setIsReadOnlyVersionView(false);
      setVersions([]);
      setFormState({
        name: nextTemplate.name,
        sections: String(nextTemplate.sections.length),
        conditionalRules: String(countRuleLikeConditionsForTemplate(nextTemplate)),
        status: 'draft',
      });
      setFormErrors({});
      setEditorError(null);
      setActiveTab('canvas');
      setInitializedRoute(routeKey);

      void (async () => {
        try {
          const response = await fetchWithAuth('/api/v1/tenant-admin/ptw-form-template');
          const persistedTemplate = response?.template as FormTemplateUpsert | null;
          if (!persistedTemplate || !Array.isArray(persistedTemplate.sections)) return;

          setWorkingTemplate(persistedTemplate);
          setFormState((prev) => ({
            ...prev,
            name: persistedTemplate.name,
            sections: String(persistedTemplate.sections.length),
            conditionalRules: String(countRuleLikeConditionsForTemplate(persistedTemplate)),
          }));
        } catch (error) {
          console.error('Failed to load persisted PTW template', error);
        }
      })();

      return;
    }

    if (!routeEditId) return;
    if (isLoading) return;

    const item = items.find((entry) => entry.id === routeEditId);
    if (!item) {
      setToast({ type: 'error', message: 'Form template not found.' });
      navigate('/tenant-admin/form-builder');
      return;
    }

    setEditingId(item.id);
    setWorkingTemplate(createFallbackTemplateForForm(item.name));
    setIsReadOnlyVersionView(false);
    setFormState({
      name: item.name,
      sections: item.sections > 0 ? String(item.sections) : '',
      conditionalRules: item.conditionalRules > 0 ? String(item.conditionalRules) : '',
      status: item.status,
    });
    setFormErrors({});
    setEditorError(null);
    setActiveTab('canvas');
    setInitializedRoute(routeKey);

    void loadVersionHistory(item.id);

    void (async () => {
      try {
        if (item.status === 'published') {
          const drafted = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(item.id)}/versions/draft-from-published`, {
            method: 'POST',
          });
          if (drafted?.versionNumber) {
            setCurrentVersionNumber(Number(drafted.versionNumber));
          }
        }

        const response = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(item.id)}/schema`);
        const persistedTemplate = response?.template as FormTemplateUpsert | null;
        if (!persistedTemplate || !Array.isArray(persistedTemplate.sections)) return;

        setWorkingTemplate(persistedTemplate);
        setFormState((prev) => ({
          ...prev,
          name: persistedTemplate.name || prev.name,
          sections: String(persistedTemplate.sections.length),
          conditionalRules: String(countRuleLikeConditionsForTemplate(persistedTemplate)),
        }));
        if (response?.versionNumber) {
          setCurrentVersionNumber(Number(response.versionNumber));
        }
        await loadVersionHistory(item.id);
      } catch (error) {
        console.error('Failed to load form template schema', error);
      }
    })();
  }, [routeKey, routeEditId, initializedRoute, isLoading, items, routeTick]);

  const parseOptionalPositiveInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  };

  const saveFormTemplate = async () => {
    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) nextErrors.name = 'Name is required.';
    setFormErrors(nextErrors);
    setEditorError(null);
    if (Object.keys(nextErrors).length > 0) return;
    if (isReadOnlyVersionView) {
      setEditorError('Read-only version view is enabled. Exit version view to edit and save.');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      sections: workingTemplate ? workingTemplate.sections.length : parseOptionalPositiveInt(formState.sections),
      conditionalRules: workingTemplate ? countRuleLikeConditionsForTemplate(workingTemplate) : parseOptionalPositiveInt(formState.conditionalRules),
      status: formState.status,
    };

    if (editingId === 'ptw-example' && workingTemplate) {
      const nextTemplate: FormTemplateUpsert = {
        ...workingTemplate,
        name: formState.name.trim(),
      };
      setIsSubmitting(true);
      try {
        const response = await fetchWithAuth('/api/v1/tenant-admin/ptw-form-template', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: nextTemplate }),
        });
        const persistedTemplate = (response?.template as FormTemplateUpsert | null) || nextTemplate;
        setWorkingTemplate(persistedTemplate);
        setToast({ type: 'success', message: 'PTW example saved for this tenant and visible to all users.' });
      } catch (error) {
        console.error('Failed to persist PTW example template', error);
        setEditorError('Could not save PTW template. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (editingId && workingTemplate) {
      const nextTemplate: FormTemplateUpsert = {
        ...workingTemplate,
        name: formState.name.trim(),
      };

      setIsSubmitting(true);
      try {
        const savedSchema = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}/schema`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: nextTemplate }),
        });
        if (savedSchema?.versionNumber) {
          setCurrentVersionNumber(Number(savedSchema.versionNumber));
        }
      } catch (error) {
        console.error('Failed to persist form template schema', error);
        setEditorError('Could not save form schema. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        await loadVersionHistory(editingId);
        setToast({ type: 'success', message: 'Form template updated.' });
      } else {
        const created = await fetchWithAuth('/api/v1/tenant-admin/form-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (created?.id && workingTemplate) {
          const schemaSaved = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(created.id)}/schema`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: { ...workingTemplate, name: formState.name.trim() } }),
          });
          if (schemaSaved?.versionNumber) {
            setCurrentVersionNumber(Number(schemaSaved.versionNumber));
          }
        }

        setToast({ type: 'success', message: 'Form template created.' });
        if (created?.id) {
          navigate(`/tenant-admin/form-builder/${encodeURIComponent(created.id)}`);
        }
      }

      await loadItems();
    } catch (error) {
      console.error('Failed to save form template', error);
      setEditorError('Could not save form template. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadPtwExampleIntoEditor = () => {
    const nextTemplate = clonePtwTemplate();
    setWorkingTemplate(nextTemplate);
    setFormState((prev) => ({
      ...prev,
      name: nextTemplate.name,
      sections: String(nextTemplate.sections.length),
      conditionalRules: String(countRuleLikeConditionsForTemplate(nextTemplate)),
      status: 'draft',
    }));
    setEditingId('ptw-example');
    if (window.location.pathname !== '/tenant-admin/form-builder/ptw-example') {
      navigate('/tenant-admin/form-builder/ptw-example');
    }
    setToast({ type: 'success', message: 'PTW form example loaded into editor.' });
  };

  const updateTemplateName = (name: string) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return { ...prev, name };
    });
  };

  const updateSectionLabel = (sectionIndex: number, label: string) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => (index === sectionIndex ? { ...section, label } : section)),
      };
    });
  };

  const updateFieldLabel = (sectionIndex: number, fieldIndex: number, label: string) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          return {
            ...section,
            fields: section.fields.map((field, idx) => (idx === fieldIndex ? { ...field, label } : field)),
          };
        }),
      };
    });
  };

  const addSection = () => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const nextSections = [
        ...prev.sections,
        {
          key: `section_${Date.now()}`,
          label: `Section ${prev.sections.length + 1}`,
          order: prev.sections.length + 1,
          fields: [],
        } as FormSectionConfig,
      ];
      return { ...prev, sections: nextSections };
    });
  };

  const removeSection = (sectionIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const nextSections = prev.sections
        .filter((_, index) => index !== sectionIndex)
        .map((section, index) => ({ ...section, order: index + 1 }));
      return { ...prev, sections: nextSections };
    });
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const targetIndex = sectionIndex + direction;
      if (targetIndex < 0 || targetIndex >= prev.sections.length) return prev;
      const nextSections = [...prev.sections];
      const [moved] = nextSections.splice(sectionIndex, 1);
      nextSections.splice(targetIndex, 0, moved);
      return {
        ...prev,
        sections: nextSections.map((section, index) => ({ ...section, order: index + 1 })),
      };
    });
  };

  const moveSectionToIndex = (fromIndex: number, toIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const maxIndex = prev.sections.length;
      if (fromIndex < 0 || fromIndex >= maxIndex) return prev;
      const boundedTarget = Math.max(0, Math.min(toIndex, maxIndex));
      let insertAt = boundedTarget;
      if (fromIndex < boundedTarget) insertAt -= 1;

      const nextSections = [...prev.sections];
      const [moved] = nextSections.splice(fromIndex, 1);
      if (!moved) return prev;
      nextSections.splice(insertAt, 0, moved);
      return {
        ...prev,
        sections: nextSections.map((section, index) => ({ ...section, order: index + 1 })),
      };
    });
  };

  const addField = (sectionIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          const nextField: FormFieldConfig = {
            key: `field_${Date.now()}_${section.fields.length + 1}`,
            label: `New Field ${section.fields.length + 1}`,
            type: 'text',
            required: false,
          };
          return { ...section, fields: [...section.fields, nextField] };
        }),
      };
    });
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          return { ...section, fields: section.fields.filter((_, idx) => idx !== fieldIndex) };
        }),
      };
    });
  };

  const moveFieldInSection = (sectionIndex: number, fieldIndex: number, direction: -1 | 1) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          const targetIndex = fieldIndex + direction;
          if (targetIndex < 0 || targetIndex >= section.fields.length) return section;
          const nextFields = [...section.fields];
          const [moved] = nextFields.splice(fieldIndex, 1);
          nextFields.splice(targetIndex, 0, moved);
          return { ...section, fields: nextFields };
        }),
      };
    });
  };

  const moveFieldAcrossSections = (sourceSectionIndex: number, fieldIndex: number, targetSectionKey: string) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;

      const sourceSection = prev.sections[sourceSectionIndex];
      const field = sourceSection?.fields[fieldIndex];
      if (!field) return prev;

      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index === sourceSectionIndex) {
            return { ...section, fields: section.fields.filter((_, idx) => idx !== fieldIndex) };
          }
          if (section.key === targetSectionKey) {
            return { ...section, fields: [...section.fields, field] };
          }
          return section;
        }),
      };
    });
  };

  const moveFieldToIndex = (
    sourceSectionIndex: number,
    sourceFieldIndex: number,
    targetSectionKey: string,
    targetIndex: number
  ) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;

      const sourceSection = prev.sections[sourceSectionIndex];
      const movedField = sourceSection?.fields[sourceFieldIndex];
      const targetSectionIndex = prev.sections.findIndex((section) => section.key === targetSectionKey);
      if (!movedField || targetSectionIndex === -1) return prev;

      if (sourceSectionIndex === targetSectionIndex) {
        const nextFields = [...sourceSection.fields];
        const [field] = nextFields.splice(sourceFieldIndex, 1);
        if (!field) return prev;

        let insertAt = Math.max(0, Math.min(targetIndex, nextFields.length));
        if (sourceFieldIndex < insertAt) insertAt -= 1;
        nextFields.splice(insertAt, 0, field);

        return {
          ...prev,
          sections: prev.sections.map((section, index) =>
            index === sourceSectionIndex ? { ...section, fields: nextFields } : section
          ),
        };
      }

      const sourceFields = sourceSection.fields.filter((_, index) => index !== sourceFieldIndex);
      const targetFields = [...prev.sections[targetSectionIndex].fields];
      const insertAt = Math.max(0, Math.min(targetIndex, targetFields.length));
      targetFields.splice(insertAt, 0, movedField);

      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index === sourceSectionIndex) return { ...section, fields: sourceFields };
          if (index === targetSectionIndex) return { ...section, fields: targetFields };
          return section;
        }),
      };
    });
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updater: (field: FormFieldConfig) => FormFieldConfig) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          return {
            ...section,
            fields: section.fields.map((field, idx) => (idx === fieldIndex ? updater(field) : field)),
          };
        }),
      };
    });
  };

  const selectedFieldResolved = useMemo(() => {
    if (!workingTemplate || !selectedField) return null;
    const sectionIndex = workingTemplate.sections.findIndex((section) => section.key === selectedField.sectionKey);
    if (sectionIndex === -1) return null;
    const fieldIndex = workingTemplate.sections[sectionIndex].fields.findIndex((field) => field.key === selectedField.fieldKey);
    if (fieldIndex === -1) return null;
    return {
      sectionIndex,
      fieldIndex,
      section: workingTemplate.sections[sectionIndex],
      field: workingTemplate.sections[sectionIndex].fields[fieldIndex],
    };
  }, [workingTemplate, selectedField]);

  const toggleSectionCollapsed = (sectionKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const jumpToSection = (sectionKey: string) => {
    const target = sectionRefs.current[sectionKey];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionKey(sectionKey);
    }
  };

  const addFieldFromType = (sectionKey: string | null, type: FormFieldType) => {
    if (!workingTemplate) return;
    const targetKey = sectionKey || workingTemplate.sections[0]?.key;
    if (!targetKey) return;

    const sectionIndex = workingTemplate.sections.findIndex((section) => section.key === targetKey);
    if (sectionIndex === -1) return;

    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((section, index) => {
          if (index !== sectionIndex) return section;
          const now = Date.now();
          const newField: FormFieldConfig = {
            key: `field_${now}`,
            label: `${type.toUpperCase()} Field`,
            type,
            required: false,
            ...(type === 'select' || type === 'multiselect' || type === 'radio' || type === 'yesno'
              ? { manualOptions: type === 'yesno' ? ['Yes', 'No'] : ['Option 1', 'Option 2'] }
              : {}),
            ...(type === 'table' ? { tableColumns: ['Column 1', 'Column 2'] } : {}),
          };
          return { ...section, fields: [...section.fields, newField] };
        }),
      };
    });
  };

  const duplicateSection = (sectionIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const source = prev.sections[sectionIndex];
      if (!source) return prev;
      const cloned: FormSectionConfig = {
        ...JSON.parse(JSON.stringify(source)),
        key: `${source.key}_copy_${Date.now()}`,
        label: `${source.label} (Copy)`,
      };
      const sections = [...prev.sections];
      sections.splice(sectionIndex + 1, 0, cloned);
      return { ...prev, sections: sections.map((section, index) => ({ ...section, order: index + 1 })) };
    });
  };

  const duplicateField = (sectionIndex: number, fieldIndex: number) => {
    setWorkingTemplate((prev) => {
      if (!prev) return prev;
      const section = prev.sections[sectionIndex];
      const source = section?.fields[fieldIndex];
      if (!section || !source) return prev;
      const cloned: FormFieldConfig = {
        ...JSON.parse(JSON.stringify(source)),
        key: `${source.key}_copy_${Date.now()}`,
        label: `${source.label} (Copy)`,
      };
      return {
        ...prev,
        sections: prev.sections.map((entry, index) => {
          if (index !== sectionIndex) return entry;
          const fields = [...entry.fields];
          fields.splice(fieldIndex + 1, 0, cloned);
          return { ...entry, fields };
        }),
      };
    });
  };

  const getFieldTypeIcon = (type: FormFieldType) => {
    if (type === 'text' || type === 'textarea' || type === 'static') return Type;
    if (type === 'number') return List;
    if (type === 'date' || type === 'datetime') return Calendar;
    if (type === 'time') return Clock3;
    if (type === 'yesno') return ToggleLeft;
    if (type === 'select' || type === 'multiselect') return ListChecks;
    if (type === 'checkbox') return CheckSquare;
    if (type === 'radio') return CircleDot;
    if (type === 'signature') return PenLine;
    if (type === 'file') return Paperclip;
    if (type === 'table') return Table;
    return AlignLeft;
  };

  const setFormStatus = async (status: FormDraft['status']) => {
    setFormState((prev) => ({ ...prev, status }));

    if (!editingId || editingId === 'ptw-example') {
      return;
    }

    try {
      if (status === 'draft') {
        const draft = await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}/versions/draft-from-published`, {
          method: 'POST',
        });
        if (draft?.schema) {
          setWorkingTemplate(draft.schema as FormTemplateUpsert);
        }
        if (draft?.versionNumber) {
          setCurrentVersionNumber(Number(draft.versionNumber));
        }
        setIsReadOnlyVersionView(false);
      } else if (status === 'published') {
        if (!currentVersionNumber) {
          setToast({ type: 'error', message: 'No editable draft version selected to publish.' });
          return;
        }

        const published = await fetchWithAuth(
          `/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}/versions/${currentVersionNumber}/publish`,
          { method: 'POST' }
        );
        if (published?.versionNumber) {
          setCurrentVersionNumber(Number(published.versionNumber));
        }
      } else {
        await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }

      await loadItems();
      await loadVersionHistory(editingId);
      setToast({ type: 'success', message: `Form marked as ${status}.` });
    } catch (error) {
      console.error('Failed to update form status', error);
      setToast({ type: 'error', message: 'Failed to update form status.' });
    }
  };

  const updateItemStatus = async (item: FormTemplate, status: FormDraft['status']) => {
    if (item.id === 'ptw-example') {
      setToast({ type: 'error', message: 'PTW example status is fixed in listing.' });
      return;
    }
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setToast({ type: 'success', message: `${item.name} marked as ${status}.` });
      await loadItems();
    } catch (error) {
      console.error('Failed to update status from listing', error);
      setToast({ type: 'error', message: 'Failed to update form status.' });
    }
  };

  const viewVersion = async (versionNumber: number) => {
    if (!editingId || editingId === 'ptw-example') return;
    try {
      const version = await fetchWithAuth(
        `/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}/versions/${versionNumber}`
      );
      if (version?.schema) {
        setWorkingTemplate(version.schema as FormTemplateUpsert);
        setCurrentVersionNumber(Number(version.versionNumber));
        setFormState((prev) => ({ ...prev, status: version.status }));
        setIsReadOnlyVersionView(version.status !== 'draft');
      }
    } catch (error) {
      console.error('Failed to view version', error);
      setToast({ type: 'error', message: 'Failed to view selected version.' });
    }
  };

  const rollbackVersion = async (versionNumber: number) => {
    if (!editingId || editingId === 'ptw-example') return;
    try {
      const rollback = await fetchWithAuth(
        `/api/v1/tenant-admin/form-templates/${encodeURIComponent(editingId)}/versions/${versionNumber}/rollback`,
        { method: 'POST' }
      );
      if (rollback?.schema) {
        setWorkingTemplate(rollback.schema as FormTemplateUpsert);
        setCurrentVersionNumber(Number(rollback.versionNumber));
        setFormState((prev) => ({ ...prev, status: 'published' }));
        setIsReadOnlyVersionView(false);
      }
      await loadItems();
      await loadVersionHistory(editingId);
      setToast({ type: 'success', message: `Rolled back and published as v${rollback?.versionNumber}.` });
    } catch (error) {
      console.error('Failed to rollback version', error);
      setToast({ type: 'error', message: 'Failed to rollback version.' });
    }
  };

  const duplicateItem = async (item: FormTemplate) => {
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${item.id}/duplicate`, { method: 'POST' });
      setToast({ type: 'success', message: 'Form template duplicated.' });
      await loadItems();
    } catch (error) {
      console.error('Failed to duplicate form template', error);
      setToast({ type: 'error', message: 'Failed to duplicate form template.' });
    }
  };

  const deleteItem = async (item: FormTemplate) => {
    if (!window.confirm(`Delete form '${item.name}'?`)) return;
    try {
      await fetchWithAuth(`/api/v1/tenant-admin/form-templates/${item.id}`, { method: 'DELETE' });
      setToast({ type: 'success', message: 'Form template deleted.' });
      await loadItems();
    } catch (error) {
      console.error('Failed to delete form template', error);
      setToast({ type: 'error', message: 'Failed to delete form template.' });
    }
  };

  const onBulkFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    try {
      await fetchWithAuth('/api/v1/tenant-admin/form-templates/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      setToast({ type: 'success', message: 'Bulk upload completed.' });
      await loadItems();
    } catch (error) {
      console.error('Failed bulk upload for form templates', error);
      setToast({ type: 'error', message: 'Bulk upload failed for form templates.' });
    } finally {
      event.target.value = '';
    }
  };

  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const listedItems = useMemo(() => {
    const ptwRow: FormTemplate = {
      id: 'ptw-example',
      name: PTW_FORM_TEMPLATE_EXAMPLE.name,
      sections: PTW_FORM_TEMPLATE_EXAMPLE.sections.length,
      conditionalRules: countRuleLikeConditionsForTemplate(PTW_FORM_TEMPLATE_EXAMPLE),
      status: 'published',
      updatedAt: ptwTemplateUpdatedAt || new Date().toISOString(),
    };

    const searchLower = search.toLowerCase().trim();
    const includePtw =
      !searchLower ||
      ptwRow.name.toLowerCase().includes(searchLower) ||
      ptwRow.id.toLowerCase().includes(searchLower);

    const withoutPtw = filtered.filter((item) => item.id !== 'ptw-example');
    return includePtw ? [ptwRow, ...withoutPtw] : withoutPtw;
  }, [filtered, ptwTemplateUpdatedAt, search]);

  const addRule = () => {
    if (!ruleDraft.field.trim() || !ruleDraft.value.trim() || !ruleDraft.target.trim()) {
      setRuleError('Source field, value and target field are required.');
      return;
    }

    const createdRule: RuleRow = {
      id: `rule-${Date.now()}`,
      field: ruleDraft.field.trim(),
      operator: ruleDraft.operator,
      value: ruleDraft.value.trim(),
      action: ruleDraft.action,
      target: ruleDraft.target.trim(),
      status: 'active',
    };

    setRules((prev) => [createdRule, ...prev]);
    setRuleDraft({ field: '', operator: 'Equals', value: '', action: 'show', target: '' });
    setRuleError(null);
    setFormState((prev) => ({ ...prev, conditionalRules: String((rules.length || 0) + 1) }));
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const addWorkflowStep = () => {
    setWorkflowSteps((prev) => [
      ...prev,
      {
        id: `wf-${Date.now()}`,
        title: `Step ${prev.length + 1}: New Action`,
        description: 'Configure a processing or assignment action',
        assignee: 'Operations Team',
        sla: '24h',
        active: true,
      },
    ]);
  };

  const togglePermission = (permissionId: string) => {
    setPermissionsByRole((prev) => {
      const rolePermissions = prev[activePermissionRoleKey] || {};
      return {
        ...prev,
        [activePermissionRoleKey]: {
          ...rolePermissions,
          [permissionId]: !rolePermissions[permissionId],
        },
      };
    });
  };

  const renderCanvasTab = () => {
    const dataLibraryDatasets = Array.from(
      dataLibraryRecords.reduce((acc, item) => {
        const dataset = `${item.scope}:${item.module || item.type || 'General'}:${item.entity || 'Value'}`;
        const values = acc.get(dataset) || new Set<string>();
        values.add(item.value);
        acc.set(dataset, values);
        return acc;
      }, new Map<string, Set<string>>())
    ).map(([key, values]) => ({ key, values: Array.from(values).sort() }));

    const filteredDatasets = dataLibraryDatasets.filter((dataset) =>
      dataset.key.toLowerCase().includes(dataLibrarySearch.toLowerCase())
    );

    const fieldTypeOptions: FormFieldType[] = [
      'text',
      'static',
      'textarea',
      'number',
      'date',
      'time',
      'datetime',
      'checkbox',
      'radio',
      'yesno',
      'select',
      'multiselect',
      'file',
      'signature',
      'table',
      'user',
      'role',
    ];

    const toolboxGroups: Array<{ label: string; types: FormFieldType[] }> = [
      { label: 'Basic', types: ['text', 'textarea', 'number', 'date', 'time', 'yesno'] },
      { label: 'Selection', types: ['select', 'multiselect', 'checkbox', 'radio'] },
      { label: 'Advanced', types: ['signature', 'file', 'table', 'static'] },
    ];

    const selected = selectedFieldResolved;
    const clearDragState = () => {
      setDragState(null);
      setSectionDropIndex(null);
      setFieldDropTarget(null);
    };

    const handleSectionDrop = (dropIndex: number) => {
      if (!dragState || dragState.kind !== 'section') return;
      moveSectionToIndex(dragState.fromIndex, dropIndex);
      clearDragState();
    };

    const handleFieldDrop = (sectionKey: string, targetIndex: number) => {
      if (!dragState || dragState.kind !== 'field') return;
      moveFieldToIndex(dragState.fromSectionIndex, dragState.fromFieldIndex, sectionKey, targetIndex);
      clearDragState();
    };

    return (
      <div className="relative">
      <div className={`min-w-[1280px] grid grid-cols-[280px_minmax(0,1fr)_360px] gap-4 items-start ${isReadOnlyVersionView ? 'opacity-75' : ''}`}>
        <aside className={`card p-0 overflow-hidden ${leftPanelCollapsed ? 'w-14' : ''}`}>
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            {!leftPanelCollapsed ? <p className="text-xs font-bold uppercase text-slate-500">Toolbox</p> : null}
            <button onClick={() => setLeftPanelCollapsed((prev) => !prev)} className="p-1.5 rounded hover:bg-slate-100" title="Toggle Left Panel">
              {leftPanelCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
          {!leftPanelCollapsed ? (
            <div className="p-3 space-y-5 max-h-[70vh] overflow-auto">
              {toolboxGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{group.label}</p>
                  <div className="space-y-1.5">
                    {group.types.map((type) => {
                      const Icon = getFieldTypeIcon(type);
                      return (
                        <button
                          key={type}
                          onClick={() => addFieldFromType(activeSectionKey, type)}
                          className="w-full text-left px-2.5 py-2 rounded border border-slate-200 hover:border-virtus-blue hover:bg-virtus-blue/5 text-sm text-slate-700 flex items-center gap-2"
                          title={`Add ${type}`}
                        >
                          <Icon size={14} /> {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Sections</p>
                  <button onClick={addSection} className="px-2 py-1 rounded border border-slate-200 text-xs font-bold hover:bg-slate-50">+ Add</button>
                </div>
                <div className="space-y-1">
                  {dragState?.kind === 'section' ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setSectionDropIndex(0);
                      }}
                      onDrop={() => handleSectionDrop(0)}
                      className={`h-1 rounded ${sectionDropIndex === 0 ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                    />
                  ) : null}
                  {workingTemplate?.sections.map((section, index) => (
                    <React.Fragment key={section.key}>
                      <div
                        draggable={!isReadOnlyVersionView}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDragState({ kind: 'section', sectionKey: section.key, fromIndex: index });
                        }}
                        onDragEnd={clearDragState}
                        onDragOver={(e) => {
                          if (dragState?.kind !== 'section') return;
                          e.preventDefault();
                          setSectionDropIndex(index + 1);
                        }}
                        onDrop={() => handleSectionDrop(index + 1)}
                        className={`px-2 py-1.5 rounded border text-xs flex items-center justify-between ${activeSectionKey === section.key ? 'border-virtus-blue bg-virtus-blue/10 text-virtus-blue' : 'border-slate-200 text-slate-600'}`}
                      >
                        <button onClick={() => jumpToSection(section.key)} className="text-left truncate flex-1">
                          {index + 1}. {section.label}
                        </button>
                        <div className="flex items-center gap-1 text-slate-400">
                          <GripVertical size={12} />
                        </div>
                      </div>
                      {dragState?.kind === 'section' ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setSectionDropIndex(index + 1);
                          }}
                          onDrop={() => handleSectionDrop(index + 1)}
                          className={`h-1 rounded ${sectionDropIndex === index + 1 ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                        />
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="space-y-4">
          {workingTemplate?.sections.length ? (
            workingTemplate.sections.map((section, sectionIndex) => (
              <React.Fragment key={section.key}>
                {dragState?.kind === 'section' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setSectionDropIndex(sectionIndex);
                    }}
                    onDrop={() => handleSectionDrop(sectionIndex)}
                    className={`h-2 rounded ${sectionDropIndex === sectionIndex ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                  />
                ) : null}
                <div
                  ref={(el) => {
                    sectionRefs.current[section.key] = el;
                  }}
                  draggable={!isReadOnlyVersionView}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragState({ kind: 'section', sectionKey: section.key, fromIndex: sectionIndex });
                  }}
                  onDragEnd={clearDragState}
                  onDragOver={(e) => {
                    if (dragState?.kind !== 'section') return;
                    e.preventDefault();
                    setSectionDropIndex(sectionIndex + 1);
                  }}
                  onDrop={() => {
                    if (dragState?.kind !== 'section') return;
                    handleSectionDrop(sectionIndex + 1);
                  }}
                  className="card p-0 overflow-hidden border-l-4 border-l-virtus-blue"
                >
                  <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GripVertical size={14} className="text-slate-400" />
                      <input
                        className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-700"
                        value={section.label}
                        onFocus={() => setActiveSectionKey(section.key)}
                        onChange={(e) => updateSectionLabel(sectionIndex, e.target.value)}
                      />
                      <span className="text-xs text-slate-400 whitespace-nowrap">{section.fields.length} fields</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSectionCollapsed(section.key)} className="p-1.5 rounded hover:bg-slate-100" title="Collapse/Expand">{collapsedSections[section.key] ? <Plus size={13} /> : <Minus size={13} />}</button>
                      <button onClick={() => duplicateSection(sectionIndex)} className="p-1.5 rounded hover:bg-slate-100" title="Duplicate Section"><Copy size={13} /></button>
                      <button onClick={() => removeSection(sectionIndex)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete Section"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {!collapsedSections[section.key] ? (
                    <div className="p-3 space-y-2 bg-slate-50/40">
                      {section.fields.length === 0 ? (
                        <div
                          onDragOver={(e) => {
                            if (dragState?.kind !== 'field') return;
                            e.preventDefault();
                            setFieldDropTarget({ sectionKey: section.key, index: 0 });
                          }}
                          onDrop={() => handleFieldDrop(section.key, 0)}
                          className={`rounded border border-dashed p-6 text-center text-sm ${fieldDropTarget?.sectionKey === section.key && fieldDropTarget.index === 0 ? 'border-virtus-blue text-virtus-blue bg-virtus-blue/5' : 'border-slate-300 text-slate-400'}`}
                        >
                          Drag a field here or click + Add field
                        </div>
                      ) : (
                        section.fields.map((field, fieldIndex) => {
                          const Icon = getFieldTypeIcon(field.type);
                          const isSelected = selectedField?.sectionKey === section.key && selectedField?.fieldKey === field.key;
                          return (
                            <React.Fragment key={field.key}>
                              {dragState?.kind === 'field' ? (
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setFieldDropTarget({ sectionKey: section.key, index: fieldIndex });
                                  }}
                                  onDrop={() => handleFieldDrop(section.key, fieldIndex)}
                                  className={`h-2 rounded ${fieldDropTarget?.sectionKey === section.key && fieldDropTarget.index === fieldIndex ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                                />
                              ) : null}
                              <div
                                draggable={!isReadOnlyVersionView}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDragState({
                                    kind: 'field',
                                    sectionKey: section.key,
                                    fieldKey: field.key,
                                    fromSectionIndex: sectionIndex,
                                    fromFieldIndex: fieldIndex,
                                  });
                                }}
                                onDragEnd={clearDragState}
                                onDragOver={(e) => {
                                  if (dragState?.kind !== 'field') return;
                                  e.preventDefault();
                                  setFieldDropTarget({ sectionKey: section.key, index: fieldIndex + 1 });
                                }}
                                onDrop={(e) => {
                                  if (dragState?.kind !== 'field') return;
                                  e.stopPropagation();
                                  handleFieldDrop(section.key, fieldIndex + 1);
                                }}
                                onClick={() => {
                                  setSelectedField({ sectionKey: section.key, fieldKey: field.key });
                                  setActiveSectionKey(section.key);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    setSelectedField({ sectionKey: section.key, fieldKey: field.key });
                                    setActiveSectionKey(section.key);
                                  }
                                }}
                                className={`w-full text-left rounded border px-3 py-2 bg-white transition ${isSelected ? 'border-virtus-teal ring-1 ring-virtus-teal/50' : 'border-slate-200 hover:border-slate-300'}`}
                                title="Select field"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GripVertical size={13} className="text-slate-300" />
                                    <Icon size={14} className="text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-700 truncate">{field.label}</span>
                                    <span className="text-[11px] uppercase text-slate-400">{field.type}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedField({ sectionKey: section.key, fieldKey: field.key }); }} className="p-1 rounded hover:bg-slate-100" title="Edit Field"><Edit3 size={12} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); duplicateField(sectionIndex, fieldIndex); }} className="p-1 rounded hover:bg-slate-100" title="Duplicate"><Copy size={12} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); removeField(sectionIndex, fieldIndex); }} className="p-1 rounded hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}

                      {dragState?.kind === 'field' ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setFieldDropTarget({ sectionKey: section.key, index: section.fields.length });
                          }}
                          onDrop={() => handleFieldDrop(section.key, section.fields.length)}
                          className={`h-2 rounded ${fieldDropTarget?.sectionKey === section.key && fieldDropTarget.index === section.fields.length ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                        />
                      ) : null}

                      <button onClick={() => addField(sectionIndex)} className="w-full rounded border border-dashed border-slate-300 px-3 py-2 text-sm font-bold text-slate-500 hover:border-virtus-blue hover:text-virtus-blue">+ Add field</button>
                    </div>
                  ) : null}
                </div>
                {dragState?.kind === 'section' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setSectionDropIndex(sectionIndex + 1);
                    }}
                    onDrop={() => handleSectionDrop(sectionIndex + 1)}
                    className={`h-2 rounded ${sectionDropIndex === sectionIndex + 1 ? 'bg-virtus-blue/60' : 'bg-transparent'}`}
                  />
                ) : null}
              </React.Fragment>
            ))
          ) : (
            <div className="card p-10 text-center text-slate-500">
              <p className="font-semibold">Drag a field here or click + Add field</p>
              <p className="text-sm mt-1">Start by adding a section from the left panel.</p>
            </div>
          )}
        </section>

        <aside className={`card p-0 overflow-hidden ${rightPanelCollapsed ? 'w-14 justify-self-end' : ''}`}>
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            {!rightPanelCollapsed ? <p className="text-xs font-bold uppercase text-slate-500">Field Config</p> : null}
            <button onClick={() => setRightPanelCollapsed((prev) => !prev)} className="p-1.5 rounded hover:bg-slate-100" title="Toggle Right Panel">
              {rightPanelCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </button>
          </div>
          {!rightPanelCollapsed ? (
            <div className="p-3 max-h-[70vh] overflow-auto">
              {!selected ? (
                <div className="text-sm text-slate-400">Select a field from canvas to configure properties.</div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-[11px] uppercase text-slate-400 font-bold">Field Label</label>
                    <input className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={selected.field.label} onChange={(e) => updateFieldLabel(selected.sectionIndex, selected.fieldIndex, e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase text-slate-400 font-bold">Field Type</label>
                    <select className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={selected.field.type} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, type: e.target.value as FormFieldType }))}>
                      {fieldTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase text-slate-400 font-bold">Placeholder</label>
                    <input className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={String(selected.field.placeholder || '')} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, placeholder: e.target.value || undefined }))} />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase text-slate-400 font-bold">Help Text</label>
                    <textarea className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" rows={2} value={String(selected.field.helpText || '')} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, helpText: e.target.value || undefined }))} />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase text-slate-400 font-bold">Default Value</label>
                    <input className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={String(selected.field.defaultValue ?? '')} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, defaultValue: e.target.value || undefined }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected.field.required)} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, required: e.target.checked }))} /> Required</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={!selected.field.visibleWhen} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, visibleWhen: e.target.checked ? undefined : { fact: 'hidden', op: 'eq', value: true } }))} /> Visible</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected.field.readOnlyWhen)} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, readOnlyWhen: e.target.checked ? { fact: 'always_read_only', op: 'eq', value: true } : undefined }))} /> Read-only</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] uppercase text-slate-400 font-bold">Min</label>
                      <input type="number" className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={selected.field.validation?.min ?? ''} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, validation: { ...prev.validation, min: e.target.value ? Number(e.target.value) : undefined } }))} />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase text-slate-400 font-bold">Max</label>
                      <input type="number" className="mt-1 w-full rounded border border-slate-200 px-2.5 py-2" value={selected.field.validation?.max ?? ''} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, validation: { ...prev.validation, max: e.target.value ? Number(e.target.value) : undefined } }))} />
                    </div>
                  </div>

                  {selected.field.type === 'select' || selected.field.type === 'multiselect' || selected.field.type === 'radio' || selected.field.type === 'yesno' ? (
                    <div className="rounded border border-slate-200 p-3 bg-slate-50 space-y-2">
                      <p className="text-[11px] uppercase text-slate-400 font-bold">Option Source</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" checked={!selected.field.optionsSource} onChange={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, optionsSource: undefined }))} /> Manual</label>
                        <label className="flex items-center gap-2"><input type="radio" checked={Boolean(selected.field.optionsSource)} onChange={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, optionsSource: { sourceType: 'data_domain', domainKey: filteredDatasets[0]?.key || dataLibraryDatasets[0]?.key || 'org:General:Value', valuePath: 'value', labelPath: 'value' } }))} /> Data Library</label>
                      </div>

                      {!selected.field.optionsSource ? (
                        <div className="space-y-2">
                          {(selected.field.manualOptions || []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-1">
                              <input className="flex-1 rounded border border-slate-200 px-2 py-1.5" value={option} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => {
                                const manualOptions = [...(prev.manualOptions || [])];
                                manualOptions[optionIndex] = e.target.value;
                                return { ...prev, manualOptions };
                              })} />
                              <button onClick={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => {
                                const manualOptions = [...(prev.manualOptions || [])];
                                const [moved] = manualOptions.splice(optionIndex, 1);
                                manualOptions.splice(Math.max(0, optionIndex - 1), 0, moved);
                                return { ...prev, manualOptions };
                              })} className="p-1 rounded hover:bg-slate-100" title="Move Up"><ArrowUp size={12} /></button>
                              <button onClick={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => {
                                const manualOptions = [...(prev.manualOptions || [])];
                                const [moved] = manualOptions.splice(optionIndex, 1);
                                manualOptions.splice(Math.min(manualOptions.length, optionIndex + 1), 0, moved);
                                return { ...prev, manualOptions };
                              })} className="p-1 rounded hover:bg-slate-100" title="Move Down"><ArrowDown size={12} /></button>
                              <button onClick={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => {
                                const manualOptions = (prev.manualOptions || []).filter((_, idx) => idx !== optionIndex);
                                return { ...prev, manualOptions };
                              })} className="p-1 rounded hover:bg-red-50 text-red-500" title="Remove"><X size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, manualOptions: [...(prev.manualOptions || []), `Option ${(prev.manualOptions || []).length + 1}`] }))} className="px-2 py-1 rounded border border-slate-200 text-xs font-bold">+ Add Option</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            value={dataLibrarySearch}
                            onChange={(e) => setDataLibrarySearch(e.target.value)}
                            placeholder="Search dataset"
                            className="w-full rounded border border-slate-200 px-2 py-1.5"
                          />
                          <select className="w-full rounded border border-slate-200 px-2 py-1.5" value={selected.field.optionsSource.domainKey} onChange={(e) => updateField(selected.sectionIndex, selected.fieldIndex, (prev) => ({ ...prev, optionsSource: { sourceType: 'data_domain', domainKey: e.target.value, valuePath: 'value', labelPath: 'value' } }))}>
                            {filteredDatasets.map((dataset) => <option key={dataset.key} value={dataset.key}>{dataset.key}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
      {isReadOnlyVersionView ? (
        <div className="absolute inset-0 bg-transparent" title="Read-only version view" />
      ) : null}
      </div>
    );
  };

  const renderRulesTab = () => (
    <div className="space-y-6">
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Condition</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Target</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 text-sm text-slate-700">
                  <span className="font-bold text-virtus-blue mr-2">IF</span>
                  <span className="font-medium">{rule.field}</span> {rule.operator.toLowerCase()} <span className="font-medium">{rule.value}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${rule.action === 'show' ? 'bg-virtus-teal/15 text-virtus-navy' : 'bg-virtus-blue/15 text-virtus-brand-blue'}`}>
                    {rule.action === 'show' ? 'Show' : 'Hide'}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{rule.target}</td>
                <td className="px-5 py-4 text-sm">
                  <span className={`font-medium ${rule.status === 'active' ? 'text-virtus-teal' : 'text-slate-400'}`}>{rule.status}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => {
                        setRuleDraft({ field: rule.field, operator: rule.operator, value: rule.value, action: rule.action, target: rule.target });
                        removeRule(rule.id);
                      }}
                      className="p-2 rounded hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit3 size={14} className="text-slate-500" />
                    </button>
                    <button onClick={() => removeRule(rule.id)} className="p-2 rounded hover:bg-red-50" title="Delete">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-bold text-virtus-navy">Create New Rule</h3>
        {ruleError ? <p className="text-sm text-red-600">{ruleError}</p> : null}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input value={ruleDraft.field} onChange={(e) => setRuleDraft((prev) => ({ ...prev, field: e.target.value }))} placeholder="Source field" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={ruleDraft.operator} onChange={(e) => setRuleDraft((prev) => ({ ...prev, operator: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option>Equals</option>
            <option>Does Not Equal</option>
            <option>Greater Than</option>
            <option>Less Than</option>
            <option>Contains</option>
          </select>
          <input value={ruleDraft.value} onChange={(e) => setRuleDraft((prev) => ({ ...prev, value: e.target.value }))} placeholder="Value" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={ruleDraft.action} onChange={(e) => setRuleDraft((prev) => ({ ...prev, action: e.target.value as 'show' | 'hide' }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="show">Show</option>
            <option value="hide">Hide</option>
          </select>
          <input value={ruleDraft.target} onChange={(e) => setRuleDraft((prev) => ({ ...prev, target: e.target.value }))} placeholder="Target field" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end">
          <button onClick={addRule} className="px-5 py-2.5 rounded-lg bg-virtus-blue text-white text-sm font-bold hover:opacity-90">Save Rule</button>
        </div>
      </div>
    </div>
  );

  const renderWorkflowTab = () => (
    <div className="space-y-4">
      {workflowSteps.map((step, index) => (
        <div key={step.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.active ? 'bg-virtus-blue text-white' : 'bg-slate-200 text-slate-500'}`}>
                {index === 0 ? <Bot size={18} /> : <Route size={18} />}
              </div>
              <div>
                <p className="font-bold text-virtus-navy">{step.title}</p>
                <p className="text-sm text-slate-500">{step.description}</p>
              </div>
            </div>
            <button onClick={() => setWorkflowSteps((prev) => prev.filter((item) => item.id !== step.id))} className="p-2 rounded hover:bg-red-50">
              <Trash2 size={15} className="text-red-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={step.assignee} onChange={(e) => setWorkflowSteps((prev) => prev.map((item) => (item.id === step.id ? { ...item, assignee: e.target.value } : item)))} />
            <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={step.sla} onChange={(e) => setWorkflowSteps((prev) => prev.map((item) => (item.id === step.id ? { ...item, sla: e.target.value } : item)))} />
          </div>
        </div>
      ))}

      <button onClick={addWorkflowStep} className="w-full px-5 py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-virtus-blue hover:text-virtus-blue">
        Add next workflow step
      </button>

      <div className="card p-5 bg-virtus-blue/5 border-virtus-blue/20">
        <p className="font-bold text-virtus-navy">Workflow Summary</p>
        <p className="text-sm text-slate-600 mt-1">This workflow has {workflowSteps.length} steps and {workflowSteps.filter((step) => step.active).length} active actions.</p>
      </div>
    </div>
  );

  const renderRolesTab = () => (
    <div className="space-y-6">
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {TENANT_ROLE_TEMPLATES.map((roleTemplate) => (
              <button
                key={roleTemplate.key}
                onClick={() => setActivePermissionRoleKey(roleTemplate.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  roleTemplate.key === activePermissionRoleKey
                    ? 'border-virtus-blue bg-virtus-blue/10 text-virtus-blue'
                    : 'border-slate-200 text-slate-500 hover:bg-white'
                }`}
              >
                {roleTemplate.name}
              </button>
            ))}
          </div>
          <p className="font-bold text-virtus-navy">
            Permission Matrix: {TENANT_ROLE_TEMPLATES.find((roleTemplate) => roleTemplate.key === activePermissionRoleKey)?.name || 'Role'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Manage access for form assets and submission data.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {(Object.keys(SECTION_LABELS) as PermissionSectionKey[]).map((sectionKey) => (
            <div key={sectionKey} className="px-6 py-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{SECTION_LABELS[sectionKey]}</h3>
              {TENANT_PERMISSION_DEFINITIONS.filter((permission: TenantPermissionDefinition) => permission.section === sectionKey).map((permission) => (
                <div key={permission.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-800">{permission.label}</p>
                    <p className="text-xs text-slate-500">{permission.note}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(permissionsByRole[activePermissionRoleKey]?.[permission.id])}
                    onChange={() => togglePermission(permission.id)}
                    className="rounded border-slate-300 text-virtus-blue"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Sarah Connor', 'Michael Chen', 'Assign New Admin'].map((member) => (
          <div key={member} className="card p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{member}</p>
              <p className="text-xs text-slate-500">admin workspace</p>
            </div>
            {member === 'Assign New Admin' ? <UserPlus size={16} className="text-virtus-blue" /> : <ShieldCheck size={16} className="text-virtus-teal" />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Form Builder">
      <div className="space-y-6">
        {toast ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-virtus-teal/40 bg-virtus-teal/10 text-virtus-navy'}`}>
            {toast.message}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-sm text-slate-500 max-w-2xl">Build your form structure, logic, workflow, and access from one workspace.</p>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Bulk Upload</button>
            <button onClick={() => navigate('/tenant-admin/form-builder/new')} className="btn-primary flex items-center gap-2"><Plus size={16} /> New Form</button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={onBulkFileSelect} className="hidden" />

        {isEditorRoute ? (
          <>
            <div className={`card p-4 space-y-3 sticky top-0 z-10 ${isSubmitting ? 'opacity-80 animate-pulse' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => navigate('/tenant-admin/form-builder')} className="px-2.5 py-1.5 rounded border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5">
                    <ArrowLeft size={13} /> Forms
                  </button>
                  <input
                    className={`min-w-[360px] rounded border px-3 py-2 text-base font-bold text-virtus-navy ${formErrors.name ? 'border-red-300' : 'border-slate-200'}`}
                    value={formState.name}
                    onChange={(e) => {
                      setFormState((prev) => ({ ...prev, name: e.target.value }));
                      updateTemplateName(e.target.value);
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Untitled Form"
                  />
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${formState.status === 'published' ? 'bg-virtus-teal/15 text-virtus-teal' : formState.status === 'archived' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{formState.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewOpen(true)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 flex items-center gap-2"><Eye size={14} /> Preview</button>
                  {editingId && editingId !== 'ptw-example' ? (
                    <button onClick={() => setVersionHistoryOpen(true)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50">Version history</button>
                  ) : null}
                  <button disabled={isReadOnlyVersionView} onClick={() => setFormStatus('draft')} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50">Save Draft</button>
                  <button disabled={isReadOnlyVersionView} onClick={() => setFormStatus('published')} className="px-3 py-2 rounded-lg border border-virtus-teal/30 text-virtus-navy text-sm font-bold hover:bg-virtus-teal/10 disabled:opacity-50">Publish</button>
                  <button onClick={saveFormTemplate} disabled={isSubmitting || isReadOnlyVersionView} className="px-3 py-2 rounded-lg bg-virtus-blue text-white text-sm font-bold hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                    <Save size={14} /> {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-4">
                <span>Sections: {workingTemplate?.sections.length || 0}</span>
                <span>Rules: {workingTemplate ? countRuleLikeConditionsForTemplate(workingTemplate) : 0}</span>
                {currentVersionNumber ? <span>Version: v{currentVersionNumber}</span> : null}
                <button onClick={loadPtwExampleIntoEditor} className="text-virtus-blue font-bold hover:underline">Load PTW reference</button>
                <button onClick={() => setFormStatus('archived')} className="text-amber-700 font-bold hover:underline">Archive</button>
              </div>
              {isReadOnlyVersionView ? <p className="text-xs text-amber-700">Viewing a non-draft version in read-only mode.</p> : null}
              {editorError ? <p className="text-sm text-red-600">{editorError}</p> : null}
            </div>

            {renderCanvasTab()}

            {previewOpen ? (
              <div className="fixed inset-0 z-50 bg-slate-950/60 p-6" onClick={() => setPreviewOpen(false)}>
                <div className="h-full w-full flex items-center justify-center">
                  <div className={`bg-white rounded-xl shadow-xl border border-slate-200 overflow-auto ${mobilePreview ? 'w-[420px] h-[90vh]' : 'w-[92vw] h-[90vh]'}`} onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-virtus-navy">Preview</p>
                        <button onClick={() => setMobilePreview((prev) => !prev)} className="px-2 py-1 rounded border border-slate-200 text-xs font-bold hover:bg-slate-50">
                          {mobilePreview ? 'Desktop view' : 'Mobile view'}
                        </button>
                      </div>
                      <button onClick={() => setPreviewOpen(false)} className="p-2 rounded hover:bg-slate-100"><X size={16} /></button>
                    </div>
                    <div className="p-4 space-y-4">
                      {workingTemplate?.sections.map((section) => {
                        const fieldsByKey = new Map(section.fields.map((f) => [f.key, f]));
                        const consumedKeys = new Set<string>();
                        const groups = section.layout?.groups || [];

                        const getColSpanClass = (field: FormFieldConfig, columns?: 1 | 2 | 3) => {
                          const cols = columns || 2;
                          const span = field.layout?.colSpan;
                          if (!span || span <= 1 || cols === 1) return '';
                          if (cols === 2) return span >= 2 ? 'md:col-span-2' : '';
                          if (cols === 3) return span >= 3 ? 'md:col-span-3' : span === 2 ? 'md:col-span-2' : '';
                          return '';
                        };

                        const getGridClass = (columns?: 1 | 2 | 3) => {
                          if (columns === 1) return 'grid-cols-1';
                          if (columns === 3) return 'grid-cols-1 md:grid-cols-3';
                          return 'grid-cols-1 md:grid-cols-2';
                        };

                        const renderPreviewField = (field: FormFieldConfig) => {
                          const requiredMark = field.required ? <span className="text-red-500 ml-1">*</span> : null;

                          if (field.type === 'checkbox') {
                            return (
                              <label className="text-sm flex items-center gap-2 border border-slate-200 rounded p-2">
                                <input type="checkbox" disabled />
                                <span>{field.label}{requiredMark}</span>
                              </label>
                            );
                          }
                          if (field.type === 'radio' || field.type === 'yesno') {
                            const opts = field.manualOptions?.length ? field.manualOptions : field.type === 'yesno' ? ['Yes', 'No'] : ['Option 1', 'Option 2'];
                            return (
                              <div>
                                <p className="font-semibold text-sm">{field.label}{requiredMark}</p>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                  {opts.map((o) => <label key={o} className="flex items-center gap-2"><input type="radio" disabled /> {o}</label>)}
                                </div>
                              </div>
                            );
                          }
                          if (field.type === 'select' || field.type === 'multiselect') {
                            const opts = field.manualOptions?.length ? field.manualOptions : field.optionsSource?.domainKey ? [`[${field.optionsSource.domainKey}]`] : ['Option 1', 'Option 2'];
                            return (
                              <label className="text-sm block">
                                <span className="font-semibold">{field.label}{requiredMark}</span>
                                <select disabled className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white">
                                  <option>-- Select --</option>
                                  {opts.map((o) => <option key={o}>{o}</option>)}
                                </select>
                              </label>
                            );
                          }
                          if (field.type === 'textarea') {
                            return (
                              <label className="text-sm block">
                                <span className="font-semibold">{field.label}{requiredMark}</span>
                                <textarea disabled className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white" rows={3} />
                              </label>
                            );
                          }
                          if (field.type === 'signature') {
                            return (
                              <label className="text-sm block">
                                <span className="font-semibold">{field.label}{requiredMark}</span>
                                <div className="mt-1 h-20 border border-dashed border-slate-300 rounded bg-white px-3 py-2 text-slate-400">Signature area</div>
                              </label>
                            );
                          }
                          if (field.type === 'file') {
                            return (
                              <label className="text-sm block">
                                <span className="font-semibold">{field.label}{requiredMark}</span>
                                <input type="file" disabled className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white" />
                              </label>
                            );
                          }
                          if (field.type === 'table') {
                            const columns = field.tableColumns?.length ? field.tableColumns : ['Column 1', 'Column 2'];
                            return (
                              <div className="text-sm block md:col-span-2">
                                <p className="font-semibold">{field.label}{requiredMark}</p>
                                <div className="mt-1 overflow-x-auto border border-slate-200 rounded">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-slate-50"><tr>{columns.map((c) => <th key={c} className="px-2 py-1 text-left border-b border-slate-200">{c}</th>)}</tr></thead>
                                    <tbody><tr>{columns.map((c) => <td key={c} className="px-2 py-1 border-b border-slate-100"><input disabled className="w-full rounded border border-slate-200 px-2 py-1" /></td>)}</tr></tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          }
                          if (field.type === 'static') {
                            return <div className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-700">{field.label}</div>;
                          }
                          return (
                            <label className="text-sm block">
                              <span className="font-semibold">{field.label}{requiredMark}</span>
                              <input
                                disabled
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 bg-white"
                              />
                            </label>
                          );
                        };

                        return (
                          <div key={section.key} className="card p-0 overflow-hidden">
                            <div className="bg-virtus-blue text-white px-4 py-2.5 font-bold">{section.label}</div>
                            <div className="p-4 space-y-4">
                              {groups.map((group) => {
                                const groupFields = group.fieldKeys.map((k) => fieldsByKey.get(k)).filter((f): f is FormFieldConfig => Boolean(f));
                                groupFields.forEach((f) => consumedKeys.add(f.key));
                                if (groupFields.length === 0) return null;
                                return (
                                  <div key={group.key} className="border border-slate-200 rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">{group.label}</div>
                                    <div className={`p-3 grid gap-4 ${getGridClass(group.columns)}`}>
                                      {groupFields.map((f) => <div key={f.key} className={getColSpanClass(f, group.columns)}>{renderPreviewField(f)}</div>)}
                                    </div>
                                  </div>
                                );
                              })}

                              {section.fields.some((f) => !consumedKeys.has(f.key)) ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">Additional Details</div>
                                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {section.fields.filter((f) => !consumedKeys.has(f.key)).map((f) => <div key={f.key} className={getColSpanClass(f, 2)}>{renderPreviewField(f)}</div>)}
                                  </div>
                                </div>
                              ) : null}

                              {groups.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {section.fields.map((f) => <div key={f.key} className={getColSpanClass(f, 2)}>{renderPreviewField(f)}</div>)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {versionHistoryOpen ? (
              <div className="fixed inset-0 z-50" onClick={() => setVersionHistoryOpen(false)}>
                <div className="absolute inset-0 bg-slate-900/40" />
                <div className="absolute right-0 top-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-virtus-navy">Version history</p>
                      <p className="text-xs text-slate-500">Published versions are immutable. Edit creates a draft version.</p>
                    </div>
                    <button onClick={() => setVersionHistoryOpen(false)} className="p-2 rounded hover:bg-slate-100"><X size={16} /></button>
                  </div>
                  <div className="p-3 space-y-2 overflow-auto h-[calc(100%-64px)]">
                    {versions.length === 0 ? (
                      <p className="text-sm text-slate-400">No versions available.</p>
                    ) : (
                      versions.map((version) => (
                        <div key={version.versionNumber} className={`rounded border p-3 ${version.status === 'published' ? 'border-virtus-teal bg-virtus-teal/5' : 'border-slate-200'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-700">v{version.versionNumber}</p>
                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${version.status === 'published' ? 'bg-virtus-teal/20 text-virtus-teal' : version.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{version.status === 'published' ? 'Active' : version.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Published: {version.publishedAt ? new Date(version.publishedAt).toLocaleString() : '-'}</p>
                          <p className="text-xs text-slate-500">Published by: {version.publishedBy || '-'}</p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => viewVersion(version.versionNumber)} className="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">View</button>
                            {version.status === 'archived' ? (
                              <button onClick={() => rollbackVersion(version.versionNumber)} className="px-2.5 py-1.5 rounded border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-50">Rollback</button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="card p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Form</th>
                    <th className="px-5 py-3">Sections</th>
                    <th className="px-5 py-3">Conditions</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">Loading...</td></tr>
                  ) : listedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <p className="text-sm font-semibold text-slate-600">No forms yet for this tenant.</p>
                          <p className="text-xs text-slate-400">Create your first operational form to start configuring sections and workflows.</p>
                          <button onClick={() => navigate('/tenant-admin/form-builder/new')} className="px-3 py-2 rounded-lg bg-virtus-blue text-white text-sm font-bold hover:opacity-90">Create your first form</button>
                        </div>
                      </td>
                    </tr>
                  ) : listedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4"><p className="font-bold text-slate-700">{item.name}</p><p className="text-xs text-slate-400">{item.id}</p></td>
                      <td className="px-5 py-4 text-sm text-slate-600">{item.sections > 0 ? item.sections : 'TBD'}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{item.conditionalRules > 0 ? item.conditionalRules : 'TBD'}</td>
                      <td className="px-5 py-4 text-xs uppercase font-bold"><span className={item.status === 'published' ? 'text-virtus-teal' : item.status === 'archived' ? 'text-amber-600' : 'text-virtus-brand-blue'}>{item.status}</span></td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <button onClick={() => navigate(`/app/forms/${encodeURIComponent(item.id)}`)} className="p-2 rounded hover:bg-slate-100" title="Preview"><Eye size={15} className="text-slate-500" /></button>
                        <button onClick={() => navigate(`/tenant-admin/form-builder/${encodeURIComponent(item.id)}`)} className="p-2 rounded hover:bg-slate-100" title="Edit"><Edit3 size={15} className="text-slate-500" /></button>
                        {item.id !== 'ptw-example' ? (
                          <>
                            <button onClick={() => updateItemStatus(item, 'published')} className="px-2 py-1 rounded border border-virtus-teal/30 text-virtus-teal text-[11px] font-bold hover:bg-virtus-teal/10" title="Publish">Publish</button>
                            <button onClick={() => updateItemStatus(item, 'draft')} className="px-2 py-1 rounded border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50" title="Unpublish">Unpublish</button>
                            <button onClick={() => updateItemStatus(item, 'archived')} className="px-2 py-1 rounded border border-amber-200 text-amber-700 text-[11px] font-bold hover:bg-amber-50" title="Archive">Archive</button>
                            <button onClick={() => duplicateItem(item)} className="p-2 rounded hover:bg-slate-100" title="Duplicate"><Copy size={15} className="text-slate-500" /></button>
                            <button onClick={() => deleteItem(item)} className="p-2 rounded hover:bg-red-50" title="Delete"><Trash2 size={15} className="text-red-500" /></button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded hover:bg-slate-100" title="Bulk Upload"><Upload size={15} className="text-slate-500" /></button>
                          </>
                        ) : null}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
