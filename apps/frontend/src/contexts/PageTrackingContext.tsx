'use client';

import { userActivityService } from '@/services/user-activity.service';
import { getPageTitle } from '@/types/user-activity';
import { usePathname } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

interface PageTrackingContextType {
  trackPageView: (pagePath: string, pageTitle?: string) => void;
}

const PageTrackingContext = createContext<PageTrackingContextType | undefined>(undefined);

/**
 * Gera um ID de sessão único para a aba do browser
 * Persiste no sessionStorage (cada aba tem um ID diferente)
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('pageTrackingSessionId');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('pageTrackingSessionId', sessionId);
  }
  return sessionId;
}

/**
 * Paths que não devem ser rastreados
 */
const EXCLUDED_PATHS = [
  '/login',
  '/logout',
  '/first-login',
  '/esqueci-senha',
  '/reset-password',
  '/',
];

function shouldTrackPath(path: string): boolean {
  return !EXCLUDED_PATHS.some(excluded => path === excluded || path.startsWith(excluded + '/'));
}

export function PageTrackingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const isTrackingRef = useRef(false);

  const trackPageView = useCallback(
    (pagePath: string, pageTitle?: string) => {
      if (!isAuthenticated || !user) return;
      if (!shouldTrackPath(pagePath)) return;

      // Fire-and-forget - não espera resposta
      userActivityService.logPageView({
        pagePath,
        pageTitle: pageTitle || getPageTitle(pagePath),
        sessionId: getSessionId(),
        referrerPath: previousPathRef.current,
      });
    },
    [isAuthenticated, user]
  );

  useEffect(() => {
    // Skip if not authenticated or no user
    if (!isAuthenticated || !user) return;

    // Skip if same path (avoid duplicate tracking)
    if (pathname === previousPathRef.current) return;

    // Skip excluded paths
    if (!shouldTrackPath(pathname)) {
      previousPathRef.current = pathname;
      return;
    }

    // Prevent concurrent tracking
    if (isTrackingRef.current) return;
    isTrackingRef.current = true;

    // Track the page view
    const pageTitle = getPageTitle(pathname);
    trackPageView(pathname, pageTitle);

    // Update previous path
    previousPathRef.current = pathname;

    // Reset tracking flag after a short delay
    setTimeout(() => {
      isTrackingRef.current = false;
    }, 100);
  }, [pathname, isAuthenticated, user, trackPageView]);

  return (
    <PageTrackingContext.Provider value={{ trackPageView }}>
      {children}
    </PageTrackingContext.Provider>
  );
}

export function usePageTracking() {
  const context = useContext(PageTrackingContext);
  if (context === undefined) {
    throw new Error('usePageTracking must be used within a PageTrackingProvider');
  }
  return context;
}
