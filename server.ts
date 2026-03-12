import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      actingAs?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Input Validation Helpers
// ============================================================================

/** Sanitize a string: trim + strip control characters */
const sanitize = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
};

/** Validate that a value is a non-empty trimmed string with max length */
const isValidString = (value: unknown, maxLen = 255): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLen;

/** Validate a hex color string */
const isValidHexColor = (value: unknown): boolean =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

/** Validate UUID format (loose - accepts any 36-char UUID-like string) */
const isValidId = (value: unknown): boolean =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);

/** Validate enum membership */
const isOneOf = <T extends string>(value: unknown, allowed: T[]): value is T =>
  typeof value === 'string' && (allowed as string[]).includes(value);

/** Validation error response helper */
const validationError = (res: Response, field: string, message: string) =>
  res.status(400).json({ error: `Validation error: ${field} — ${message}` });

// ============================================================================
// Audit Logging
// ============================================================================

type AuditEntry = {
  id: string;
  tenantId: string | null;
  actorId: string;
  actingAsId: string | null;
  impersonationSessionId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeSnapshot: any;
  afterSnapshot: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const auditLog: AuditEntry[] = [];

/** Write an audit log entry for any CUD operation */
const writeAudit = (
  req: Request,
  action: string,
  entityType: string,
  entityId: string | null,
  before: any = null,
  after: any = null
) => {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: req.actingAs?.actingAsTenantId || req.user?.tenantId || null,
    actorId: req.user?.id || 'anonymous',
    actingAsId: req.actingAs?.actingAsUserId || null,
    impersonationSessionId: req.actingAs?.impersonationSessionId || null,
    action,
    entityType,
    entityId,
    beforeSnapshot: before ? JSON.stringify(before) : null,
    afterSnapshot: after ? JSON.stringify(after) : null,
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
    createdAt: new Date().toISOString(),
  };
  auditLog.push(entry);
  return entry;
};

// ============================================================================
// Mock Storage
// ============================================================================

const feedbackStorage: any[] = [];
const submissionRateLimit = new Map<string, number[]>();

const defaultSystemTheme = {
  primaryColor: "#001689", // Navy blue
  secondaryColor: "#2A7DE1", // Sky blue
  accentColor: "#2ED9C3", // Teal
  fontFamily: "Montserrat, sans-serif",
  defaultMode: "light",
  allowUserModeToggle: true,
  logoUrl: "https://picsum.photos/seed/virtus/200/50",
  layoutColors: {
    header: "#0055B8", // Deep blue
    leftPanel: "#001689", // Navy blue
    mainPage: "#f8fafc", // slate-50
    font: "#0f172a" // slate-900
  },
  graphColors: ["#2ED9C3", "#2A7DE1", "#0055B8", "#001689", "#64748b"]
};

let systemConfig = {
  theme: { ...defaultSystemTheme }
};

