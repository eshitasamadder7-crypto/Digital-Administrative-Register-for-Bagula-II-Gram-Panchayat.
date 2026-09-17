import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Routes that should NEVER be redirected to on "Back" navigation
 * to avoid auth loops, accidental signouts, or unauthorized/confusing redirects.
 */
const PROHIBITED_EXACT_ROUTES = new Set([
  "/admin", // Admin / Official login screen
  "/admin/login",
  "/public/login", // Citizen login screen
  "/public/register", // Citizen registration screen
  "/.lovable/oauth/consent",
  "/login",
  "/auth",
  "/logout",
  "/signout",
]);

/**
 * Inspect whether a candidate path is a prohibited redirect
 * relative to the current active environment.
 */
export function isProhibitedRedirect(candidatePath: string, currentPath: string): boolean {
  if (!candidatePath) return true;

  // Clean candidate from query parameters for route checks
  const [candidateBase] = candidatePath.split("?");
  const [currentBase] = currentPath.split("?");

  // Cannot go back to the exact same base path with same query
  if (candidatePath === currentPath) return true;

  // Never redirect back to authentication or login screens
  if (PROHIBITED_EXACT_ROUTES.has(candidateBase.toLowerCase())) {
    return true;
  }

  // Avoid redirecting to /dar unless the user is already inside the DAR workflow (Section 24)
  if (candidateBase === "/dar" || candidateBase.startsWith("/dar/")) {
    if (!currentBase.startsWith("/dar")) {
      return true;
    }
  }

  // Shell separation: Citizen environment (/public/*) must not bounce to Admin (/admin/*)
  if (currentBase.startsWith("/public") && candidateBase.startsWith("/admin")) {
    return true;
  }

  // Shell separation: Official environment (/admin/* or cert forms) must not bounce to Citizen private area
  const isOfficialCurrent =
    currentBase.startsWith("/admin") ||
    currentBase === "/warish-certificate" ||
    currentBase === "/dependent-certificate";

  const isCitizenPrivate =
    candidateBase.startsWith("/public/dashboard") ||
    candidateBase.startsWith("/public/profile") ||
    candidateBase.startsWith("/public/apply");

  if (isOfficialCurrent && isCitizenPrivate) {
    return true;
  }

  return false;
}

/**
 * Determine the safe, logical fallback URL for the current pathname
 * according to environment and shell separation rules.
 */
export function getSafeFallbackUrl(pathname: string, userRoles?: string[]): string {
  const [base] = pathname.split("?");

  // Citizen private space -> Citizen Dashboard
  if (base.startsWith("/public/dashboard") || base.startsWith("/public/profile") || base.startsWith("/public/apply")) {
    return "/public/dashboard";
  }

  // DEO workspace -> DEO Dashboard
  if (base.startsWith("/admin/deo")) {
    return "/admin/deo";
  }

  // Warish / Dependent lists or forms
  if (base === "/admin/warish" || base === "/admin/dependent" || base === "/warish-certificate" || base === "/dependent-certificate") {
    // If DEO without admin role, prefer /admin/deo
    if (userRoles?.includes("deo") && !userRoles?.includes("admin") && !userRoles?.includes("super_admin")) {
      return "/admin/deo";
    }
    return "/admin/dashboard";
  }

  // Admin / Super Admin workspace -> Admin Dashboard
  if (base.startsWith("/admin")) {
    return "/admin/dashboard";
  }

  // Public tools and info pages -> Public Home
  return "/";
}

/**
 * Check if the given route is a root or primary landing dashboard.
 */
export function isRootRoute(pathname: string): boolean {
  const [base] = pathname.split("?");
  return (
    base === "/" ||
    base === "/public" ||
    base === "/public/dashboard" ||
    base === "/admin/dashboard" ||
    base === "/admin/deo"
  );
}

const STORAGE_KEY = "bgl2_internal_nav_history";
const MAX_HISTORY_LENGTH = 40;

interface NavigationHistoryContextType {
  historyStack: string[];
  pushRoute: (path: string) => void;
  popRoute: () => string | null;
  getSafePreviousPath: (currentPath: string, isAllowed?: (p: string) => boolean) => string | null;
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType | null>(null);

function loadStoredHistory(): string[] {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // Ignore sessionStorage restrictions or errors
  }
  return [];
}

function saveStoredHistory(stack: string[]) {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_HISTORY_LENGTH)));
    }
  } catch {
    // Ignore
  }
}

/**
 * NavigationHistoryProvider mounts inside BrowserRouter to observe and track
 * internal route transitions while filtering out prohibited and redundant paths.
 */
