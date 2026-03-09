import express, { Request } from "express";
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

// Mock storage
const feedbackStorage: any[] = [];
const auditEvents: any[] = [];
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
  app.post("/api/auth/login", (req, res) => {
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

  app.get("/api/me", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      user: req.user,
      actingAs: req.actingAs || req.user,
      isImpersonating: !!req.actingAs?.isImpersonating
    });
  });

  // Role Switch (Tenant Admin only)
  app.post("/api/auth/switch-role", (req, res) => {
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
  app.get("/api/catalog", (req, res) => {
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
  app.get("/api/tenants", (req, res) => {
    const tenants = [
      { id: "cpoc", name: "CPOC", status: "active", usersCount: 850, lastActivity: new Date().toISOString() },
      { id: "conocophillips", name: "ConocoPhilips", status: "active", usersCount: 1200, lastActivity: new Date(Date.now() - 3600000).toISOString() },
      { id: "xplora", name: "Xplora Malaysia", status: "active", usersCount: 450, lastActivity: new Date(Date.now() - 86400000).toISOString() },
      { id: "pcgpcc", name: "PCGPCC", status: "active", usersCount: 2100, lastActivity: new Date(Date.now() - 172800000).toISOString() }
    ].map(t => ({
      ...t,
      themeConfig: tenantThemes.get(t.id) || null
    }));
    res.json(tenants);
  });

  app.get("/api/tenants/:id", (req, res) => {
    const { id } = req.params;
    const tenants: any[] = [
      { id: "cpoc", name: "CPOC", status: "active", usersCount: 850, lastActivity: new Date().toISOString() },
      { id: "conocophillips", name: "ConocoPhilips", status: "active", usersCount: 1200, lastActivity: new Date(Date.now() - 3600000).toISOString() },
      { id: "xplora", name: "Xplora Malaysia", status: "active", usersCount: 450, lastActivity: new Date(Date.now() - 86400000).toISOString() },
      { id: "pcgpcc", name: "PCGPCC", status: "active", usersCount: 2100, lastActivity: new Date(Date.now() - 172800000).toISOString() }
    ];
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json({
      ...tenant,
      themeConfig: tenantThemes.get(id) || null
    });
  });

  app.post("/api/tenants/:id/theme", (req, res) => {
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
  app.get("/api/system/config", (req, res) => {
    res.json(systemConfig);
  });

  app.post("/api/system/config", (req, res) => {
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only Super Admins can update system config" });
    }
    systemConfig = { ...systemConfig, ...req.body };
    res.json(systemConfig);
  });

  // Resolved Theme
  app.get("/api/theme/resolved", (req, res) => {
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

  app.post("/api/tenants/duplicate", (req, res) => {
    const { sourceTenantId, categories, overrides } = req.body;
    // Logic for duplication
    res.json({ id: "new-tenant-id", ...overrides });
  });

  // Feedback API
  app.post("/api/feedback", (req, res) => {
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

    // Audit event
    auditEvents.push({
      id: `audit-${now}`,
      type: 'FEEDBACK_SUBMITTED',
      realUserId: req.user.id,
      realUserRole: req.user.role,
      realUserIsPlatform: req.user.role === 'super_admin' || req.user.role === 'support',
      actingAsUserId: feedback.actingAsUserId || req.user.id,
      actingAsTenantId: feedback.tenantId,
      impersonationSessionId: req.actingAs?.impersonationSessionId || null,
      details: { feedbackId: feedback.id, type },
      timestamp: feedback.createdAt
    });

    res.status(201).json({ success: true, id: feedback.id });
  });

  // Users
  app.get("/api/users", (req, res) => {
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
  app.get("/api/templates", (req, res) => {
    res.json([]);
  });

  // Impersonation
  app.post("/api/impersonation/start", (req, res) => {
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

    // Audit event
    const impersonationSessionId = `imp-${Date.now()}`;
    auditEvents.push({
      id: `audit-${Date.now()}`,
      type: 'IMPERSONATION_START',
      realUserId: req.user.id,
      realUserRole: req.user.role,
      realUserIsPlatform: isPlatform,
      actingAsUserId: targetUser.id,
      actingAsTenantId: targetUser.tenantId,
      impersonationSessionId: impersonationSessionId,
      details: { targetUserId, tenantId },
      timestamp: new Date().toISOString()
    });

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

  app.post("/api/impersonation/stop", (req, res) => {
    if (req.actingAs) {
      auditEvents.push({
        id: `audit-${Date.now()}`,
        type: 'IMPERSONATION_STOP',
        realUserId: req.actingAs.realUserId,
        realUserRole: req.actingAs.realUserRole,
        realUserIsPlatform: req.actingAs.realUserIsPlatform,
        actingAsUserId: req.actingAs.actingAsUserId,
        actingAsTenantId: req.actingAs.actingAsTenantId,
        impersonationSessionId: req.actingAs.impersonationSessionId,
        timestamp: new Date().toISOString()
      });
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

  app.get("/api/tasks", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    
    // Filter by assigned user (strictly personal)
    const userTasks = mockTasks.filter(t => t.assignedTo === userId);
    res.json(userTasks);
  });

  app.get("/api/tasks/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const key = `${tenantId}:${userId}`;
    const layout = taskDashboardLayouts.get(key);
    res.json(layout || { layoutJson: null });
  });

  app.post("/api/tasks/dashboard/layout", (req, res) => {
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

  app.get("/api/dashboard/layout", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const tenantId = req.actingAs?.actingAsTenantId || req.user.tenantId;
    const userId = req.actingAs?.actingAsUserId || req.user.id;
    const key = `${tenantId}:${userId}`;
    const layout = dashboardLayouts.get(key);
    res.json(layout || { layoutJson: null });
  });

  app.post("/api/dashboard/layout", (req, res) => {
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