const tenantThemes = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  // Mock Login
  app.post("/api/v1/auth/login", (req, res) => {
    const { username, password } = req.body;
    
    // Simple mock users
    const mockUsers: Record<string, any> = {
      'superadmin': { id: 'sa-1', role: 'super_admin', displayName: 'Global Admin', tenantId: null, email: 'admin@virtus.com' },
      'support': { id: 'sup-1', role: 'support', displayName: 'Support Engineer', tenantId: null, email: 'support@virtus.com' },
      'tenantadmin': { id: 'ta-1', role: 'tenant_admin', displayName: 'Acme Admin', tenantId: 'tenant-demo', email: 'admin@acme.com' },
      'user': { id: 'u-1', role: 'user', displayName: 'John Doe', tenantId: 'tenant-demo', email: 'john@acme.com' },
      'supportfocal': { id: 'sf-1', role: 'support_focal', displayName: 'Support Team', tenantId: 'tenant-demo', email: 'support@acme.com' }
    };

    const user = mockUsers[username];
    if (user && password === 'password') {
      const token = Buffer.from(JSON.stringify(user)).toString('base64');
      res.json({ user, token });
    } else {
      res.status(401).json({ error: "Invalid credentials. Try 'superadmin', 'tenantadmin', 'user', or 'support' with password 'password'." });
    }
  });

  // Mock Auth Middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const appSession = req.headers['x-app-session'];
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        req.user = JSON.parse(Buffer.from(token, 'base64').toString());
      } catch (e) {}
    }
    
    if (appSession) {
      try {
        const session = JSON.parse(Buffer.from(appSession as string, 'base64').toString());
        req.actingAs = session;
      } catch (e) {}
    }
    
    next();
  });

  app.get("/api/v1/me", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      user: req.user,
      actingAs: req.actingAs || req.user,
      isImpersonating: !!req.actingAs?.isImpersonating
    });
  });

  // Role Switch (Tenant Admin only)
  app.post("/api/v1/auth/switch-role", (req, res) => {
    const realRole = req.user?.role;
    
    // Only allow if:
    // 1. Real user is tenant_admin
    // 2. Currently acting as tenant_admin
    // 3. The impersonated user's original role was tenant_admin
    // 4. We have a preserved realUserRole that is tenant_admin
    const canSwitch = 
      realRole === 'tenant_admin' || 
      req.actingAs?.actingAsRole === 'tenant_admin' || 
      req.actingAs?.role === 'tenant_admin' ||
      req.actingAs?.targetBaseRole === 'tenant_admin' ||
      req.actingAs?.realUserRole === 'tenant_admin';

    if (!canSwitch) {
      return res.status(403).json({ error: "Only Tenant Admins or those acting as them can switch roles" });
    }

    const { targetRole } = req.body;
    
    // If we are switching back to the REAL role of the user, and we are NOT impersonating someone else,
    // we can just clear the session to return to the natural state.
    const isImpersonating = !!req.actingAs?.isImpersonating;
    if (!isImpersonating && targetRole === realRole) {
      return res.json({ token: null });
    }
    
    // If impersonating, we need to update the actingAsRole in the session
    if (req.actingAs) {
      const sessionToken = Buffer.from(JSON.stringify({
        ...req.actingAs,
        role: targetRole,
        actingAsRole: targetRole,
        isSwitched: true
        // targetBaseRole is preserved via ...req.actingAs
      })).toString('base64');
      return res.json({ token: sessionToken });
    }

    // Normal tenant admin switching their own role
    const sessionToken = Buffer.from(JSON.stringify({
      ...req.user,
      role: targetRole,
      realUserRole: req.user.role, // Preserve the real role
      isSwitched: true
    })).toString('base64');
    res.json({ token: sessionToken });
  });

  // Catalog
  app.get("/api/v1/catalog", (req, res) => {
    res.json({
      domains: [
        {
          id: "hse",
          name: "HSE Domain",
          modules: [
            {
              id: "ptw",
              name: "Permit To Work (PTW)",
              description: "A digital control-of-work system ensuring all hazardous tasks are properly assessed and authorized.",
              features: [
                { id: "ptw-flow", name: "Permit-to-Work", description: "End-to-end workflow for issuing, approving, and closing permits." },
                { id: "ptw-jsa", name: "Job Safety Analysis", description: "Risk assessment for job steps, hazards, controls." },
                { id: "ptw-certs", name: "Certificates", description: "Mandatory certificates (gas test, electrical isolation, etc.)." },
                { id: "ptw-iso", name: "Isolation", description: "Managing mechanical/electrical isolations and LOTO." },
                { id: "ptw-audit", name: "Audit", description: "PTW compliance audits and field inspections." }
              ]
            },
            {
              id: "passport",
              name: "Safety Passport",
              description: "Tracks competency, qualifications, and validity for both staff and contractors.",
              features: [
                { id: "sp-osp", name: "OSP", description: "Offshore Safety Passport systems." },
                { id: "sp-ogsp", name: "OGSP", description: "Oil and Gas Safety Passport systems." },
                { id: "sp-comp", name: "Contractor Competency", description: "Ensures contractors meet competency setup." },
                { id: "sp-sub", name: "Subcontractor Management", description: "Master contractors manage their contractor." }
              ]
            },
            {
              id: "bbs",
              name: "Behavioral Based Safety (BBS)",
              description: "A proactive approach to prevent incidents by reporting unsafe acts and conditions.",
              features: [
                { id: "bbs-uauc", name: "BBS/UAUC Reporting", description: "Capturing Unsafe Act/Condition or Safe Behaviour reports." },
                { id: "bbs-dash", name: "Analytic Dashboard", description: "Potential Incident/LEAI dashboard based on reports." }
              ]
            },
            {
              id: "occ-safety",
              name: "Occupational Safety",
              description: "Focuses on workforce health, fatigue control, and emergency readiness.",
              features: [
                { id: "os-fatigue", name: "Fatigue Management", description: "Prevent overwork through automated duty-hour calculations." },
                { id: "os-dev", name: "Fatigue Deviation", description: "Approval to proceed work when fatigue case happened." },
                { id: "os-must", name: "Mustering Management", description: "Live headcount during drills/real emergencies." },
                { id: "os-inc", name: "Incident Management", description: "Logs injuries, near misses, and corrective action tracking." }
              ]
            },
            {
              id: "gov",
              name: "Governance",
              description: "Ensures compliance with corporate safety frameworks and governance tasks.",
              features: [
                { id: "gov-task", name: "Governance Task Management", description: "Assign, monitor, and audit compliance tasks." }
              ]
            },
            {
              id: "barrier",
              name: "Barrier Management",
              description: "A major risk management framework aligned with Safety Case & Bowtie methodology.",
              features: [
                { id: "bm-int", name: "Barrier Integrity", description: "Tracks performance and health of safety barriers." },
                { id: "bm-dev", name: "Deviation Management", description: "Logs barrier failures and degradation." },
                { id: "bm-def", name: "Deferral Management", description: "Approvals for delayed maintenance." },
                { id: "bm-bowtie", name: "Bowtie Visualization", description: "Shows threats, controls, consequences." },
                { id: "bm-map", name: "Risk Map", description: "Color-coded risk heat map for decision-making." },
                { id: "bm-emoc", name: "EMOC", description: "Engineering Management of Change workflow." }
              ]
            }
          ]
        },
        {
          id: "productivity",
          name: "Productivity Domain",
          modules: [
            {
              id: "task-mgmt",
              name: "Task Management",
              description: "Centralized system to plan and track work execution.",
              features: [
                { id: "tm-sched", name: "Task Scheduling", description: "Routine or non-routine work planning." },
                { id: "tm-check", name: "Digital Checklist", description: "Step-by-step execution with verification." },
                { id: "tm-ext", name: "External Task Integration", description: "Imports jobs from CMMS or ERP." },
                { id: "tm-proj", name: "Project Task", description: "Large project task tracking (shutdown/turnaround)." }
              ]
            },
            {
              id: "logbook",
              name: "Digital Logbook",
              description: "A structured electronic replacement for traditional shift logbooks.",
              features: [
                { id: "dl-shift", name: "Shift Log", description: "Daily ops summary per shift and handover." },
                { id: "dl-find", name: "Finding Log", description: "Auto create on abnormal checklist input." },
                { id: "dl-act", name: "Action Log", description: "Items that require follow-up with owners." },
                { id: "dl-gen", name: "General Log", description: "Free-form log entries and configurable." }
              ]
            },
            {
              id: "manning",
              name: "Manning Management",
              description: "Optimizes resource allocation and workforce deployment.",
              features: [
                { id: "mm-plan", name: "Manpower Planning", description: "Ensure adequate coverage by roles/qualifications." },
                { id: "mm-role", name: "Role & Area Assignment", description: "Default Area and Role assignment for staff." },
                { id: "mm-ot", name: "Overtime Management", description: "Automated OT calculation and request handling." },
                { id: "mm-gen", name: "Schedule Generation", description: "Shift roster creation." }
              ]
            },
            {
              id: "innovation",
              name: "Innovation Pod",
              description: "A structured platform to collect, evaluate, and implement improvement ideas.",
              features: [
                { id: "ip-bank", name: "Idea Bank", description: "Central repository of employee ideas." },
                { id: "ip-eval", name: "Idea Evaluation", description: "Scoring, feasibility checks, SME reviews." },
                { id: "ip-exec", name: "Idea Execution", description: "Implementation plan tracking." }
              ]
            }
          ]
        },
        {
          id: "logistic",
          name: "Logistic Domain",
          modules: [
            {
              id: "transport",
              name: "Transport Management",
              description: "Manages booking and tracking of transport for staff and contractors.",
              features: [
                { id: "tr-book", name: "Transport Booking", description: "Land Vehicle, Vessel, boats, helicopters." },
                { id: "tr-stat", name: "Transport Status", description: "Vehicle status (arrived, departed, delayed)." },
                { id: "tr-man", name: "Manifest", description: "Passenger manifest for compliance and safety." }
              ]
            },
            {
              id: "lodging",
              name: "Lodging & Accommodation",
              description: "Ensures efficient assignment of accommodations.",
              features: [
                { id: "la-room", name: "Room Booking", description: "Automated allocation of rooms (onshore/offshore)." },
                { id: "la-gate", name: "Safety Boat / Gate Assignment", description: "Safety boat duty rotation and gate access rules." }
              ]
            },
            {
              id: "pob",
              name: "POB Management",
              description: "Tracks number of people on site or offshore facility in real time.",
              features: [
                { id: "pob-mob", name: "Mob & Demob", description: "Movement tracking (arrival/departure)." },
                { id: "pob-tour", name: "Tour of Duty", description: "Tracks duration of stay, rotations, and validity." }
              ]
            }
          ]
        }
      ]
    });
  });

  // Tenants
  const tenantDirectory: Array<{ id: string; name: string; status: 'active' | 'inactive'; usersCount: number; lastActivity: string }> = [
    { id: 'tenant-demo', name: 'Acme Corp (Demo)', status: 'active', usersCount: 50, lastActivity: new Date().toISOString() },
    { id: 'cpoc', name: 'CPOC', status: 'active', usersCount: 850, lastActivity: new Date().toISOString() },
    { id: 'conocophillips', name: 'ConocoPhilips', status: 'active', usersCount: 1200, lastActivity: new Date(Date.now() - 3600000).toISOString() },
    { id: 'xplora', name: 'Xplora Malaysia', status: 'active', usersCount: 450, lastActivity: new Date(Date.now() - 86400000).toISOString() },
    { id: 'pcgpcc', name: 'PCGPCC', status: 'active', usersCount: 2100, lastActivity: new Date(Date.now() - 172800000).toISOString() },
  ];

  app.get("/api/v1/tenants", (req, res) => {
    const tenants = tenantDirectory.map(t => ({
      ...t,
      themeConfig: tenantThemes.get(t.id) || null
    }));
    res.json(tenants);
  });

  app.get("/api/v1/tenants/:id", (req, res) => {
    const { id } = req.params;
    const tenant = tenantDirectory.find(t => t.id === id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json({
      ...tenant,
      themeConfig: tenantThemes.get(id) || null
    });
  });

  app.post("/api/v1/tenants/:id/theme", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { themeConfig } = req.body;

    // Permissions: Super Admin or Tenant Admin of this tenant
    const isSuperAdmin = req.user.role === 'super_admin';
    const isTenantAdmin = req.user.role === 'tenant_admin' && (req.actingAs?.actingAsTenantId || req.user.tenantId) === id;

    if (!isSuperAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: "Insufficient permissions to update theme" });
    }

    tenantThemes.set(id, themeConfig);
    res.json({ success: true, themeConfig });
  });

  // System Config
  app.get("/api/v1/system/config", (req, res) => {
    res.json(systemConfig);
  });

  app.post("/api/v1/system/config", (req, res) => {
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only Super Admins can update system config" });
    }
    systemConfig = { ...systemConfig, ...req.body };
    res.json(systemConfig);
  });

  // Resolved Theme
  app.get("/api/v1/theme/resolved", (req, res) => {
    const tenantId = req.actingAs?.actingAsTenantId || req.user?.tenantId;
    const tenantTheme = tenantId ? tenantThemes.get(tenantId) : null;
    
    // Resolution: System -> Tenant Overrides
    // Note: Deep merge for layoutColors if needed, but simple spread for now
    const resolvedTheme = {
      ...systemConfig.theme,
      ...(tenantTheme || {}),
      // Ensure font family is always Montserrat as per requirement
      fontFamily: "Montserrat, sans-serif",
      layoutColors: {
        ...systemConfig.theme.layoutColors,
        ...(tenantTheme?.layoutColors || {})
      }
    };

    res.json(resolvedTheme);
  });

  // Audit Log API (platform-only read access)
  app.get("/api/v1/audit-logs", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const role = req.user.role;
    if (role !== 'super_admin' && role !== 'support') {
      return res.status(403).json({ error: "Only platform roles can access audit logs" });
    }
    const tenantId = req.query.tenantId as string | undefined;
    const entityType = req.query.entityType as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    let filtered = auditLog;
    if (tenantId) filtered = filtered.filter(e => e.tenantId === tenantId);
    if (entityType) filtered = filtered.filter(e => e.entityType === entityType);
    res.json(filtered.slice(-limit).reverse());
  });

  // Feedback API
  app.post("/api/v1/feedback", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { type, score, message, category, pageUrl, routeName, clientMeta } = req.body;
    const userId = req.user.id;
    const now = Date.now();

    // Rate limiting: max 5 feedback submissions per user per 10 minutes
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const userSubmissions = (submissionRateLimit.get(userId) || []).filter(t => t > tenMinutesAgo);
    
    if (userSubmissions.length >= 5) {
      return res.status(429).json({ error: "Too many feedback submissions. Please try again later." });
    }

    // Validation
    if (type === 'CSAT') {
      if (typeof score !== 'number' || score < 1 || score > 5) {
        return res.status(400).json({ error: "CSAT score must be between 1 and 5" });
      }
    } else if (type === 'NPS') {
      if (typeof score !== 'number' || score < 0 || score > 10) {
        return res.status(400).json({ error: "NPS score must be between 0 and 10" });
      }
    } else if (type === 'TEXT') {
      if (!message || message.length < 10) {
        return res.status(400).json({ error: "Message must be at least 10 characters long" });
      }
    } else {
      return res.status(400).json({ error: "Invalid feedback type" });
    }

    const feedback = {
      id: `fb-${now}`,
      tenantId: req.actingAs?.tenantId || req.user.tenantId,
      userId: req.user.id,
      actingAsUserId: req.actingAs?.id !== req.user.id ? req.actingAs?.id : null,
      pageUrl,
      routeName,
      type,
      score,
      category,
      message,
      createdAt: new Date().toISOString(),
      appVersion: process.env.VITE_APP_VERSION || '1.0.0',
      clientMeta
    };

    feedbackStorage.push(feedback);
    userSubmissions.push(now);
    submissionRateLimit.set(userId, userSubmissions);

    writeAudit(req, 'CREATE', 'feedback', feedback.id, null, { feedbackId: feedback.id, type });

    res.status(201).json({ success: true, id: feedback.id });
  });

  // Users
  app.get("/api/v1/users", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    
    // Mock users for the tenant
    const users = [
      { id: 'u-1', displayName: 'John Doe', email: 'john@acme.com', role: 'user', tenantId: 'tenant-demo' },
      { id: 'u-2', displayName: 'Jane Smith', email: 'jane@acme.com', role: 'user', tenantId: 'tenant-demo' },
      { id: 'u-3', displayName: 'Bob Wilson', email: 'bob@acme.com', role: 'user', tenantId: 'tenant-demo' },
      { id: 'ta-1', displayName: 'Acme Admin', email: 'admin@acme.com', role: 'tenant_admin', tenantId: 'tenant-demo' }
    ];

    if (req.user.role === 'super_admin' || req.user.role === 'support') {
      res.json(users);
    } else {
      res.json(users.filter(u => u.tenantId === tenantId));
    }
  });

  // Templates
  app.get("/api/v1/templates", (req, res) => {
    res.json([]);
  });

  // Impersonation
  app.post("/api/v1/impersonation/start", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { targetUserId, tenantId } = req.body;
    
    // Permission checks
    const isPlatform = req.user.role === 'super_admin' || req.user.role === 'support';
    const isTenantAdmin = req.user.role === 'tenant_admin';
    const isSameTenant = req.user.tenantId === tenantId;
    
    // super_admin & support: Can impersonate any tenant_admin or user of any tenant.
    // tenant_admin: Can impersonate users within their own extension_tenantId only.
    if (!isPlatform && !(isTenantAdmin && isSameTenant)) {
      return res.status(403).json({ error: "Insufficient permissions to impersonate this user" });
    }

    // In a real app, we would fetch the target user from DB
    // For mock, we'll determine role based on ID
    const targetRole = targetUserId.includes('admin') || targetUserId.startsWith('ta-') ? "tenant_admin" : "user";
    
    const targetUser = {
      id: targetUserId,
      tenantId: tenantId,
      role: targetRole,
      displayName: `Impersonated ${targetRole === 'tenant_admin' ? 'Admin' : 'User'} (${targetUserId})`,
      email: `user-${targetUserId}@example.com`
    };

    const impersonationSessionId = `imp-${Date.now()}`;
    writeAudit(req, 'IMPERSONATION_START', 'user', targetUserId, null, { targetUserId, tenantId });

    const sessionToken = Buffer.from(JSON.stringify({
      realUserId: req.user.id,
      realUserRole: req.user.role,
      realUserIsPlatform: isPlatform,
      actingAsUserId: targetUser.id,
      actingAsTenantId: targetUser.tenantId,
      actingAsDisplayName: targetUser.displayName,
      actingAsRole: targetUser.role,
      targetBaseRole: targetUser.role, // Store the original role of the target
      impersonationSessionId: impersonationSessionId,
      isImpersonating: true,
      startedAt: new Date().toISOString()
    })).toString('base64');

    res.json({ 
      token: sessionToken, 
      actingAs: {
        id: targetUser.id,
        role: targetUser.role,
        tenantId: targetUser.tenantId
      }
    });
  });

  app.post("/api/v1/impersonation/stop", (req, res) => {
    if (req.actingAs) {
      writeAudit(req, 'IMPERSONATION_STOP', 'user', req.actingAs.actingAsUserId, null, null);
    }
    res.json({ success: true });
  });

  // Dashboard Layouts
  const dashboardLayouts = new Map<string, any>();
  const taskDashboardLayouts = new Map<string, any>();

  // Mock Tasks
  const mockTasks: any[] = [
    { id: 'T-001', title: 'Review Hot Work Permit', status: 'pending', priority: 'high', module: 'ptw', assignedTo: 'u-1', createdAt: '2024-03-01T10:00:00Z', dueDate: '2024-03-10T17:00:00Z' },
    { id: 'T-002', title: 'Complete Safety Induction', status: 'in_progress', priority: 'medium', module: 'passport', assignedTo: 'u-1', createdAt: '2024-03-02T09:00:00Z', dueDate: '2024-03-15T17:00:00Z' },
    { id: 'T-003', title: 'Submit BBS Observation', status: 'pending', priority: 'low', module: 'bbs', assignedTo: 'u-1', createdAt: '2024-03-03T14:00:00Z', dueDate: '2024-03-08T17:00:00Z' },
    { id: 'T-004', title: 'Update Fatigue Log', status: 'completed', priority: 'medium', module: 'occ-safety', assignedTo: 'u-1', createdAt: '2024-03-01T08:00:00Z', dueDate: '2024-03-01T17:00:00Z' },
    { id: 'T-005', title: 'Equipment Inspection', status: 'pending', priority: 'high', module: 'ptw', assignedTo: 'u-1', createdAt: '2024-03-04T11:00:00Z', dueDate: '2024-03-12T17:00:00Z' },
    { id: 'T-006', title: 'Shift Handover Report', status: 'pending', priority: 'medium', module: 'logbook', assignedTo: 'u-1', createdAt: '2024-03-05T07:00:00Z', dueDate: '2024-03-05T08:00:00Z' },
  ];

  app.get("/api/v1/tasks", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    
    // Filter by assigned user (strictly personal)
    const userTasks = mockTasks.filter(t => t.assignedTo === userId);
    res.json(userTasks);
  });

  app.get("/api/v1/tasks/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const key = `${tenantId}:${userId}`;
    const layout = taskDashboardLayouts.get(key);
    res.json(layout || { layoutJson: null });
  });

  app.post("/api/v1/tasks/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const { layoutJson } = req.body;
    const key = `${tenantId}:${userId}`;
    taskDashboardLayouts.set(key, {
      tenantId,
      userId,
      layoutJson,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  });

  app.get("/api/v1/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const key = `${tenantId}:${userId}`;
    const layout = dashboardLayouts.get(key);
    res.json(layout || { layoutJson: null });
  });

  app.post("/api/v1/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const { layoutJson } = req.body;
    const key = `${tenantId}:${userId}`;
    dashboardLayouts.set(key, {
      tenantId,
      userId,
      layoutJson,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  });

  // Tenant Admin Management Resources
  type FormTemplateRecord = {
    id: string;
    tenantId: string;
    name: string;
    sections: number;
    conditionalRules: number;
    status: 'draft' | 'published' | 'archived';
    updatedAt: string;
  };

  type FormVersionRecord = {
    formId: string;
    versionNumber: number;
    status: 'draft' | 'published' | 'archived';
    schema: any;
    publishedBy: string | null;
    publishedAt: string | null;
    createdAt: string;
  };

  type FormSubmissionRecord = {
    id: string;
    tenantId: string;
    formId: string;
    versionNumber: number;
    status: 'in_progress' | 'submitted' | 'cancelled';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };

  type WorkflowRecord = {
    id: string;
    tenantId: string;
    name: string;
    linkedForm: string;
    steps: number;
    sla: string;
    status?: 'draft' | 'published' | 'archived';
    updatedAt: string;
  };

  type RoleRecord = {
    id: string;
    tenantId: string;
    name: string;
    users: number;
    modules: string;
    updatedAt: string;
  };

  type DataRecord = {
    id: string;
    tenantId: string;
    scope: 'org' | 'module';
    type?: string;
    module?: string;
    entity?: string;
    value: string;
    updatedAt: string;
  };

  type TenantUserAssignmentRecord = {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    division: string;
    role: string;
    companyDepartment: string;
    status: 'Active' | 'Inactive' | 'Pending';
    assets: string[];
    sites: string[];
    remark: string;
    updatedAt: string;
  };

  const formTemplatesStore = new Map<string, FormTemplateRecord[]>();
  const formTemplateSchemaStore = new Map<string, Record<string, any>>();
  const formVersionStore = new Map<string, Record<string, FormVersionRecord[]>>();
  const formSubmissionStore = new Map<string, FormSubmissionRecord[]>();
  const ptwFormTemplateStore = new Map<string, { template: any; updatedAt: string }>();
  const workflowStore = new Map<string, WorkflowRecord[]>();
  const roleStore = new Map<string, RoleRecord[]>();
  const dataStore = new Map<string, DataRecord[]>();
  const tenantUserStore = new Map<string, TenantUserAssignmentRecord[]>();

  const getTenantScope = (req: Request) => req.actingAs?.actingAsTenantId || req.user?.tenantId || 'platform';

  const resolveRequestedTenantScope = (req: Request) => {
    const requestedTenantId = getTenantScope(req);
    const effectiveRole = req.actingAs?.actingAsRole || req.actingAs?.role || req.user?.role;
    const userTenantId = req.user?.tenantId || null;

    if (!requestedTenantId || requestedTenantId === 'platform') {
      if (effectiveRole === 'super_admin' || effectiveRole === 'support') return requestedTenantId;
      return userTenantId;
    }

    if (effectiveRole === 'super_admin' || effectiveRole === 'support') return requestedTenantId;
    if (requestedTenantId !== userTenantId) return null;
    return requestedTenantId;
  };

  const canManageTenantAdminResources = (req: Request) => {
    const role = req.actingAs?.actingAsRole || req.actingAs?.role || req.user?.role;
    return role === 'tenant_admin' || role === 'support_focal' || role === 'super_admin' || role === 'support';
  };

  const ensureSeedData = (tenantId: string) => {
    if (!formTemplatesStore.has(tenantId)) {
      formTemplatesStore.set(tenantId, [
        { id: 'F-101', tenantId, name: 'Hot Work Permit', sections: 5, conditionalRules: 8, status: 'published', updatedAt: new Date().toISOString() },
        { id: 'F-102', tenantId, name: 'Confined Space Entry', sections: 6, conditionalRules: 5, status: 'draft', updatedAt: new Date().toISOString() },
      ]);
    }

    if (!workflowStore.has(tenantId)) {
      workflowStore.set(tenantId, [
        { id: 'WF-01', tenantId, name: 'Permit Approval Flow', linkedForm: 'Hot Work Permit', steps: 4, sla: '24h', updatedAt: new Date().toISOString() },
        { id: 'WF-02', tenantId, name: 'Incident Escalation Flow', linkedForm: 'Confined Space Entry', steps: 5, sla: '12h', updatedAt: new Date().toISOString() },
      ]);
    }

    if (!roleStore.has(tenantId)) {
      roleStore.set(tenantId, [
        { id: 'R-01', tenantId, name: 'Permit Approver', users: 12, modules: 'PTW, Task Mgmt', updatedAt: new Date().toISOString() },
        { id: 'R-02', tenantId, name: 'Safety Reviewer', users: 7, modules: 'OHS, Barrier', updatedAt: new Date().toISOString() },
      ]);
    }

    if (!dataStore.has(tenantId)) {
      dataStore.set(tenantId, [
        { id: 'D-01', tenantId, scope: 'org', type: 'Department', value: 'Operations', updatedAt: new Date().toISOString() },
        { id: 'D-02', tenantId, scope: 'org', type: 'Region', value: 'North Field', updatedAt: new Date().toISOString() },
        { id: 'D-03', tenantId, scope: 'module', module: 'PTW', entity: 'Permit Category', value: 'High Risk Work', updatedAt: new Date().toISOString() },
      ]);
    }

    if (!tenantUserStore.has(tenantId)) {
      tenantUserStore.set(tenantId, [
        {
          id: 'TU-01',
          tenantId,
          name: 'Nur Aisyah',
          email: 'nur.aisyah@virtus.com',
          division: 'Operations',
          role: 'Permit Approver',
          companyDepartment: 'Offshore Ops',
          status: 'Active',
          assets: ['ST-44', 'PV-901'],
          sites: ['North Field'],
          remark: 'Night shift approver',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'TU-02',
          tenantId,
          name: 'Daniel Wong',
          email: 'daniel.wong@virtus.com',
          division: 'HSE',
          role: 'Safety Reviewer',
          companyDepartment: 'HSE Central',
          status: 'Active',
          assets: ['HE-11'],
          sites: ['Offshore Cluster'],
          remark: 'Lead reviewer',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'TU-03',
          tenantId,
          name: 'Siti Nadia',
          email: 'siti.nadia@virtus.com',
          division: 'Maintenance',
          role: 'Technician',
          companyDepartment: 'Mechanical Team',
          status: 'Pending',
          assets: ['PV-901'],
          sites: ['South Terminal'],
          remark: 'Awaiting onboarding',
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    if (!formTemplateSchemaStore.has(tenantId)) {
      const record: Record<string, any> = {};
      const list = formTemplatesStore.get(tenantId) || [];
      list.forEach((item) => {
        record[item.id] = {
          key: item.name.toLowerCase().replace(/\s+/g, '_'),
          name: item.name,
          description: `${item.name} editable schema`,
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
        };
      });
      formTemplateSchemaStore.set(tenantId, record);
    }

    if (!formVersionStore.has(tenantId)) {
      const versionsByForm: Record<string, FormVersionRecord[]> = {};
      const formList = formTemplatesStore.get(tenantId) || [];
      const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
      const now = new Date().toISOString();

      formList.forEach((form) => {
        const schema = schemaMap[form.id] || {
          key: form.name.toLowerCase().replace(/\s+/g, '_'),
          name: form.name,
          sections: [],
        };
        versionsByForm[form.id] = [
          {
            formId: form.id,
            versionNumber: 1,
            status: form.status,
            schema: JSON.parse(JSON.stringify(schema)),
            publishedBy: form.status === 'published' ? 'system' : null,
            publishedAt: form.status === 'published' ? now : null,
            createdAt: now,
          },
        ];
      });

      formVersionStore.set(tenantId, versionsByForm);
    }

    if (!formSubmissionStore.has(tenantId)) {
      formSubmissionStore.set(tenantId, []);
    }
  };

  const getVersionsByForm = (tenantId: string) => formVersionStore.get(tenantId) || {};

  const getFormVersions = (tenantId: string, formId: string) => getVersionsByForm(tenantId)[formId] || [];

  const saveFormVersions = (tenantId: string, formId: string, versions: FormVersionRecord[]) => {
    const map = getVersionsByForm(tenantId);
    map[formId] = versions;
    formVersionStore.set(tenantId, map);
  };

  const getNextVersionNumber = (versions: FormVersionRecord[]) =>
    versions.reduce((maxVersion, version) => Math.max(maxVersion, version.versionNumber), 0) + 1;

  const getLatestPublishedVersion = (versions: FormVersionRecord[]) => {
    const published = versions.filter((version) => version.status === 'published');
    return published.sort((a, b) => b.versionNumber - a.versionNumber)[0] || null;
  };

  const getLatestDraftVersion = (versions: FormVersionRecord[]) => {
    const drafts = versions.filter((version) => version.status === 'draft');
    return drafts.sort((a, b) => b.versionNumber - a.versionNumber)[0] || null;
  };

  const syncTemplateRecordFromVersions = (tenantId: string, formId: string) => {
    const list = formTemplatesStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === formId);
    if (idx === -1) return;

    const versions = getFormVersions(tenantId, formId);
    const latestDraft = getLatestDraftVersion(versions);
    const latestPublished = getLatestPublishedVersion(versions);
    const targetVersion = latestDraft || latestPublished || versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (!targetVersion) return;

    const status = latestPublished
      ? latestDraft
        ? 'draft'
        : 'published'
      : 'archived';

    list[idx] = {
      ...list[idx],
      sections: Array.isArray(targetVersion.schema?.sections) ? targetVersion.schema.sections.length : list[idx].sections,
      conditionalRules: 0,
      status,
      updatedAt: new Date().toISOString(),
    };
    formTemplatesStore.set(tenantId, list);
  };

  const parseCsv = (csvText: string) => {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((col) => col.trim());
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = cols[idx] || '';
      });
      return record;
    });
  };

  const cloneFormTemplateRecords = (
    sourceTenantId: string,
    targetTenantId: string
  ): { records: FormTemplateRecord[]; idMap: Record<string, string> } => {
    const now = new Date().toISOString();
    const idMap: Record<string, string> = {};
    const records = (formTemplatesStore.get(sourceTenantId) || []).map((item, index) => {
      const nextId = `F-${Date.now()}-${index}`;
      idMap[item.id] = nextId;
      return {
        ...item,
        id: nextId,
        tenantId: targetTenantId,
        updatedAt: now,
      };
    });

    return { records, idMap };
  };

  const cloneFormTemplateSchemas = (sourceTenantId: string, idMap: Record<string, string>): Record<string, any> => {
    const schemas = formTemplateSchemaStore.get(sourceTenantId) || {};
    const cloned: Record<string, any> = {};

    Object.entries(idMap).forEach(([sourceId, targetId]) => {
      if (schemas[sourceId]) {
        cloned[targetId] = JSON.parse(JSON.stringify(schemas[sourceId]));
      }
    });

    return cloned;
  };

  const cloneFormVersions = (sourceTenantId: string, idMap: Record<string, string>): Record<string, FormVersionRecord[]> => {
    const source = formVersionStore.get(sourceTenantId) || {};
    const cloned: Record<string, FormVersionRecord[]> = {};

    Object.entries(idMap).forEach(([sourceFormId, targetFormId]) => {
      const versions = source[sourceFormId] || [];
      cloned[targetFormId] = versions.map((version) => ({
        ...JSON.parse(JSON.stringify(version)),
        formId: targetFormId,
      }));
    });

    return cloned;
  };

  const clonePtwTemplateRecord = (sourceTenantId: string) => {
    const record = ptwFormTemplateStore.get(sourceTenantId);
    if (!record) return null;
    return {
      template: JSON.parse(JSON.stringify(record.template)),
      updatedAt: new Date().toISOString(),
    };
  };

  const cloneWorkflowRecords = (sourceTenantId: string, targetTenantId: string): WorkflowRecord[] => {
    const now = new Date().toISOString();
    return (workflowStore.get(sourceTenantId) || []).map((item, index) => ({
      ...item,
      id: `WF-${Date.now()}-${index}`,
      tenantId: targetTenantId,
      updatedAt: now,
    }));
  };

  const cloneRoleRecords = (sourceTenantId: string, targetTenantId: string): RoleRecord[] => {
    const now = new Date().toISOString();
    return (roleStore.get(sourceTenantId) || []).map((item, index) => ({
      ...item,
      id: `R-${Date.now()}-${index}`,
      tenantId: targetTenantId,
      updatedAt: now,
    }));
  };

  const cloneDataRecords = (sourceTenantId: string, targetTenantId: string): DataRecord[] => {
    const now = new Date().toISOString();
    return (dataStore.get(sourceTenantId) || []).map((item, index) => ({
      ...item,
      id: `D-${Date.now()}-${index}`,
      tenantId: targetTenantId,
      updatedAt: now,
    }));
  };

  app.post('/api/v1/tenants/duplicate', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const role = req.user.role;
    if (role !== 'super_admin' && role !== 'support') {
      return res.status(403).json({ error: 'Only platform roles can duplicate tenants' });
    }

    const sourceTenantId = String(req.body.sourceTenantId || '').trim();
    const overrides = req.body.overrides || {};
    const requestedId = String(overrides.id || '').trim().toLowerCase();
    const requestedName = String(overrides.name || '').trim();

    if (!sourceTenantId) return res.status(400).json({ error: 'sourceTenantId is required' });

    const sourceTenant = tenantDirectory.find((tenant) => tenant.id === sourceTenantId);
    if (!sourceTenant) return res.status(404).json({ error: 'Source tenant not found' });

    const nextTenantId = requestedId || `${sourceTenantId}-copy-${Date.now()}`;
    if (tenantDirectory.some((tenant) => tenant.id === nextTenantId)) {
      return res.status(409).json({ error: 'Target tenant id already exists' });
    }

    const clonedTenant = {
      id: nextTenantId,
      name: requestedName || `${sourceTenant.name} (Copy)`,
      status: 'active' as const,
      usersCount: 0,
      lastActivity: new Date().toISOString(),
    };

    // Clone configuration only: forms/workflows/roles/data/theme.
    // Do NOT clone runtime/user data such as assignments/submissions/audits.
    const clonedFormTemplates = cloneFormTemplateRecords(sourceTenantId, nextTenantId);
    formTemplatesStore.set(nextTenantId, clonedFormTemplates.records);
    formTemplateSchemaStore.set(nextTenantId, cloneFormTemplateSchemas(sourceTenantId, clonedFormTemplates.idMap));
    formVersionStore.set(nextTenantId, cloneFormVersions(sourceTenantId, clonedFormTemplates.idMap));
    const clonedPtwTemplate = clonePtwTemplateRecord(sourceTenantId);
    if (clonedPtwTemplate) {
      ptwFormTemplateStore.set(nextTenantId, clonedPtwTemplate);
    }
    workflowStore.set(nextTenantId, cloneWorkflowRecords(sourceTenantId, nextTenantId));
    roleStore.set(nextTenantId, cloneRoleRecords(sourceTenantId, nextTenantId));
    dataStore.set(nextTenantId, cloneDataRecords(sourceTenantId, nextTenantId));

    const sourceTheme = tenantThemes.get(sourceTenantId);
    if (sourceTheme) {
      tenantThemes.set(nextTenantId, JSON.parse(JSON.stringify(sourceTheme)));
    }

    tenantDirectory.push(clonedTenant);

    res.status(201).json({
      ...clonedTenant,
      sourceTenantId,
      cloned: {
        forms: (formTemplatesStore.get(nextTenantId) || []).length,
        ptwTemplate: ptwFormTemplateStore.has(nextTenantId) ? 1 : 0,
        workflows: (workflowStore.get(nextTenantId) || []).length,
        roles: (roleStore.get(nextTenantId) || []).length,
        dataDomains: (dataStore.get(nextTenantId) || []).length,
      },
      excluded: ['tenant_user_assignments', 'task_submissions', 'feedback', 'audit_events'],
    });
  });

  app.get('/api/v1/forms/templates/:templateId', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const scopedTenantId = resolveRequestedTenantScope(req);
    if (!scopedTenantId || scopedTenantId === 'platform') return res.status(403).json({ error: 'Invalid tenant scope' });
    if (!tenantDirectory.some((tenant) => tenant.id === scopedTenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    ensureSeedData(scopedTenantId);

    const templateId = decodeURIComponent(req.params.templateId || '').trim();
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    if (templateId === 'ptw-example' || templateId === 'new' || templateId === 'demo') {
      const ptw = ptwFormTemplateStore.get(scopedTenantId);
      return res.json({
        id: 'ptw-example',
        tenantId: scopedTenantId,
        template: ptw?.template || null,
        updatedAt: ptw?.updatedAt || null,
      });
    }

    const forms = formTemplatesStore.get(scopedTenantId) || [];
    const form = forms.find((item) => item.id === templateId);
    if (!form) return res.status(404).json({ error: 'Form template not found' });

    const versions = getFormVersions(scopedTenantId, templateId);
    const latestPublished = getLatestPublishedVersion(versions);
    if (!latestPublished) return res.status(404).json({ error: 'No published form version found' });

    const effectiveRole = req.actingAs?.actingAsRole || req.actingAs?.role || req.user?.role;
    if (effectiveRole === 'user' && latestPublished.status !== 'published') {
      return res.status(403).json({ error: 'This form is not published' });
    }

    return res.json({
      id: templateId,
      tenantId: scopedTenantId,
      template: latestPublished.schema,
      versionNumber: latestPublished.versionNumber,
      updatedAt: latestPublished.publishedAt || form.updatedAt,
    });
  });

  app.get('/api/v1/forms/data-library', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const scopedTenantId = resolveRequestedTenantScope(req);
    if (!scopedTenantId || scopedTenantId === 'platform') return res.status(403).json({ error: 'Invalid tenant scope' });
    if (!tenantDirectory.some((tenant) => tenant.id === scopedTenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    ensureSeedData(scopedTenantId);
    return res.json(dataStore.get(scopedTenantId) || []);
  });

  app.post('/api/v1/forms/templates/:templateId/submissions/start', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const scopedTenantId = resolveRequestedTenantScope(req);
    if (!scopedTenantId || scopedTenantId === 'platform') return res.status(403).json({ error: 'Invalid tenant scope' });
    if (!tenantDirectory.some((tenant) => tenant.id === scopedTenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    ensureSeedData(scopedTenantId);

    const templateId = decodeURIComponent(req.params.templateId || '').trim();
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const form = (formTemplatesStore.get(scopedTenantId) || []).find((item) => item.id === templateId);
    if (!form) return res.status(404).json({ error: 'Form template not found' });

    const latestPublished = getLatestPublishedVersion(getFormVersions(scopedTenantId, templateId));
    if (!latestPublished) return res.status(404).json({ error: 'No published form version found' });

    const list = formSubmissionStore.get(scopedTenantId) || [];
    const now = new Date().toISOString();
    const record: FormSubmissionRecord = {
      id: `SUB-${Date.now()}`,
      tenantId: scopedTenantId,
      formId: templateId,
      versionNumber: latestPublished.versionNumber,
      status: 'in_progress',
      createdBy: req.actingAs?.actingAsUserId || req.user.id,
      createdAt: now,
      updatedAt: now,
    };
    list.push(record);
    formSubmissionStore.set(scopedTenantId, list);

    return res.status(201).json(record);
  });

  app.use('/api/v1/tenant-admin', (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!canManageTenantAdminResources(req)) return res.status(403).json({ error: 'Insufficient permissions' });
    const scopedTenantId = resolveRequestedTenantScope(req);
    if (!scopedTenantId || scopedTenantId === 'platform') return res.status(403).json({ error: 'Invalid tenant scope' });

    if (!tenantDirectory.some((tenant) => tenant.id === scopedTenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (req.actingAs) {
      req.actingAs = { ...req.actingAs, actingAsTenantId: scopedTenantId };
    } else {
      req.actingAs = { actingAsTenantId: scopedTenantId, actingAsRole: req.user.role };
    }

    ensureSeedData(scopedTenantId);
    next();
  });

  app.get('/api/v1/forms/ptw-template', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const scopedTenantId = resolveRequestedTenantScope(req);
    if (!scopedTenantId || scopedTenantId === 'platform') return res.status(403).json({ error: 'Invalid tenant scope' });
    if (!tenantDirectory.some((tenant) => tenant.id === scopedTenantId)) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const record = ptwFormTemplateStore.get(scopedTenantId);
    res.json({
      tenantId: scopedTenantId,
      template: record?.template || null,
      updatedAt: record?.updatedAt || null,
    });
  });

  app.get('/api/v1/tenant-admin/form-templates', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const enriched = list.map((item) => {
      const versions = getFormVersions(tenantId, item.id);
      const latestPublished = getLatestPublishedVersion(versions);
      const latestDraft = getLatestDraftVersion(versions);
      return {
        ...item,
        activeVersionNumber: latestPublished?.versionNumber || null,
        draftVersionNumber: latestDraft?.versionNumber || null,
      };
    });
    res.json(enriched);
  });

  app.post('/api/v1/tenant-admin/form-templates', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const requestedStatus = req.body.status;
    const status: FormTemplateRecord['status'] =
      requestedStatus === 'published' || requestedStatus === 'archived' ? requestedStatus : 'draft';

    const item: FormTemplateRecord = {
      id: `F-${Date.now()}`,
      tenantId,
      name: req.body.name || 'New Form',
      sections: Number(req.body.sections || 1),
      conditionalRules: Number(req.body.conditionalRules || 0),
      status,
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    formTemplatesStore.set(tenantId, list);

    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    schemaMap[item.id] = {
      key: item.name.toLowerCase().replace(/\s+/g, '_'),
      name: item.name,
      description: `${item.name} editable schema`,
      sections: [
        {
          key: 'section_1',
          label: 'Section 1',
          order: 1,
          fields: [{ key: 'field_1', label: 'Field 1', type: 'text', required: true }],
        },
      ],
    };
    formTemplateSchemaStore.set(tenantId, schemaMap);

    const now = new Date().toISOString();
    const versions: FormVersionRecord[] = [
      {
        formId: item.id,
        versionNumber: 1,
        status: item.status,
        schema: JSON.parse(JSON.stringify(schemaMap[item.id])),
        publishedBy: item.status === 'published' ? (req.actingAs?.actingAsUserId || req.user.id) : null,
        publishedAt: item.status === 'published' ? now : null,
        createdAt: now,
      },
    ];
    saveFormVersions(tenantId, item.id, versions);

    writeAudit(req, 'CREATE', 'form_template', item.id, null, item);
    res.status(201).json(item);
  });

  app.put('/api/v1/tenant-admin/form-templates/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });

    const formId = req.params.id;
    let versions = getFormVersions(tenantId, formId);
    const current = list[idx];

    if (req.body.name) {
      const nextName = String(req.body.name);
      list[idx] = { ...list[idx], name: nextName };
      versions = versions.map((version) => ({
        ...version,
        schema: { ...version.schema, name: nextName },
      }));
      saveFormVersions(tenantId, formId, versions);
    }

    if (req.body.status === 'draft') {
      const latestDraft = getLatestDraftVersion(versions);
      if (!latestDraft) {
        const latestPublished = getLatestPublishedVersion(versions);
        if (latestPublished) {
          versions = [
            ...versions,
            {
              formId,
              versionNumber: getNextVersionNumber(versions),
              status: 'draft',
              schema: JSON.parse(JSON.stringify(latestPublished.schema)),
              publishedBy: null,
              publishedAt: null,
              createdAt: new Date().toISOString(),
            },
          ];
          saveFormVersions(tenantId, formId, versions);
        }
      }
    }

    if (req.body.status === 'published') {
      const latestDraft = getLatestDraftVersion(versions);
      if (latestDraft) {
        versions = versions.map((version) => {
          if (version.status === 'published') {
            return { ...version, status: 'archived' as const };
          }
          if (version.versionNumber === latestDraft.versionNumber) {
            return {
              ...version,
              status: 'published' as const,
              publishedBy: req.actingAs?.actingAsUserId || req.user.id,
              publishedAt: new Date().toISOString(),
            };
          }
          return version;
        });
        saveFormVersions(tenantId, formId, versions);
      }
    }

    if (req.body.status === 'archived') {
      versions = versions.map((version) => ({ ...version, status: 'archived' as const }));
      saveFormVersions(tenantId, formId, versions);
    }

    syncTemplateRecordFromVersions(tenantId, formId);
    const refreshed = (formTemplatesStore.get(tenantId) || []).find((item) => item.id === current.id) || current;
    list[idx] = { ...refreshed, updatedAt: new Date().toISOString() };
    formTemplatesStore.set(tenantId, list);
    res.json(list[idx]);
  });

  app.delete('/api/v1/tenant-admin/form-templates/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const deleted = list.find((item) => item.id === req.params.id);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    formTemplatesStore.set(tenantId, next);
    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    delete schemaMap[req.params.id];
    formTemplateSchemaStore.set(tenantId, schemaMap);
    const versionsMap = getVersionsByForm(tenantId);
    delete versionsMap[req.params.id];
    formVersionStore.set(tenantId, versionsMap);
    writeAudit(req, 'DELETE', 'form_template', req.params.id, deleted, null);
    res.json({ success: true });
  });

  app.post('/api/v1/tenant-admin/form-templates/:id/duplicate', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const item = list.find((entry) => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const duplicated = {
      ...item,
      id: `F-${Date.now()}`,
      name: `${item.name} (Copy)`,
      status: 'draft' as const,
      updatedAt: new Date().toISOString(),
    };
    list.push(duplicated);

    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    const sourceSchema = schemaMap[item.id];
    if (sourceSchema) {
      schemaMap[duplicated.id] = {
        ...JSON.parse(JSON.stringify(sourceSchema)),
        name: duplicated.name,
      };
      formTemplateSchemaStore.set(tenantId, schemaMap);

      saveFormVersions(tenantId, duplicated.id, [
        {
          formId: duplicated.id,
          versionNumber: 1,
          status: 'draft',
          schema: JSON.parse(JSON.stringify(schemaMap[duplicated.id])),
          publishedBy: null,
          publishedAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    res.status(201).json(duplicated);
  });

  app.post('/api/v1/tenant-admin/form-templates/bulk-upload', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = formTemplatesStore.get(tenantId) || [];
    const rows = parseCsv(req.body.csvText || '');
    const created: FormTemplateRecord[] = [];

    rows.forEach((row) => {
      const item: FormTemplateRecord = {
        id: `F-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        name: row.name || 'Uploaded Form',
        sections: Number(row.sections || 1),
        conditionalRules: Number(row.conditionalRules || 0),
        status: row.status === 'published' || row.status === 'archived' ? row.status : 'draft',
        updatedAt: new Date().toISOString(),
      };
      list.push(item);
      created.push(item);
    });

    formTemplatesStore.set(tenantId, list);

    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    created.forEach((item) => {
      schemaMap[item.id] = {
        key: item.name.toLowerCase().replace(/\s+/g, '_'),
        name: item.name,
        description: `${item.name} editable schema`,
        sections: [
          {
            key: 'section_1',
            label: 'Section 1',
            order: 1,
            fields: [{ key: 'field_1', label: 'Field 1', type: 'text', required: true }],
          },
        ],
      };

      saveFormVersions(tenantId, item.id, [
        {
          formId: item.id,
          versionNumber: 1,
          status: item.status,
          schema: JSON.parse(JSON.stringify(schemaMap[item.id])),
          publishedBy: item.status === 'published' ? (req.actingAs?.actingAsUserId || req.user.id) : null,
          publishedAt: item.status === 'published' ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        },
      ]);
    });
    formTemplateSchemaStore.set(tenantId, schemaMap);

    res.json({ imported: created.length, items: created });
  });

  app.get('/api/v1/tenant-admin/form-templates/:id/schema', (req, res) => {
    const tenantId = getTenantScope(req);
    const versions = getFormVersions(tenantId, req.params.id);
    const schemaVersion = getLatestDraftVersion(versions) || getLatestPublishedVersion(versions) || versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (!schemaVersion) return res.status(404).json({ error: 'Schema not found' });
    res.json({ id: req.params.id, template: schemaVersion.schema, versionNumber: schemaVersion.versionNumber, status: schemaVersion.status });
  });

  app.put('/api/v1/tenant-admin/form-templates/:id/schema', (req, res) => {
    const tenantId = getTenantScope(req);
    const template = req.body?.template;
    if (!template || !Array.isArray(template.sections)) {
      return res.status(400).json({ error: 'template with sections is required' });
    }

    const list = formTemplatesStore.get(tenantId) || [];
    const formRecord = list.find((item) => item.id === req.params.id);
    if (!formRecord) return res.status(404).json({ error: 'Form template not found' });

    const formId = req.params.id;
    let versions = getFormVersions(tenantId, formId);
    let draft = getLatestDraftVersion(versions);

    if (!draft) {
      const latestPublished = getLatestPublishedVersion(versions);
      if (latestPublished) {
        draft = {
          formId,
          versionNumber: getNextVersionNumber(versions),
          status: 'draft',
          schema: JSON.parse(JSON.stringify(latestPublished.schema)),
          publishedBy: null,
          publishedAt: null,
          createdAt: new Date().toISOString(),
        };
        versions = [...versions, draft];
      } else {
        draft = {
          formId,
          versionNumber: getNextVersionNumber(versions),
          status: 'draft',
          schema: {},
          publishedBy: null,
          publishedAt: null,
          createdAt: new Date().toISOString(),
        };
        versions = [...versions, draft];
      }
    }

    versions = versions.map((version) =>
      version.versionNumber === draft?.versionNumber
        ? {
            ...version,
            schema: template,
          }
        : version
    );

    saveFormVersions(tenantId, formId, versions);
    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    schemaMap[formId] = template;
    formTemplateSchemaStore.set(tenantId, schemaMap);
    syncTemplateRecordFromVersions(tenantId, formId);

    res.json({ id: formId, template, versionNumber: draft.versionNumber });
  });

  app.get('/api/v1/tenant-admin/form-templates/:id/versions', (req, res) => {
    const tenantId = getTenantScope(req);
    const versions = getFormVersions(tenantId, req.params.id)
      .slice()
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((version) => ({
        formId: version.formId,
        versionNumber: version.versionNumber,
        status: version.status,
        publishedBy: version.publishedBy,
        publishedAt: version.publishedAt,
        createdAt: version.createdAt,
      }));

    if (!versions.length) return res.status(404).json({ error: 'Form versions not found' });
    return res.json(versions);
  });

  app.get('/api/v1/tenant-admin/form-templates/:id/versions/:versionNumber', (req, res) => {
    const tenantId = getTenantScope(req);
    const versionNumber = Number(req.params.versionNumber);
    const version = getFormVersions(tenantId, req.params.id).find((entry) => entry.versionNumber === versionNumber);
    if (!version) return res.status(404).json({ error: 'Version not found' });
    return res.json(version);
  });

  app.post('/api/v1/tenant-admin/form-templates/:id/versions/draft-from-published', (req, res) => {
    const tenantId = getTenantScope(req);
    const formId = req.params.id;
    let versions = getFormVersions(tenantId, formId);
    if (!versions.length) return res.status(404).json({ error: 'Form versions not found' });

    const existingDraft = getLatestDraftVersion(versions);
    if (existingDraft) return res.status(200).json(existingDraft);

    const latestPublished = getLatestPublishedVersion(versions);
    if (!latestPublished) return res.status(400).json({ error: 'No published version to draft from' });

    const draft: FormVersionRecord = {
      formId,
      versionNumber: getNextVersionNumber(versions),
      status: 'draft',
      schema: JSON.parse(JSON.stringify(latestPublished.schema)),
      publishedBy: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
    };

    versions = [...versions, draft];
    saveFormVersions(tenantId, formId, versions);
    syncTemplateRecordFromVersions(tenantId, formId);
    return res.status(201).json(draft);
  });

  app.post('/api/v1/tenant-admin/form-templates/:id/versions/:versionNumber/publish', (req, res) => {
    const tenantId = getTenantScope(req);
    const formId = req.params.id;
    const versionNumber = Number(req.params.versionNumber);
    let versions = getFormVersions(tenantId, formId);
    const target = versions.find((entry) => entry.versionNumber === versionNumber);
    if (!target) return res.status(404).json({ error: 'Version not found' });

    versions = versions.map((version) => {
      if (version.versionNumber === versionNumber) {
        return {
          ...version,
          status: 'published' as const,
          publishedBy: req.actingAs?.actingAsUserId || req.user.id,
          publishedAt: new Date().toISOString(),
        };
      }
      if (version.status === 'published') {
        return { ...version, status: 'archived' as const };
      }
      if (version.status === 'draft' && version.versionNumber !== versionNumber) {
        return { ...version, status: 'archived' as const };
      }
      return version;
    });

    saveFormVersions(tenantId, formId, versions);
    const published = versions.find((entry) => entry.versionNumber === versionNumber)!;

    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    schemaMap[formId] = JSON.parse(JSON.stringify(published.schema));
    formTemplateSchemaStore.set(tenantId, schemaMap);
    syncTemplateRecordFromVersions(tenantId, formId);
    return res.json(published);
  });

  app.post('/api/v1/tenant-admin/form-templates/:id/versions/:versionNumber/rollback', (req, res) => {
    const tenantId = getTenantScope(req);
    const formId = req.params.id;
    const versionNumber = Number(req.params.versionNumber);
    let versions = getFormVersions(tenantId, formId);
    const source = versions.find((entry) => entry.versionNumber === versionNumber);
    if (!source) return res.status(404).json({ error: 'Version not found' });

    const nextVersion: FormVersionRecord = {
      formId,
      versionNumber: getNextVersionNumber(versions),
      status: 'published',
      schema: JSON.parse(JSON.stringify(source.schema)),
      publishedBy: req.actingAs?.actingAsUserId || req.user.id,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    versions = versions.map((version) =>
      version.status === 'published' ? { ...version, status: 'archived' as const } : version
    );
    versions.push(nextVersion);

    saveFormVersions(tenantId, formId, versions);
    const schemaMap = formTemplateSchemaStore.get(tenantId) || {};
    schemaMap[formId] = JSON.parse(JSON.stringify(nextVersion.schema));
    formTemplateSchemaStore.set(tenantId, schemaMap);
    syncTemplateRecordFromVersions(tenantId, formId);

    return res.status(201).json(nextVersion);
  });

  app.get('/api/v1/tenant-admin/ptw-form-template', (req, res) => {
    const tenantId = getTenantScope(req);
    const record = ptwFormTemplateStore.get(tenantId);
    res.json({
      tenantId,
      template: record?.template || null,
      updatedAt: record?.updatedAt || null,
    });
  });

  app.put('/api/v1/tenant-admin/ptw-form-template', (req, res) => {
    const tenantId = getTenantScope(req);
    const template = req.body?.template;

    if (!template || !Array.isArray(template.sections)) {
      return res.status(400).json({ error: 'template with sections is required' });
    }

    const record = {
      template,
      updatedAt: new Date().toISOString(),
    };

    ptwFormTemplateStore.set(tenantId, record);
    res.json({ tenantId, ...record });
  });

  // Workflow handlers (shared by /workflows and /workflow-templates routes)
  const handleGetWorkflows = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    res.json(workflowStore.get(tenantId) || []);
  };

  const handleCreateWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const item: WorkflowRecord = {
      id: `WF-${Date.now()}`,
      tenantId,
      name: sanitize(req.body.name) || 'New Workflow',
      linkedForm: sanitize(req.body.linkedForm) || 'Unlinked Form',
      steps: Number(req.body.steps || 1),
      sla: sanitize(req.body.sla) || '24h',
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    writeAudit(req, 'CREATE', 'workflow_template', item.id, null, item);
    res.status(201).json(item);
  };

  const handleUpdateWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };
    list[idx] = { ...list[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeAudit(req, 'UPDATE', 'workflow_template', req.params.id, before, list[idx]);
    res.json(list[idx]);
  };

  const handleDeleteWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const deleted = list.find((item) => item.id === req.params.id);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    workflowStore.set(tenantId, next);
    writeAudit(req, 'DELETE', 'workflow_template', req.params.id, deleted, null);
    res.json({ success: true });
  };

  const handleDuplicateWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const item = list.find((entry) => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const duplicated = {
      ...item,
      id: `WF-${Date.now()}`,
      name: `${item.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    list.push(duplicated);
    writeAudit(req, 'CREATE', 'workflow_template', duplicated.id, null, duplicated);
    res.status(201).json(duplicated);
  };

  const handlePublishWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };
    list[idx] = { ...list[idx], status: 'published', updatedAt: new Date().toISOString() };
    writeAudit(req, 'PUBLISH', 'workflow_template', req.params.id, before, list[idx]);
    res.json(list[idx]);
  };

  const handleArchiveWorkflow = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };
    list[idx] = { ...list[idx], status: 'archived', updatedAt: new Date().toISOString() };
    writeAudit(req, 'ARCHIVE', 'workflow_template', req.params.id, before, list[idx]);
    res.json(list[idx]);
  };

  const handleBulkUploadWorkflows = (req: Request, res: Response) => {
    const tenantId = getTenantScope(req);
    const list = workflowStore.get(tenantId) || [];
    const rows = parseCsv(req.body.csvText || '');
    const created: WorkflowRecord[] = [];

    rows.forEach((row) => {
      const item: WorkflowRecord = {
        id: `WF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        name: row.name || 'Uploaded Workflow',
        linkedForm: row.linkedForm || 'Unlinked Form',
        steps: Number(row.steps || 1),
        sla: row.sla || '24h',
        updatedAt: new Date().toISOString(),
      };
      list.push(item);
      created.push(item);
    });

    workflowStore.set(tenantId, list);
    res.json({ imported: created.length, items: created });
  };

  // Register /workflows routes
  app.get('/api/v1/tenant-admin/workflows', handleGetWorkflows);
  app.post('/api/v1/tenant-admin/workflows', handleCreateWorkflow);
  app.put('/api/v1/tenant-admin/workflows/:id', handleUpdateWorkflow);
  app.delete('/api/v1/tenant-admin/workflows/:id', handleDeleteWorkflow);
  app.post('/api/v1/tenant-admin/workflows/:id/duplicate', handleDuplicateWorkflow);
  app.post('/api/v1/tenant-admin/workflows/:id/publish', handlePublishWorkflow);
  app.post('/api/v1/tenant-admin/workflows/:id/archive', handleArchiveWorkflow);
  app.post('/api/v1/tenant-admin/workflows/bulk-upload', handleBulkUploadWorkflows);

  // Register /workflow-templates aliases (frontend uses this path)
  app.get('/api/v1/tenant-admin/workflow-templates', handleGetWorkflows);
  app.post('/api/v1/tenant-admin/workflow-templates', handleCreateWorkflow);
  app.put('/api/v1/tenant-admin/workflow-templates/:id', handleUpdateWorkflow);
  app.delete('/api/v1/tenant-admin/workflow-templates/:id', handleDeleteWorkflow);
  app.post('/api/v1/tenant-admin/workflow-templates/:id/duplicate', handleDuplicateWorkflow);
  app.post('/api/v1/tenant-admin/workflow-templates/:id/publish', handlePublishWorkflow);
  app.post('/api/v1/tenant-admin/workflow-templates/:id/archive', handleArchiveWorkflow);
  app.post('/api/v1/tenant-admin/workflow-templates/bulk-upload', handleBulkUploadWorkflows);

  app.get('/api/v1/tenant-admin/roles', (req, res) => {
    const tenantId = getTenantScope(req);
    res.json(roleStore.get(tenantId) || []);
  });

  app.post('/api/v1/tenant-admin/roles', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = roleStore.get(tenantId) || [];
    const item: RoleRecord = {
      id: `R-${Date.now()}`,
      tenantId,
      name: req.body.name || 'New Role',
      users: Number(req.body.users || 0),
      modules: req.body.modules || 'Unassigned',
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    writeAudit(req, 'CREATE', 'role', item.id, null, item);
    res.status(201).json(item);
  });

  app.put('/api/v1/tenant-admin/roles/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = roleStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };
    list[idx] = { ...list[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeAudit(req, 'UPDATE', 'role', req.params.id, before, list[idx]);
    res.json(list[idx]);
  });

  app.delete('/api/v1/tenant-admin/roles/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = roleStore.get(tenantId) || [];
    const deleted = list.find((item) => item.id === req.params.id);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    roleStore.set(tenantId, next);
    writeAudit(req, 'DELETE', 'role', req.params.id, deleted, null);
    res.json({ success: true });
  });

  app.post('/api/v1/tenant-admin/roles/:id/duplicate', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = roleStore.get(tenantId) || [];
    const item = list.find((entry) => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const duplicated = {
      ...item,
      id: `R-${Date.now()}`,
      name: `${item.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    list.push(duplicated);
    writeAudit(req, 'CREATE', 'role', duplicated.id, null, duplicated);
    res.status(201).json(duplicated);
  });

  app.post('/api/v1/tenant-admin/roles/bulk-upload', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = roleStore.get(tenantId) || [];
    const rows = parseCsv(req.body.csvText || '');
    const created: RoleRecord[] = [];

    rows.forEach((row) => {
      const item: RoleRecord = {
        id: `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        name: row.name || 'Uploaded Role',
        users: Number(row.users || 0),
        modules: row.modules || 'Unassigned',
        updatedAt: new Date().toISOString(),
      };
      list.push(item);
      created.push(item);
    });

    roleStore.set(tenantId, list);
    res.json({ imported: created.length, items: created });
  });

  app.get('/api/v1/tenant-admin/data', (req, res) => {
    const tenantId = getTenantScope(req);
    const scope = String(req.query.scope || 'org') as 'org' | 'module';
    const list = dataStore.get(tenantId) || [];
    res.json(list.filter((row) => row.scope === scope));
  });

  app.post('/api/v1/tenant-admin/data', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = dataStore.get(tenantId) || [];
    const scope = req.body.scope === 'module' ? 'module' : 'org';
    const item: DataRecord = {
      id: `D-${Date.now()}`,
      tenantId,
      scope,
      type: req.body.type,
      module: req.body.module,
      entity: req.body.entity,
      value: req.body.value || 'New Value',
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    writeAudit(req, 'CREATE', 'data_library', item.id, null, item);
    res.status(201).json(item);
  });

  app.put('/api/v1/tenant-admin/data/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = dataStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };
    list[idx] = { ...list[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeAudit(req, 'UPDATE', 'data_library', req.params.id, before, list[idx]);
    res.json(list[idx]);
  });

  app.delete('/api/v1/tenant-admin/data/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = dataStore.get(tenantId) || [];
    const deleted = list.find((item) => item.id === req.params.id);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    dataStore.set(tenantId, next);
    writeAudit(req, 'DELETE', 'data_library', req.params.id, deleted, null);
    res.json({ success: true });
  });

  app.post('/api/v1/tenant-admin/data/:id/duplicate', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = dataStore.get(tenantId) || [];
    const item = list.find((entry) => entry.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const duplicated = {
      ...item,
      id: `D-${Date.now()}`,
      value: `${item.value} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    list.push(duplicated);
    writeAudit(req, 'CREATE', 'data_library', duplicated.id, null, duplicated);
    res.status(201).json(duplicated);
  });

  app.post('/api/v1/tenant-admin/data/bulk-upload', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = dataStore.get(tenantId) || [];
    const scope = req.body.scope === 'module' ? 'module' : 'org';
    const rows = parseCsv(req.body.csvText || '');
    const created: DataRecord[] = [];

    rows.forEach((row) => {
      const item: DataRecord = {
        id: `D-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        scope,
        type: row.type,
        module: row.module,
        entity: row.entity,
        value: row.value || 'Uploaded Value',
        updatedAt: new Date().toISOString(),
      };
      list.push(item);
      created.push(item);
    });

    dataStore.set(tenantId, list);
    res.json({ imported: created.length, items: created });
  });

  app.get('/api/v1/tenant-admin/user-management', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];

    const filters = {
      name: String(req.query.name || '').toLowerCase(),
      email: String(req.query.email || '').toLowerCase(),
      division: String(req.query.division || ''),
      role: String(req.query.role || ''),
      companyDepartment: String(req.query.companyDepartment || ''),
      status: String(req.query.status || ''),
      asset: String(req.query.asset || ''),
      site: String(req.query.site || ''),
    };

    const filtered = list.filter((user) => {
      if (filters.name && !user.name.toLowerCase().includes(filters.name)) return false;
      if (filters.email && !user.email.toLowerCase().includes(filters.email)) return false;
      if (filters.division && user.division !== filters.division) return false;
      if (filters.role && user.role !== filters.role) return false;
      if (filters.companyDepartment && user.companyDepartment !== filters.companyDepartment) return false;
      if (filters.status && user.status !== filters.status) return false;
      if (filters.asset && !user.assets.includes(filters.asset)) return false;
      if (filters.site && !user.sites.includes(filters.site)) return false;
      return true;
    });

    res.json(filtered);
  });

  app.get('/api/v1/tenant-admin/user-management/options', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];

    const uniq = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

    res.json({
      roles: uniq(list.map((entry) => entry.role)),
      divisions: uniq(list.map((entry) => entry.division)),
      departments: uniq(list.map((entry) => entry.companyDepartment)),
      assets: uniq(list.flatMap((entry) => entry.assets)),
      sites: uniq(list.flatMap((entry) => entry.sites)),
      statuses: ['Active', 'Inactive', 'Pending'],
    });
  });

  app.post('/api/v1/tenant-admin/user-management', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];

    const toArray = (value: unknown) => {
      if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
      if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
      return [];
    };

    const item: TenantUserAssignmentRecord = {
      id: `TU-${Date.now()}`,
      tenantId,
      name: String(req.body.name || 'New User').trim(),
      email: String(req.body.email || '').trim(),
      division: String(req.body.division || 'Operations').trim(),
      role: String(req.body.role || 'User').trim(),
      companyDepartment: String(req.body.companyDepartment || 'General').trim(),
      status: req.body.status === 'Inactive' || req.body.status === 'Pending' ? req.body.status : 'Active',
      assets: toArray(req.body.assets),
      sites: toArray(req.body.sites),
      remark: String(req.body.remark || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    list.push(item);
    tenantUserStore.set(tenantId, list);
    writeAudit(req, 'CREATE', 'tenant_user', item.id, null, item);
    res.status(201).json(item);
  });

  app.put('/api/v1/tenant-admin/user-management/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };

    const toArray = (value: unknown) => {
      if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
      if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
      return [];
    };

    list[idx] = {
      ...list[idx],
      ...req.body,
      assets: req.body.assets !== undefined ? toArray(req.body.assets) : list[idx].assets,
      sites: req.body.sites !== undefined ? toArray(req.body.sites) : list[idx].sites,
      updatedAt: new Date().toISOString(),
    };

    tenantUserStore.set(tenantId, list);
    writeAudit(req, 'UPDATE', 'tenant_user', req.params.id, before, list[idx]);
    res.json(list[idx]);
  });

  app.post('/api/v1/tenant-admin/user-management/:id/deactivate', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];
    const idx = list.findIndex((item) => item.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const before = { ...list[idx] };

    list[idx] = {
      ...list[idx],
      status: 'Inactive',
      updatedAt: new Date().toISOString(),
    };

    tenantUserStore.set(tenantId, list);
    writeAudit(req, 'DEACTIVATE', 'tenant_user', req.params.id, before, list[idx]);
    res.json(list[idx]);
  });

  app.delete('/api/v1/tenant-admin/user-management/:id', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];
    const deleted = list.find((item) => item.id === req.params.id);
    const next = list.filter((item) => item.id !== req.params.id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    tenantUserStore.set(tenantId, next);
    writeAudit(req, 'DELETE', 'tenant_user', req.params.id, deleted, null);
    res.json({ success: true });
  });

  app.post('/api/v1/tenant-admin/user-management/bulk-upload', (req, res) => {
    const tenantId = getTenantScope(req);
    const list = tenantUserStore.get(tenantId) || [];
    const rows = parseCsv(req.body.csvText || '');
    const created: TenantUserAssignmentRecord[] = [];

    const toArray = (value: unknown) => {
      if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
      if (typeof value === 'string') return value.split('|').map((item) => item.trim()).filter(Boolean);
      return [];
    };

    rows.forEach((row) => {
      const item: TenantUserAssignmentRecord = {
        id: `TU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        name: String(row.name || 'Uploaded User').trim(),
        email: String(row.email || '').trim(),
        division: String(row.division || 'Operations').trim(),
        role: String(row.role || 'User').trim(),
        companyDepartment: String(row.companyDepartment || 'General').trim(),
        status: row.status === 'Inactive' || row.status === 'Pending' ? row.status : 'Active',
        assets: toArray(row.assets),
        sites: toArray(row.sites),
        remark: String(row.remark || '').trim(),
        updatedAt: new Date().toISOString(),
      };
      list.push(item);
      created.push(item);
    });

    tenantUserStore.set(tenantId, list);
    res.json({ imported: created.length, items: created });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
