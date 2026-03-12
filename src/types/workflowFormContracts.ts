export type ResourceStatus = 'draft' | 'published' | 'archived';

export type ApiMeta = {
  traceId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
};

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiError = {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  traceId?: string;
};

export type ApiResponse<T> = {
  data: T;
  meta?: ApiMeta;
};

export type RuleExpr =
  | { all: RuleExpr[] }
  | { any: RuleExpr[] }
  | { not: RuleExpr }
  | {
      fact: string;
      op: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists';
      value?: unknown;
    };

export type OptionSource = {
  sourceType: 'data_domain';
  domainKey: string;
  valuePath: string;
  labelPath: string;
  filters?: RuleExpr;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export type DataDomainField = {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'date';
};

export type DataDomain = {
  key: string;
  name: string;
  schema: DataDomainField[];
  status: 'active' | 'inactive';
  updatedAt: string;
};

export type DomainRecord = Record<string, unknown>;

export type FormFieldType =
  | 'text'
  | 'static'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'radio'
  | 'yesno'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'signature'
  | 'table'
  | 'user'
  | 'role';

export type ValidationConfig = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

export type FormFieldConfig = {
  key: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  required?: boolean;
  requiredWhen?: RuleExpr;
  visibleWhen?: RuleExpr;
  readOnlyWhen?: RuleExpr;
  validation?: ValidationConfig;
  optionsSource?: OptionSource;
  manualOptions?: string[];
  tableColumns?: string[];
  layout?: {
    colSpan?: 1 | 2 | 3;
  };
};

export type FormSectionLayoutGroup = {
  key: string;
  label: string;
  columns?: 1 | 2 | 3;
  fieldKeys: string[];
};

export type FormSectionLayout = {
  groups: FormSectionLayoutGroup[];
};

export type FormSectionConfig = {
  key: string;
  label: string;
  order: number;
  visibleWhen?: RuleExpr;
  fields: FormFieldConfig[];
  layout?: FormSectionLayout;
};

export type FormTemplate = {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  version: number;
  status: ResourceStatus;
  sections: FormSectionConfig[];
  createdAt: string;
  updatedAt: string;
};

export type FormTemplateUpsert = {
  key: string;
  name: string;
  description?: string;
  sections: FormSectionConfig[];
};

export type StepType =
  | 'submit'
  | 'approval'
  | 'endorsement'
  | 'verification'
  | 'notification'
  | 'task'
  | 'form';

export type AssignmentRule = {
  strategy: 'role' | 'user' | 'expression';
  roleKey?: string;
  userId?: string;
  expression?: RuleExpr;
};

export type FormBinding = {
  formTemplateKey: string;
  mode: 'create' | 'edit' | 'review';
  sectionKeys?: string[];
};

export type WorkflowStep = {
  key: string;
  stepType: StepType;
  displayLabel: string;
  description?: string;
  formBinding?: FormBinding;
  assignee: AssignmentRule;
  entryWhen?: RuleExpr;
  completionWhen?: RuleExpr;
  slaHours?: number;
};

export type WorkflowTransition = {
  key: string;
  fromStepKey: string;
  toStepKey: string;
  condition?: RuleExpr;
  isDefault?: boolean;
  label?: string;
};

export type WorkflowTemplate = {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  version: number;
  status: ResourceStatus;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
  createdAt: string;
  updatedAt: string;
};

export type WorkflowTemplateUpsert = {
  key: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
};

export type StartWorkflowRequest = {
  workflowTemplateKey: string;
  context?: Record<string, unknown>;
};

export type WorkflowInstance = {
  id: string;
  workflowTemplateKey: string;
  workflowTemplateVersion: number;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  currentStepKey: string;
  context?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TaskSummary = {
  id: string;
  workflowInstanceId: string;
  stepKey: string;
  displayLabel: string;
  assigneeUserId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  dueAt?: string;
};

export type RenderedOption = {
  value: unknown;
  label: string;
};

export type RenderedField = {
  key: string;
  label: string;
  type: FormFieldType;
  visible: boolean;
  readOnly: boolean;
  required: boolean;
  value?: unknown;
  options?: RenderedOption[];
};

export type RenderedSection = {
  key: string;
  label: string;
  visible: boolean;
  fields: RenderedField[];
};

export type FormRender = {
  taskId: string;
  workflowInstanceId: string;
  step: {
    key: string;
    stepType: StepType;
    displayLabel: string;
  };
  form: {
    templateKey: string;
    version: number;
    sections: RenderedSection[];
  };
};

export type TaskActionRequest = {
  action: string;
  comment?: string;
  formValues?: Record<string, unknown>;
};

export type TaskActionResult = {
  taskId: string;
  workflowInstanceId: string;
  outcome: string;
  nextStepKey: string;
};

export type AuditEvent = {
  id: string;
  workflowInstanceId: string;
  eventType: string;
  actorUserId: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type PermissionSectionKey = 'form' | 'data' | 'security';

export type TenantPermissionDefinition = {
  id: string;
  label: string;
  note: string;
  section: PermissionSectionKey;
};

export type TenantRoleTemplate = {
  key: string;
  name: string;
  badge: string;
  permissions: Record<string, boolean>;
};

export type TenantRolePermissionConfig = {
  permissions: TenantPermissionDefinition[];
  roleTemplates: TenantRoleTemplate[];
};

export const DEFAULT_TENANT_PERMISSIONS: TenantPermissionDefinition[] = [
  { id: 'create_edit_forms', label: 'Create & Edit Forms', note: 'Full access to form builder and styling', section: 'form' },
  { id: 'delete_forms', label: 'Delete Forms', note: 'Permanently remove forms and linked data', section: 'form' },
  { id: 'publish_forms', label: 'Publish / Unpublish', note: 'Toggle live status of forms', section: 'form' },
  { id: 'template_access', label: 'Template Access', note: 'Manage and create global templates', section: 'form' },
  { id: 'view_responses', label: 'View Responses', note: 'Access submission data and analytics', section: 'data' },
  { id: 'export_data', label: 'Export Data', note: 'Download data in CSV, PDF or Excel', section: 'data' },
  { id: 'delete_submissions', label: 'Delete Submissions', note: 'Clear individual or bulk response data', section: 'data' },
  { id: 'manage_users', label: 'Manage Users', note: 'Invite, remove, and assign roles', section: 'security' },
  { id: 'billing_access', label: 'Billing Access', note: 'Modify plan and view invoices', section: 'security' },
];

const withAllPermissions = (value: boolean): Record<string, boolean> =>
  Object.fromEntries(DEFAULT_TENANT_PERMISSIONS.map((permission) => [permission.id, value]));

const permitAuthorPermissionSet = (): Record<string, boolean> => ({
  create_edit_forms: false,
  delete_forms: false,
  publish_forms: false,
  template_access: false,
  view_responses: true,
  export_data: false,
  delete_submissions: false,
  manage_users: false,
  billing_access: false,
});

const permitReviewerPermissionSet = (): Record<string, boolean> => ({
  create_edit_forms: false,
  delete_forms: false,
  publish_forms: false,
  template_access: false,
  view_responses: true,
  export_data: true,
  delete_submissions: false,
  manage_users: false,
  billing_access: false,
});

const permitAdminPermissionSet = (): Record<string, boolean> => ({
  create_edit_forms: true,
  delete_forms: false,
  publish_forms: true,
  template_access: true,
  view_responses: true,
  export_data: true,
  delete_submissions: false,
  manage_users: true,
  billing_access: false,
});

export const PTW_ROLE_TEMPLATES_EXAMPLE: TenantRoleTemplate[] = [
  { key: 'permit_originator', name: 'Permit Originator (PO)', badge: 'Initiates permit request', permissions: permitAuthorPermissionSet() },
  { key: 'asset_owner', name: 'Asset Owner (AO)', badge: 'Accept and route permit', permissions: permitReviewerPermissionSet() },
  { key: 'other_asset_owner', name: 'Other Asset Owner (OAO)', badge: 'Conditional co-acceptance', permissions: permitReviewerPermissionSet() },
  { key: 'mech_elec_isolation_authority', name: 'Mech/Elec Isolation Authority (SO/ASP)', badge: 'Isolation approval and confirmation', permissions: permitReviewerPermissionSet() },
  { key: 'system_operator', name: 'System Operator (SO)', badge: 'Verification and de-isolation checks', permissions: permitReviewerPermissionSet() },
  { key: 'issuing_authority', name: 'Issuing Authority (IA)', badge: 'Approve, endorse, issue', permissions: permitReviewerPermissionSet() },
  { key: 'performing_authority', name: 'Performing Authority', badge: 'Execute work and requests', permissions: permitAuthorPermissionSet() },
  { key: 'oim', name: 'OIM', badge: 'Long-term isolation approval', permissions: permitAdminPermissionSet() },
  { key: 'safety_officer', name: 'Safety Officer', badge: 'Conditional risk reviewer', permissions: permitReviewerPermissionSet() },
  { key: 'senior_supervisor', name: 'Senior Supervisor', badge: 'Site inspection verification', permissions: permitReviewerPermissionSet() },
  { key: 'env_officer', name: 'Env Officer', badge: 'Environmental impact assessment', permissions: permitReviewerPermissionSet() },
  { key: 'chief_engineer', name: 'Chief Engineer', badge: 'Technical endorsement', permissions: permitReviewerPermissionSet() },
  { key: 'project_manager', name: 'Project Manager', badge: 'Project-level authorization', permissions: permitReviewerPermissionSet() },
];

export const PTW_FORM_TEMPLATE_EXAMPLE: FormTemplateUpsert = {
  key: 'ptw_cold_work_v1',
  name: 'Permit To Work - Cold Work',
  description: 'PTW form aligned to requisition, hazards, precautions, PPE, certificates and authorization sections.',
  sections: [
    {
      key: 'section_1_requisition',
      label: 'Section 1: Requisition',
      order: 1,
      layout: {
        groups: [
          {
            key: 'general_information',
            label: 'General Information',
            columns: 2,
            fieldKeys: ['applicant_name', 'company', 'staff_id', 'telephone_no'],
          },
          {
            key: 'worksite',
            label: 'Worksite',
            columns: 2,
            fieldKeys: ['asset', 'site', 'area_unit', 'sub_area'],
          },
          {
            key: 'work_details',
            label: 'Work Details',
            columns: 2,
            fieldKeys: [
              'permit_type',
              'confined_space_entry',
              'risk_rating',
              'map_reference',
              'work_order_no',
              'equipment_no',
              'sap_no',
              'area_classification',
              'special_work_instructions',
              'work_description',
            ],
          },
        ],
      },
      fields: [
        { key: 'applicant_name', label: 'Applicant Name', type: 'text', required: true },
        { key: 'company', label: 'Company', type: 'text', required: true },
        { key: 'staff_id', label: 'Staff ID/IC No.', type: 'text', required: true },
        { key: 'telephone_no', label: 'Telephone No.', type: 'text', required: true },
        {
          key: 'asset',
          label: 'Asset',
          type: 'select',
          required: true,
          optionsSource: {
            sourceType: 'data_domain',
            domainKey: 'assets',
            valuePath: 'id',
            labelPath: 'name',
          },
        },
        {
          key: 'site',
          label: 'Site',
          type: 'select',
          required: true,
          optionsSource: {
            sourceType: 'data_domain',
            domainKey: 'sites',
            valuePath: 'id',
            labelPath: 'name',
          },
        },
        {
          key: 'area_unit',
          label: 'Area/Unit',
          type: 'select',
          required: true,
          optionsSource: {
            sourceType: 'data_domain',
            domainKey: 'areas',
            valuePath: 'id',
            labelPath: 'name',
          },
        },
        { key: 'sub_area', label: 'Sub Area', type: 'select' },
        { key: 'permit_type', label: 'Permit Type', type: 'radio', required: true },
        { key: 'confined_space_entry', label: 'Confined Space Entry', type: 'radio', required: true },
        { key: 'risk_rating', label: 'Risk Rating', type: 'radio', required: true },
        { key: 'map_reference', label: 'Map', type: 'text', required: true },
        { key: 'work_order_no', label: 'Work Order No.', type: 'text' },
        { key: 'equipment_no', label: 'Equipment No.', type: 'text' },
        { key: 'sap_no', label: 'SAP No.', type: 'text' },
        { key: 'area_classification', label: 'Area Classification', type: 'radio', required: true },
        { key: 'special_work_instructions', label: 'Special Work Instructions', type: 'textarea' },
        { key: 'work_description', label: 'Work Description', type: 'textarea', required: true },
      ],
    },
    {
      key: 'section_2_hazards',
      label: 'Section 2: Hazards/Hazardous Activities',
      order: 2,
      layout: {
        groups: [
          {
            key: 'hazards_checklist',
            label: 'Cross (X) where applicable',
            columns: 3,
            fieldKeys: [
              'hazard_battery_operated_tools',
              'hazard_electric_tools',
              'hazard_calibration',
              'hazard_crane_activity',
              'hazard_diving_activities',
              'hazard_dust_powder',
              'hazard_electricity',
              'hazard_electronic_device',
              'hazard_excavation',
              'hazard_gas_fumes',
              'hazard_gas_generator_compressor',
              'hazard_h2s',
              'hazard_hand_tools_only',
              'hazard_high_traffic',
              'hazard_hot_surface',
              'hazard_hydrocarbon_liquids',
              'hazard_hydro_jetting',
              'hazard_lifting_equipment',
              'hazard_mercury',
              'hazard_metal_drilling',
              'hazard_noise',
              'hazard_pressure_test',
              'hazard_radiation',
              'hazard_rotating_equipment',
              'hazard_saw_cold_cut',
              'hazard_scaffolding',
              'hazard_static_electricity',
              'hazard_steam',
              'hazard_tenorm',
              'hazard_toxic_substance',
              'hazard_underground_piping',
              'hazard_vehicle',
              'hazard_volatile_liquid',
              'hazard_wellhead_activities',
              'hazard_wireline_activities',
              'hazard_working_at_height',
            ],
          },
          {
            key: 'hazard_additional_notes',
            label: 'Others / Notes',
            columns: 1,
            fieldKeys: ['hazard_others', 'hazard_notes'],
          },
        ],
      },
      fields: [
        { key: 'hazard_identification', label: 'Hazard Identification Summary', type: 'textarea', required: true },
        { key: 'hazard_battery_operated_tools', label: 'Battery Operated/Electrical Tools', type: 'checkbox' },
        { key: 'hazard_electric_tools', label: 'Electric Tools', type: 'checkbox' },
        { key: 'hazard_calibration', label: 'Calibration', type: 'checkbox' },
        { key: 'hazard_crane_activity', label: 'Crane Activity', type: 'checkbox' },
        { key: 'hazard_diving_activities', label: 'Diving Activities', type: 'checkbox' },
        { key: 'hazard_dust_powder', label: 'Dust/Powder', type: 'checkbox' },
        { key: 'hazard_electricity', label: 'Electricity', type: 'checkbox' },
        { key: 'hazard_electronic_device', label: 'Electronic Device', type: 'checkbox' },
        { key: 'hazard_excavation', label: 'Excavation', type: 'checkbox' },
        { key: 'hazard_gas_fumes', label: 'Gas/Fumes', type: 'checkbox' },
        { key: 'hazard_gas_generator_compressor', label: 'Generator/Compressor', type: 'checkbox' },
        { key: 'hazard_h2s', label: 'H2S', type: 'checkbox' },
        { key: 'hazard_hand_tools_only', label: 'Hand Tools Only', type: 'checkbox' },
        { key: 'hazard_high_traffic', label: 'High Traffic', type: 'checkbox' },
        { key: 'hazard_hot_surface', label: 'Hot Surface', type: 'checkbox' },
        { key: 'hazard_hydrocarbon_liquids', label: 'Hydrocarbon Liquids', type: 'checkbox' },
        { key: 'hazard_hydro_jetting', label: 'Hydro-Jetting', type: 'checkbox' },
        { key: 'hazard_lifting_equipment', label: 'Lifting Equipment', type: 'checkbox' },
        { key: 'hazard_mercury', label: 'Mercury', type: 'checkbox' },
        { key: 'hazard_metal_drilling', label: 'Metal Drilling', type: 'checkbox' },
        { key: 'hazard_noise', label: 'Noise', type: 'checkbox' },
        { key: 'hazard_pressure_test', label: 'Pressure Test', type: 'checkbox' },
        { key: 'hazard_radiation', label: 'Radiation', type: 'checkbox' },
        { key: 'hazard_rotating_equipment', label: 'Rotating Equipment', type: 'checkbox' },
        { key: 'hazard_saw_cold_cut', label: 'Saw/Cold Cut', type: 'checkbox' },
        { key: 'hazard_scaffolding', label: 'Scaffolding', type: 'checkbox' },
        { key: 'hazard_static_electricity', label: 'Static Electricity', type: 'checkbox' },
        { key: 'hazard_steam', label: 'Steam', type: 'checkbox' },
        { key: 'hazard_tenorm', label: 'TENORM', type: 'checkbox' },
        { key: 'hazard_toxic_substance', label: 'Toxic/Chemical Substance', type: 'checkbox' },
        { key: 'hazard_underground_piping', label: 'Underground Piping/Cables/Drains', type: 'checkbox' },
        { key: 'hazard_vehicle', label: 'Vehicle', type: 'checkbox' },
        { key: 'hazard_volatile_liquid', label: 'Volatile Liquid', type: 'checkbox' },
        { key: 'hazard_wellhead_activities', label: 'Wellhead Activities', type: 'checkbox' },
        { key: 'hazard_wireline_activities', label: 'Wireline Activities', type: 'checkbox' },
        { key: 'hazard_working_at_height', label: 'Working at Height', type: 'checkbox' },
        { key: 'hazard_others', label: 'Others', type: 'text' },
        { key: 'hazard_notes', label: 'Notes', type: 'textarea' },
      ],
    },
    {
      key: 'section_3_precautions',
      label: 'Section 3: Worksite Preparations/Precautions',
      order: 3,
      layout: {
        groups: [
          {
            key: 'worksite_precautions_checklist',
            label: 'Cross (X) where applicable',
            columns: 3,
            fieldKeys: [
              'precaution_area_barricade',
              'precaution_bypass_required',
              'precaution_clear_access_route',
              'precaution_operator_contacted',
              'precaution_display_warning_sign',
              'precaution_identification_tagging',
              'precaution_line_blind_drained',
              'precaution_line_removal',
              'precaution_fire_extinguisher',
              'precaution_n2_purge_ventilated',
              'precaution_positive_removal_energy',
              'precaution_positive_removal_piping',
              'precaution_scaffold_cert_displayed',
              'precaution_secure_tools_material',
              'precaution_site_identification_tagging',
              'precaution_toolbox_meeting',
              'precaution_valves_chain_lock_closed',
              'precaution_valves_chain_lock_open',
              'precaution_valves_spading_blinding',
              'precaution_warning_sign_notice',
              'precaution_worksite_free_combustibles',
              'precaution_others',
              'precaution_gas_monitoring_continuous',
              'precaution_gas_monitoring_every',
            ],
          },
          {
            key: 'worksite_additional_precautions',
            label: 'Additional Precautions',
            columns: 1,
            fieldKeys: ['precaution_additional_text'],
          },
        ],
      },
      fields: [
        { key: 'gas_test_required', label: 'Gas Test Required', type: 'radio', required: true },
        { key: 'barricade_installed', label: 'Barricade Installed', type: 'checkbox' },
        { key: 'isolation_completed', label: 'Isolation Completed', type: 'checkbox' },
        { key: 'precaution_area_barricade', label: 'Area Barricade', type: 'checkbox' },
        { key: 'precaution_bypass_required', label: 'Bypass Required', type: 'checkbox' },
        { key: 'precaution_clear_access_route', label: 'Clearance of Escape Route', type: 'checkbox' },
        { key: 'precaution_operator_contacted', label: 'Contact Area Operator Before Work Start', type: 'checkbox' },
        { key: 'precaution_display_warning_sign', label: 'Display Warning Sign', type: 'checkbox' },
        { key: 'precaution_identification_tagging', label: 'Equipment/Line Identification (Tagging)', type: 'checkbox' },
        { key: 'precaution_line_blind_drained', label: 'Equipment/Line Blind/Drained', type: 'checkbox' },
        { key: 'precaution_line_removal', label: 'Equipment/Line Removal', type: 'checkbox' },
        { key: 'precaution_fire_extinguisher', label: 'Fire Extinguisher On Work Site', type: 'checkbox' },
        { key: 'precaution_n2_purge_ventilated', label: 'N2 Purged/Ventilated', type: 'checkbox' },
        { key: 'precaution_positive_removal_energy', label: 'Positive Removal of Energy (EIC)', type: 'checkbox' },
        { key: 'precaution_positive_removal_piping', label: 'Positive Removal of Piping (PIC)', type: 'checkbox' },
        { key: 'precaution_scaffold_cert_displayed', label: 'Scaffold Certificate Displayed', type: 'checkbox' },
        { key: 'precaution_secure_tools_material', label: 'Secure Tools/Materials Against Falling', type: 'checkbox' },
        { key: 'precaution_site_identification_tagging', label: 'Site Identification (Tagging)', type: 'checkbox' },
        { key: 'precaution_toolbox_meeting', label: 'Toolbox Meeting', type: 'checkbox' },
        { key: 'precaution_valves_chain_lock_closed', label: 'Valves Chain Lock Closed', type: 'checkbox' },
        { key: 'precaution_valves_chain_lock_open', label: 'Valves Chain Lock Open', type: 'checkbox' },
        { key: 'precaution_valves_spading_blinding', label: 'Valves Spading/Blinding', type: 'checkbox' },
        { key: 'precaution_warning_sign_notice', label: 'Warning Sign/Notice Required', type: 'checkbox' },
        { key: 'precaution_worksite_free_combustibles', label: 'Worksite Free of Combustibles', type: 'checkbox' },
        { key: 'precaution_others', label: 'Others', type: 'text' },
        { key: 'precaution_gas_monitoring_continuous', label: 'Gas Monitoring Continuous', type: 'checkbox' },
        { key: 'precaution_gas_monitoring_every', label: 'Gas Monitoring Every (hours)', type: 'number' },
        { key: 'precaution_additional_text', label: 'Additional Precautions Note', type: 'textarea' },
      ],
    },
    {
      key: 'section_4_ppe',
      label: 'Section 4: Personal Protective Equipment',
      order: 4,
      layout: {
        groups: [
          {
            key: 'respiratory',
            label: 'Respiratory',
            columns: 1,
            fieldKeys: [
              'ppe_respiratory_none',
              'ppe_respiratory_canister',
              'ppe_respiratory_airline_set',
              'ppe_respiratory_dust_mask',
              'ppe_respiratory_full_face',
              'ppe_respiratory_half_mask',
              'ppe_respiratory_hood',
              'ppe_respiratory_scba',
            ],
          },
          {
            key: 'eye_face',
            label: 'Eye & Face Protection',
            columns: 1,
            fieldKeys: ['ppe_eye_face_shield', 'ppe_eye_face_goggles', 'ppe_eye_face_welding_mask'],
          },
          {
            key: 'fall_protection',
            label: 'Fall Protection',
            columns: 1,
            fieldKeys: ['ppe_fall_arrestor', 'ppe_fall_body_harness', 'ppe_fall_anchor_point'],
          },
          {
            key: 'hand_protection',
            label: 'Hand Protection',
            columns: 1,
            fieldKeys: [
              'ppe_hand_chemical_gloves',
              'ppe_hand_cotton_gloves',
              'ppe_hand_impact_gloves',
              'ppe_hand_rubber_gloves',
              'ppe_hand_other_gloves',
            ],
          },
          {
            key: 'personal_monitoring',
            label: 'Personal Monitoring Equipment',
            columns: 1,
            fieldKeys: [
              'ppe_monitor_h2s_meter',
              'ppe_monitor_personal_distress_unit',
              'ppe_monitor_dosimeter_film_badge',
              'ppe_monitor_personal_o2_monitor',
            ],
          },
          {
            key: 'body_hearing_foot_misc',
            label: 'Body / Hearing / Foot / Misc',
            columns: 1,
            fieldKeys: [
              'ppe_body_coverall',
              'ppe_body_hf_coverall',
              'ppe_body_safety_vest',
              'ppe_body_glasses',
              'ppe_body_safety_shoes',
              'ppe_hearing_ear_muff',
              'ppe_hearing_ear_plug',
              'ppe_body_chemical_boot',
              'ppe_body_chemical_suit',
              'ppe_body_disposable_suit',
              'ppe_misc_life_jacket_belt',
              'ppe_misc_seat_belt',
              'ppe_note',
            ],
          },
        ],
      },
      fields: [
        { key: 'ppe_helmet', label: 'Safety Helmet', type: 'checkbox' },
        { key: 'ppe_gloves', label: 'Safety Gloves', type: 'checkbox' },
        { key: 'ppe_eye_protection', label: 'Eye Protection', type: 'checkbox' },
        { key: 'ppe_respirator', label: 'Respirator', type: 'checkbox' },
        { key: 'ppe_respiratory_none', label: 'None', type: 'checkbox' },
        { key: 'ppe_respiratory_canister', label: 'Canister', type: 'checkbox' },
        { key: 'ppe_respiratory_airline_set', label: 'Airline Set', type: 'checkbox' },
        { key: 'ppe_respiratory_dust_mask', label: 'Dust Mask', type: 'checkbox' },
        { key: 'ppe_respiratory_full_face', label: 'Full Face Respirator', type: 'checkbox' },
        { key: 'ppe_respiratory_half_mask', label: 'Half Mask Respirator', type: 'checkbox' },
        { key: 'ppe_respiratory_hood', label: 'Hood', type: 'checkbox' },
        { key: 'ppe_respiratory_scba', label: 'SCBA', type: 'checkbox' },
        { key: 'ppe_eye_face_shield', label: 'Face Shield', type: 'checkbox' },
        { key: 'ppe_eye_face_goggles', label: 'Goggles', type: 'checkbox' },
        { key: 'ppe_eye_face_welding_mask', label: 'Welding Mask', type: 'checkbox' },
        { key: 'ppe_fall_arrestor', label: 'Fall Arrestor', type: 'checkbox' },
        { key: 'ppe_fall_body_harness', label: 'Body Harness', type: 'checkbox' },
        { key: 'ppe_fall_anchor_point', label: 'Anchor Point', type: 'checkbox' },
        { key: 'ppe_hand_chemical_gloves', label: 'Chemical Gloves', type: 'checkbox' },
        { key: 'ppe_hand_cotton_gloves', label: 'Cotton Gloves', type: 'checkbox' },
        { key: 'ppe_hand_impact_gloves', label: 'Impact Glove', type: 'checkbox' },
        { key: 'ppe_hand_rubber_gloves', label: 'Rubber Gloves', type: 'checkbox' },
        { key: 'ppe_hand_other_gloves', label: 'Other Gloves', type: 'checkbox' },
        { key: 'ppe_monitor_h2s_meter', label: 'H2S Meter', type: 'checkbox' },
        { key: 'ppe_monitor_personal_distress_unit', label: 'Personal Distress Unit', type: 'checkbox' },
        { key: 'ppe_monitor_dosimeter_film_badge', label: 'Personal Dosimeter/Film Badge', type: 'checkbox' },
        { key: 'ppe_monitor_personal_o2_monitor', label: 'Personal O2 Monitor', type: 'checkbox' },
        { key: 'ppe_body_coverall', label: 'Coverall', type: 'checkbox' },
        { key: 'ppe_body_hf_coverall', label: 'Anti-line Set', type: 'checkbox' },
        { key: 'ppe_body_safety_vest', label: 'Safety Vest', type: 'checkbox' },
        { key: 'ppe_body_glasses', label: 'Glasses', type: 'checkbox' },
        { key: 'ppe_body_safety_shoes', label: 'Safety Shoes', type: 'checkbox' },
        { key: 'ppe_hearing_ear_muff', label: 'Ear Muff', type: 'checkbox' },
        { key: 'ppe_hearing_ear_plug', label: 'Ear Plug', type: 'checkbox' },
        { key: 'ppe_body_chemical_boot', label: 'Chemical Boot', type: 'checkbox' },
        { key: 'ppe_body_chemical_suit', label: 'Chemical Suit', type: 'checkbox' },
        { key: 'ppe_body_disposable_suit', label: 'Disposable Suit', type: 'checkbox' },
        { key: 'ppe_misc_life_jacket_belt', label: 'Life Jacket/Belt', type: 'checkbox' },
        { key: 'ppe_misc_seat_belt', label: 'Seat Belt', type: 'checkbox' },
        { key: 'ppe_note', label: 'PPE Notes', type: 'textarea' },
      ],
    },
    {
      key: 'section_5_certificates',
      label: 'Section 5: Supporting Certificates / Documents',
      order: 5,
      layout: {
        groups: [
          {
            key: 'certificate_reference',
            label: 'Certificate/Document References',
            columns: 1,
            fieldKeys: [
              'cross_required_certificate',
              'confined_space_entry_cert_no',
              'diving_cert_no',
              'lifting_cert_no',
              'leak_no',
              'jha_no',
              'excavation_cert_no',
              'electrical_isolation_cert_no',
              'physical_isolation_cert_no',
              'radiation_cert_no',
              'road_obstruction_cert_no',
              'safety_system_bypass_cert_no',
              'vehicle_entry_cert_no',
              'portable_electrical_installation_no',
              'work_method_steps_no',
              'supporting_document_no',
              'working_at_height_cert_no',
              'ventilation_plan_no',
              'pressurised_habitat_cert_no',
            ],
          },
        ],
      },
      fields: [
        { key: 'cross_required_certificate', label: 'Cross (X) where applicable', type: 'text' },
        { key: 'confined_space_entry_cert_no', label: 'Confined Space Entry Cert. No.', type: 'text' },
        { key: 'diving_cert_no', label: 'Diving Cert. No.', type: 'text' },
        { key: 'lifting_cert_no', label: 'Lifting Cert. No.', type: 'text' },
        { key: 'leak_no', label: 'LEAK No.', type: 'text' },
        { key: 'jha_no', label: 'JHA No.', type: 'text' },
        { key: 'excavation_cert_no', label: 'Excavation Cert. No.', type: 'text' },
        { key: 'electrical_isolation_cert_no', label: 'Electrical Isolation Cert. No.', type: 'text' },
        { key: 'physical_isolation_cert_no', label: 'Physical Isolation Cert. No.', type: 'text' },
        { key: 'radiation_cert_no', label: 'Radiation Cert. No.', type: 'text' },
        { key: 'road_obstruction_cert_no', label: 'Road Obstruction/Closure Cert. No.', type: 'text' },
        { key: 'safety_system_bypass_cert_no', label: 'Safety System Bypass/Override Cert. No.', type: 'text' },
        { key: 'vehicle_entry_cert_no', label: 'Vehicle Entry Cert. No.', type: 'text' },
        { key: 'portable_electrical_installation_no', label: 'Portable Electrical Temporary Installation No.', type: 'text' },
        { key: 'work_method_steps_no', label: 'Work Method Steps No.', type: 'text' },
        { key: 'supporting_document_no', label: 'Supporting Document No.', type: 'text' },
        { key: 'working_at_height_cert_no', label: 'Working at Height Cert. No.', type: 'text' },
        { key: 'ventilation_plan_no', label: 'Ventilation Plan No.', type: 'text' },
        { key: 'pressurised_habitat_cert_no', label: 'Pressurised Habitat Certificate No.', type: 'text' },
      ],
    },
    {
      key: 'section_acknowledgement',
      label: 'Acknowledgement Required',
      order: 6,
      layout: {
        groups: [
          {
            key: 'acknowledgement_identified_by_aa',
            label: 'Identified by Approving Authority (e.g. CSR)',
            columns: 3,
            fieldKeys: ['ack_position', 'ack_name', 'ack_initial_date', 'acknowledgement'],
          },
        ],
      },
      fields: [
        { key: 'ack_position', label: 'Position', type: 'text' },
        { key: 'ack_name', label: 'Name', type: 'text' },
        { key: 'ack_initial_date', label: 'Initial/Date', type: 'date' },
        { key: 'acknowledgement', label: 'I acknowledge all permit conditions.', type: 'checkbox', required: true, layout: { colSpan: 2 } },
      ],
    },
    {
      key: 'section_authorisation',
      label: 'Authorisation',
      order: 7,
      layout: {
        groups: [
          {
            key: 'receiving_authority',
            label: 'Receiving Authority',
            columns: 3,
            fieldKeys: ['receiving_authority_name', 'receiving_authority_signature', 'receiving_authority_datetime'],
          },
          {
            key: 'authorised_supervisor',
            label: 'Authorised Supervisor',
            columns: 3,
            fieldKeys: ['authorised_supervisor_name', 'authorised_supervisor_signature', 'authorised_supervisor_datetime'],
          },
          {
            key: 'approving_authority_block',
            label: 'Approving Authority',
            columns: 3,
            fieldKeys: ['approving_authority_name', 'approving_authority_signature', 'approving_authority_datetime'],
          },
        ],
      },
      fields: [
        { key: 'authorised_by', label: 'Authorised By', type: 'user', required: true },
        { key: 'authorised_role', label: 'Authorised Role', type: 'role', required: true },
        { key: 'receiving_authority_name', label: 'Name', type: 'text' },
        { key: 'receiving_authority_signature', label: 'Signature', type: 'text' },
        { key: 'receiving_authority_datetime', label: 'Date/Time', type: 'datetime' },
        { key: 'authorised_supervisor_name', label: 'Name', type: 'text' },
        { key: 'authorised_supervisor_signature', label: 'Signature', type: 'text' },
        { key: 'authorised_supervisor_datetime', label: 'Date/Time', type: 'datetime' },
        { key: 'approving_authority_name', label: 'Name', type: 'text' },
        { key: 'approving_authority_signature', label: 'Signature', type: 'text' },
        { key: 'approving_authority_datetime', label: 'Date/Time', type: 'datetime' },
      ],
    },
    {
      key: 'section_joint_site_visit',
      label: 'Joint Site Visit',
      order: 8,
      visibleWhen: { fact: 'risk_rating', op: 'in', value: ['high', 'very_high'] },
      layout: {
        groups: [
          {
            key: 'site_visit_statement',
            label: 'Site Visit Statement',
            columns: 1,
            fieldKeys: ['site_visit_statement', 'site_visit_required'],
          },
          {
            key: 'work_leader_visit',
            label: 'Work Leader',
            columns: 3,
            fieldKeys: ['work_leader_name', 'work_leader_signature', 'work_leader_time'],
          },
          {
            key: 'aa_representative_visit',
            label: 'Approving Authority Representative',
            columns: 3,
            fieldKeys: [
              'approving_authority_representative',
              'approving_authority_representative_signature',
              'approving_authority_representative_time',
            ],
          },
          {
            key: 'visit_notes',
            label: 'Site Visit Notes',
            columns: 1,
            fieldKeys: ['site_visit_notes'],
          },
        ],
      },
      fields: [
        { key: 'site_visit_required', label: 'Joint Site Visit Required', type: 'radio', required: true },
        {
          key: 'site_visit_statement',
          label:
            'I have personally checked the area and equipment to be worked on and I am satisfied that the work requested can be carried out safely.',
          type: 'textarea',
        },
        { key: 'work_leader_name', label: 'Work Leader Name', type: 'text' },
        { key: 'work_leader_signature', label: 'Work Leader Signature', type: 'text' },
        { key: 'work_leader_time', label: 'Work Leader Time', type: 'text' },
        { key: 'approving_authority_representative', label: 'Approving Authority Representative Name', type: 'text' },
        { key: 'approving_authority_representative_signature', label: 'Approving Authority Representative Signature', type: 'text' },
        { key: 'approving_authority_representative_time', label: 'Approving Authority Representative Time', type: 'text' },
        { key: 'site_visit_notes', label: 'Site Visit Notes', type: 'textarea' },
      ],
    },
    {
      key: 'section_9_daily_return_suspension',
      label: 'Section 9: Daily Permit Return and Suspension',
      order: 9,
      layout: {
        groups: [
          {
            key: 'daily_return_row',
            label: 'Daily Return / Suspension Record',
            columns: 3,
            fieldKeys: ['wl_shift', 'due_to', 'wl_sign', 'wl_name', 'aar_sign', 'aar_name'],
          },
        ],
      },
      fields: [
        { key: 'wl_shift', label: 'Date/Shift', type: 'text' },
        { key: 'wl_sign', label: 'WL Sign', type: 'text' },
        { key: 'wl_name', label: 'WL Name', type: 'text' },
        { key: 'aar_sign', label: 'AAR Sign', type: 'text' },
        { key: 'aar_name', label: 'AAR Name', type: 'text' },
        { key: 'due_to', label: 'Due To', type: 'text' },
      ],
    },
    {
      key: 'section_10_revalidation_endorsement',
      label: 'Section 10: Daily Revalidation & Endorsement',
      order: 10,
      layout: {
        groups: [
          {
            key: 'revalidation_header',
            label: 'Revalidation Context',
            columns: 3,
            fieldKeys: ['reval_date_shift', 'suspended_reason'],
          },
          {
            key: 'approving_authority_signoff',
            label: 'AA Sign-off',
            columns: 3,
            fieldKeys: ['aa_signature', 'aa_name'],
          },
          {
            key: 'work_leader_signoff',
            label: 'WL Sign-off',
            columns: 3,
            fieldKeys: ['wl_signature_reval', 'wl_name_reval'],
          },
          {
            key: 'aar_signoff',
            label: 'AAR Sign-off',
            columns: 3,
            fieldKeys: ['aar_signature_reval', 'aar_name_reval'],
          },
        ],
      },
      fields: [
        { key: 'reval_date_shift', label: 'Date/Shift', type: 'text' },
        { key: 'suspended_reason', label: 'Suspended Reason', type: 'text', layout: { colSpan: 2 } },
        { key: 'aa_signature', label: 'AA Signature', type: 'text' },
        { key: 'aa_name', label: 'AA Name', type: 'text' },
        { key: 'wl_signature_reval', label: 'WL Signature', type: 'text' },
        { key: 'wl_name_reval', label: 'WL Name', type: 'text' },
        { key: 'aar_signature_reval', label: 'AAR Signature', type: 'text' },
        { key: 'aar_name_reval', label: 'AAR Name', type: 'text' },
      ],
    },
    {
      key: 'section_11_handback_close',
      label: 'Section 11: Handback & Close',
      order: 11,
      layout: {
        groups: [
          {
            key: 'work_leader_close',
            label: 'Work Leader (WL) Close-out',
            columns: 3,
            fieldKeys: ['work_leader_close_name', 'work_leader_close_signature', 'work_leader_close_date'],
          },
          {
            key: 'aar_close',
            label: 'Approving Authority Representative (AAR) Close-out',
            columns: 3,
            fieldKeys: [
              'approving_authority_rep_close_name',
              'approving_authority_rep_close_signature',
              'approving_authority_rep_close_date',
            ],
          },
          {
            key: 'aa_close',
            label: 'Approving Authority (AA) Close-out',
            columns: 3,
            fieldKeys: ['approving_authority_close_name', 'approving_authority_close_signature', 'approving_authority_close_date'],
          },
        ],
      },
      fields: [
        { key: 'work_leader_close_name', label: 'Work Leader Name', type: 'text' },
        { key: 'work_leader_close_signature', label: 'Work Leader Signature', type: 'text' },
        { key: 'work_leader_close_date', label: 'Work Leader Date', type: 'date' },
        { key: 'approving_authority_rep_close_name', label: 'Approving Authority Representative Name', type: 'text' },
        { key: 'approving_authority_rep_close_signature', label: 'Approving Authority Representative Signature', type: 'text' },
        { key: 'approving_authority_rep_close_date', label: 'Approving Authority Representative Date', type: 'date' },
        { key: 'approving_authority_close_name', label: 'Approving Authority Name', type: 'text' },
        { key: 'approving_authority_close_signature', label: 'Approving Authority Signature', type: 'text' },
        { key: 'approving_authority_close_date', label: 'Approving Authority Date', type: 'date' },
      ],
    },
  ],
};

export const PTW_WORKFLOW_TEMPLATE_EXAMPLE: WorkflowTemplateUpsert = {
  key: 'mech_elec_isolation_workflow_v1',
  name: 'Mechanical/Electrical Isolation Work Flow - Normal & Long Term',
  description: 'PTW workflow with role-based approvals, verification loops, and conditional long-term isolation path.',
  steps: [
    {
      key: 'submit',
      stepType: 'submit',
      displayLabel: 'Submit',
      assignee: { strategy: 'role', roleKey: 'permit_originator' },
      formBinding: { formTemplateKey: PTW_FORM_TEMPLATE_EXAMPLE.key, mode: 'create' },
    },
    {
      key: 'acceptance_ao',
      stepType: 'approval',
      displayLabel: 'Acceptance',
      assignee: { strategy: 'role', roleKey: 'asset_owner' },
      formBinding: { formTemplateKey: PTW_FORM_TEMPLATE_EXAMPLE.key, mode: 'review' },
    },
    {
      key: 'acceptance_oao',
      stepType: 'approval',
      displayLabel: 'Other Asset Owner Acceptance',
      assignee: { strategy: 'role', roleKey: 'other_asset_owner' },
      entryWhen: { fact: 'other_asset_owner_required', op: 'eq', value: true },
    },
    {
      key: 'put_isolation_place',
      stepType: 'task',
      displayLabel: 'Put Isolation in Place (Elect/Mech)',
      assignee: { strategy: 'role', roleKey: 'mech_elec_isolation_authority' },
    },
    {
      key: 'verify_isolation_so',
      stepType: 'verification',
      displayLabel: 'Verify Isolation',
      assignee: { strategy: 'role', roleKey: 'system_operator' },
    },
    {
      key: 'approve_isolation_ia',
      stepType: 'approval',
      displayLabel: 'Approve Isolation',
      assignee: { strategy: 'role', roleKey: 'issuing_authority' },
    },
    {
      key: 'request_deisolation',
      stepType: 'task',
      displayLabel: 'Request De-Isolation',
      assignee: { strategy: 'role', roleKey: 'performing_authority' },
    },
    {
      key: 'verify_deisolation_so',
      stepType: 'verification',
      displayLabel: 'Verify De-Isolation',
      assignee: { strategy: 'role', roleKey: 'system_operator' },
    },
    {
      key: 'approve_deisolation_ia',
      stepType: 'approval',
      displayLabel: 'Approve De-Isolation',
      assignee: { strategy: 'role', roleKey: 'issuing_authority' },
    },
    {
      key: 'confirm_deisolation_so',
      stepType: 'verification',
      displayLabel: 'Confirm De-Isolation',
      assignee: { strategy: 'role', roleKey: 'system_operator' },
    },
    {
      key: 'request_lti',
      stepType: 'approval',
      displayLabel: 'Request LTI',
      assignee: { strategy: 'role', roleKey: 'performing_authority' },
      entryWhen: { fact: 'lti_requested', op: 'eq', value: true },
    },
    {
      key: 'verify_lti_so',
      stepType: 'verification',
      displayLabel: 'Verify LTI',
      assignee: { strategy: 'role', roleKey: 'system_operator' },
      entryWhen: { fact: 'lti_requested', op: 'eq', value: true },
    },
    {
      key: 'endorse_lti_ia',
      stepType: 'endorsement',
      displayLabel: 'Endorse LTI',
      assignee: { strategy: 'role', roleKey: 'issuing_authority' },
      entryWhen: { fact: 'lti_requested', op: 'eq', value: true },
    },
    {
      key: 'approve_lti_oim',
      stepType: 'approval',
      displayLabel: 'Approve LTI',
      assignee: { strategy: 'role', roleKey: 'oim' },
      entryWhen: { fact: 'lti_requested', op: 'eq', value: true },
    },
  ],
  transitions: [
    { key: 't1', fromStepKey: 'submit', toStepKey: 'acceptance_ao', isDefault: true },
    { key: 't2', fromStepKey: 'acceptance_ao', toStepKey: 'acceptance_oao', condition: { fact: 'other_asset_owner_required', op: 'eq', value: true } },
    { key: 't3', fromStepKey: 'acceptance_ao', toStepKey: 'put_isolation_place', condition: { fact: 'other_asset_owner_required', op: 'eq', value: false } },
    { key: 't4', fromStepKey: 'acceptance_oao', toStepKey: 'put_isolation_place', isDefault: true },
    { key: 't5', fromStepKey: 'put_isolation_place', toStepKey: 'verify_isolation_so', isDefault: true },
    { key: 't6', fromStepKey: 'verify_isolation_so', toStepKey: 'approve_isolation_ia', isDefault: true },
    { key: 't7', fromStepKey: 'approve_isolation_ia', toStepKey: 'request_deisolation', isDefault: true },
    { key: 't8', fromStepKey: 'request_deisolation', toStepKey: 'verify_deisolation_so', isDefault: true },
    { key: 't9', fromStepKey: 'verify_deisolation_so', toStepKey: 'approve_deisolation_ia', isDefault: true },
    { key: 't10', fromStepKey: 'approve_deisolation_ia', toStepKey: 'confirm_deisolation_so', isDefault: true },
    { key: 't11', fromStepKey: 'confirm_deisolation_so', toStepKey: 'request_lti', condition: { fact: 'lti_requested', op: 'eq', value: true } },
    { key: 't12', fromStepKey: 'confirm_deisolation_so', toStepKey: 'submit', condition: { fact: 'rework_required', op: 'eq', value: true } },
    { key: 't13', fromStepKey: 'request_lti', toStepKey: 'verify_lti_so', isDefault: true },
    { key: 't14', fromStepKey: 'verify_lti_so', toStepKey: 'endorse_lti_ia', isDefault: true },
    { key: 't15', fromStepKey: 'endorse_lti_ia', toStepKey: 'approve_lti_oim', isDefault: true },
  ],
};

export const DEFAULT_TENANT_ROLE_TEMPLATES: TenantRoleTemplate[] = [
  ...PTW_ROLE_TEMPLATES_EXAMPLE,
  {
    key: 'tenant_admin',
    name: 'Tenant Admin',
    badge: 'Config and governance control',
    permissions: withAllPermissions(true),
  },
];

export const DEFAULT_TENANT_ROLE_PERMISSION_CONFIG: TenantRolePermissionConfig = {
  permissions: DEFAULT_TENANT_PERMISSIONS,
  roleTemplates: DEFAULT_TENANT_ROLE_TEMPLATES,
};

export type SimulationResult = {
  valid: boolean;
  stepsVisited: string[];
  warnings?: string[];
};

export type TenantConfigApi = {
  listDataDomains: ApiResponse<DataDomain[]>;
  listDomainRecords: ApiResponse<DomainRecord[]>;

  listFormTemplates: ApiResponse<FormTemplate[]>;
  getFormTemplate: ApiResponse<FormTemplate>;
  createFormTemplate: ApiResponse<FormTemplate>;
  updateFormTemplate: ApiResponse<FormTemplate>;
  publishFormTemplate: ApiResponse<FormTemplate>;
  archiveFormTemplate: ApiResponse<FormTemplate>;
  duplicateFormTemplate: ApiResponse<FormTemplate>;
  validateFormTemplate: ApiResponse<ValidationResult>;
  previewFormTemplate: ApiResponse<FormRender>;

  listWorkflowTemplates: ApiResponse<WorkflowTemplate[]>;
  getWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  createWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  updateWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  publishWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  archiveWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  duplicateWorkflowTemplate: ApiResponse<WorkflowTemplate>;
  validateWorkflowTemplate: ApiResponse<ValidationResult>;
  simulateWorkflowTemplate: ApiResponse<SimulationResult>;

  startWorkflowInstance: ApiResponse<WorkflowInstance>;
  getWorkflowInstance: ApiResponse<WorkflowInstance>;
  listRuntimeTasks: ApiResponse<TaskSummary[]>;
  renderTaskForm: ApiResponse<FormRender>;
  submitTaskAction: ApiResponse<TaskActionResult>;
  listAuditEvents: ApiResponse<AuditEvent[]>;
};
