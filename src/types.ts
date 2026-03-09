export interface ThemeConfig {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  defaultMode: 'light' | 'dark' | 'system';
  allowUserModeToggle: boolean;
  layoutColors?: {
    header?: string;
    leftPanel?: string;
    mainPage?: string;
    font?: string;
  };
  graphColors?: string[];
}

export interface SystemConfig {
  theme: ThemeConfig;
}

export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'draft';
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  themeConfig?: ThemeConfig;
  usersCount?: number;
  lastActivity?: string;
}

export interface User {
  id: string;
  tenantId: string | null;
  email: string;
  displayName: string;
  role: 'super_admin' | 'support' | 'tenant_admin' | 'user' | 'support_focal';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  module: string;
  assignedTo: string;
  createdAt: string;
}

export interface UserDashboardLayout {
  tenantId: string;
  userId: string;
  layoutJson: string;
  updatedAt: string;
}

export interface CatalogFeature {
  id: string;
  name: string;
  description?: string;
}

export interface CatalogModule {
  id: string;
  name: string;
  description?: string;
  features: CatalogFeature[];
}

export interface CatalogDomain {
  id: string;
  name: string;
  modules: CatalogModule[];
}

export interface Template {
  id: string;
  tenantId: string;
  featureId: string;
  name: string;
  version: number;
  status: 'draft' | 'published' | 'retired';
  definition: any;
}

export interface FeedbackSubmission {
  id?: string;
  tenantId: string | null;
  userId: string;
  actingAsUserId?: string | null;
  pageUrl: string;
  routeName: string;
  type: 'CSAT' | 'NPS' | 'TEXT';
  score?: number | null;
  category?: 'Bug' | 'Feature Request' | 'UX' | 'Performance' | 'Other' | null;
  message?: string;
  createdAt: string;
  appVersion: string;
  clientMeta: {
    userAgent: string;
    viewport: { width: number; height: number };
    locale: string;
  };
}