export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [historyStack, setHistoryStack] = useState<string[]>(() => loadStoredHistory());
  const initialMount = useRef(true);

  // Track location changes
  useEffect(() => {
    const fullPath = location.pathname + location.search;

    setHistoryStack((prev) => {
      // Avoid duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1] === fullPath) {
        return prev;
      }

      const next = [...prev, fullPath].slice(-MAX_HISTORY_LENGTH);
      saveStoredHistory(next);
      return next;
    });

    initialMount.current = false;
  }, [location.pathname, location.search]);

  const pushRoute = useCallback((path: string) => {
    setHistoryStack((prev) => {
      const next = [...prev, path].slice(-MAX_HISTORY_LENGTH);
      saveStoredHistory(next);
      return next;
    });
  }, []);

  const popRoute = useCallback((): string | null => {
    let popped: string | null = null;
    setHistoryStack((prev) => {
      if (prev.length <= 1) return prev;
      popped = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      saveStoredHistory(next);
      return next;
    });
    return popped;
  }, []);

  const getSafePreviousPath = useCallback((
    currentPath: string,
    isAllowed?: (p: string) => boolean
  ): string | null => {
    // Walk backward from the history stack to find the first non-prohibited, different route
    for (let i = historyStack.length - 2; i >= 0; i--) {
      const candidate = historyStack[i];
      if (!candidate) continue;

      if (candidate !== currentPath && !isProhibitedRedirect(candidate, currentPath)) {
        if (!isAllowed || isAllowed(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }, [historyStack]);

  const value = useMemo(
    () => ({ historyStack, pushRoute, popRoute, getSafePreviousPath }),
    [historyStack, pushRoute, popRoute, getSafePreviousPath]
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  return useContext(NavigationHistoryContext);
}

export interface UseGoBackOptions {
  /**
   * Explicit fallback URL if no safe previous history entry exists.
   */
  fallbackUrl?: string;

  /**
   * Optional custom validation filter to allow or disallow specific target paths.
   */
  isAllowedPath?: (path: string) => boolean;

  /**
   * If true and the current route is a root dashboard, back navigation is disabled.
   * Default is false.
   */
  disableOnRoot?: boolean;

  /**
   * User roles to determine appropriate role-based dashboard fallback.
   */
  userRoles?: string[];
}

export interface UseGoBackReturn {
  /**
   * Safely navigates back to the preceding verified internal route or the safe fallback.
   */
  goBack: () => void;

  /**
   * Whether back navigation is currently available and safe.
   */
  canGoBack: boolean;

  /**
   * The calculated safe destination (previous path or fallback).
   */
  destination: string;

  /**
   * Previous internal path if verified, or null if none.
   */
  previousPath: string | null;

  /**
   * Safe fallback URL computed for current context.
   */
  safeFallbackUrl: string;

  /**
   * Whether the current page is a root dashboard.
   */
  isRoot: boolean;
}

/**
 * Centralized `useGoBack` hook:
 * - Maintains and inspects internal navigation history
 * - Safely handles browser history
 * - Strictly avoids prohibited redirects (auth loops, cross-shell leaks, /dar traps)
 * - Returns sensible fallbacks for every workspace
 */
export function useGoBack(options: UseGoBackOptions = {}): UseGoBackReturn {
  const { fallbackUrl, isAllowedPath, disableOnRoot = false, userRoles } = options;
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname + location.search;
  const navHistory = useNavigationHistory();

  const isRoot = isRootRoute(location.pathname);
  const calculatedFallback = useMemo(() => {
    return fallbackUrl || getSafeFallbackUrl(location.pathname, userRoles);
  }, [fallbackUrl, location.pathname, userRoles]);

  // Find previous safe path from tracked history if available
  const safePreviousPath = useMemo(() => {
    if (navHistory) {
      return navHistory.getSafePreviousPath(currentPath, isAllowedPath);
    }
    // Fallback if provider is not present (e.g. isolated test)
    const stored = loadStoredHistory();
    for (let i = stored.length - 2; i >= 0; i--) {
      const candidate = stored[i];
      if (candidate && candidate !== currentPath && !isProhibitedRedirect(candidate, currentPath)) {
        if (!isAllowedPath || isAllowedPath(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }, [navHistory, currentPath, isAllowedPath]);

  const destination = safePreviousPath || calculatedFallback;

  // Determine if going back is meaningful/allowed
  const canGoBack = useMemo(() => {
    if (disableOnRoot && isRoot && !safePreviousPath) {
      return false;
    }
    return Boolean(destination && destination !== currentPath);
  }, [disableOnRoot, isRoot, safePreviousPath, destination, currentPath]);

  const goBack = () => {
    if (!canGoBack && disableOnRoot && isRoot) {
      return;
    }

    if (safePreviousPath) {
      navigate(safePreviousPath);
    } else if (calculatedFallback) {
      navigate(calculatedFallback);
    } else {
      navigate("/");
    }
  };

  return {
    goBack,
    canGoBack,
    destination,
    previousPath: safePreviousPath,
    safeFallbackUrl: calculatedFallback,
    isRoot,
  };
}
