export type AdminAuthDebugState = {
  timestamp: string;
  sessionState: "checking" | "present" | "missing" | "error";
  userId: string | null;
  email: string | null;
  roleLookupResult: "not_checked" | "found" | "missing" | "created" | "error";
  roleLookupMessage: string | null;
  lastRedirectReason: string | null;
};

const STORAGE_KEY = "bagula-admin-auth-debug";

export const defaultAdminAuthDebug: AdminAuthDebugState = {
  timestamp: new Date(0).toISOString(),
  sessionState: "checking",
  userId: null,
  email: null,
  roleLookupResult: "not_checked",
  roleLookupMessage: null,
  lastRedirectReason: null,
};

export function readAdminAuthDebug(): AdminAuthDebugState {
  if (typeof window === "undefined") return defaultAdminAuthDebug;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultAdminAuthDebug, ...JSON.parse(raw) } : defaultAdminAuthDebug;
  } catch {
    return defaultAdminAuthDebug;
  }
}

export function writeAdminAuthDebug(update: Partial<AdminAuthDebugState>) {
  if (typeof window === "undefined") return;
  const next = {
    ...readAdminAuthDebug(),
    ...update,
    timestamp: new Date().toISOString(),
  } satisfies AdminAuthDebugState;
  if (import.meta.env.DEV) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("admin-auth-debug", { detail: next }));
    console.info("[AdminAuthDebug]", next);
  } else {
    // In production, do not persist or broadcast sensitive session data.
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

export function setLastRedirectReason(reason: string) {
  writeAdminAuthDebug({ lastRedirectReason: reason });
}