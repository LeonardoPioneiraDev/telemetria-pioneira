import type { TimeRange } from './metrics';

// ============================================================================
// Ranking Types
// ============================================================================

export type SortByField = 'lastLogin' | 'totalLogins' | 'totalPageViews' | 'sessionTime' | 'activeDays';
export type SortOrder = 'asc' | 'desc';

export interface UserActivityRankingFilters {
  timeRange: TimeRange;
  role?: string;
  search?: string;
  sortBy: SortByField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

export interface UserActivityRankingItem {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  totalLogins: number;
  uniquePagesVisited: number;
  totalPageViews: number;
  totalSessionTimeMinutes: number;
  activeDays: number;
  avgSessionMinutes: number;
}

export interface UserActivityRankingResponse {
  users: UserActivityRankingItem[];
  totalUsers: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================================
// User Detail Types
// ============================================================================

export interface UserDetailInfo {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface UserDetailActivity {
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastActivityAt: string | null;
  totalLogins: number;
  uniquePagesVisited: number;
  totalPageViews: number;
  totalSessionTimeMinutes: number;
  activeDays: number;
  avgSessionMinutes: number;
}

export interface UserTopPage {
  pagePath: string;
  pageTitle: string | null;
  viewCount: number;
  totalTimeMinutes: number;
  lastVisited: string;
}

export interface UserLoginHistory {
  loginAt: string;
  logoutAt: string | null;
  sessionDurationMinutes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string;
  os: string;
  browser: string;
}

export interface UserActivityOverTime {
  date: string;
  logins: number;
  pageViews: number;
  sessionMinutes: number;
  [key: string]: string | number; // For Recharts compatibility
}

export interface UserActivityDetailResponse {
  user: UserDetailInfo;
  activity: UserDetailActivity;
  topPages: UserTopPage[];
  recentLogins: UserLoginHistory[];
  activityOverTime: UserActivityOverTime[];
}

// ============================================================================
// Page View Request
// ============================================================================

export interface PageViewRequest {
  pagePath: string;
  pageTitle?: string | null;
  sessionId?: string | null;
  referrerPath?: string | null;
}

export interface PageViewResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================================================
// Sort Options for UI
// ============================================================================

export const SORT_BY_OPTIONS: { value: SortByField; label: string }[] = [
  { value: 'lastLogin', label: 'Último Login' },
  { value: 'totalLogins', label: 'Total de Logins' },
  { value: 'totalPageViews', label: 'Páginas Visitadas' },
  { value: 'sessionTime', label: 'Tempo de Sessão' },
  { value: 'activeDays', label: 'Dias Ativos' },
];

// ============================================================================
// Page Title Map
// ============================================================================

export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/viagens': 'Viagens',
  '/relatorios': 'Relatórios',
  '/motoristas': 'Motoristas',
  '/veiculos': 'Veículos',
  '/eventos': 'Eventos',
  '/admin/users': 'Usuários',
  '/admin/metrics': 'Métricas do Sistema',
  '/admin/user-activity': 'Atividade de Usuários',
  '/admin/etl': 'ETL',
  '/admin/changelog': 'Changelog',
  '/perfil': 'Perfil',
  '/configuracoes': 'Configurações',
};

export function getPageTitle(path: string): string {
  // Try exact match first
  if (PAGE_TITLES[path]) {
    return PAGE_TITLES[path];
  }

  // Try to find a matching prefix
  for (const [pattern, title] of Object.entries(PAGE_TITLES)) {
    if (path.startsWith(pattern)) {
      return title;
    }
  }

  // Default: capitalize the last segment of the path
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'Página';
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
}
