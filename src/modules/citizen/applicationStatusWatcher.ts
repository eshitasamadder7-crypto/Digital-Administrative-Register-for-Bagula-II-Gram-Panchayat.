import { useEffect, useState, useCallback, useRef } from "react";
import { notificationEngine } from "@/core/notificationEngine";
import type { CitizenApplicationRow } from "@/modules/application/api";
import { listCitizenApplications } from "@/modules/application/api";

const CACHE_KEY = "bgl.citizen.app_status_cache.v1";
const SEEN_UPDATES_KEY = "bgl.citizen.seen_updates.v1";

export interface StatusCacheEntry {
  id: string;
  kind: string;
  status: string;
  applicant_name?: string | null;
  memo_no?: string | null;
  certificate_number?: string | null;
  updated_at: number;
}

export interface StatusUpdateAlert {
  id: string;
  kind: string;
  oldStatus: string;
  newStatus: string;
  applicantName: string;
  identifier: string;
  timestamp: number;
  read: boolean;
}

const KIND_NAMES: Record<string, string> = {
  warish: "Warish Certificate",
  dependent: "Dependent Certificate",
};

/** Normalizes status string for comparison */
export function normalizeStatus(status: string | null | undefined): string {
  if (!status) return "Draft";
  const s = status.trim();
  const lower = s.toLowerCase();
  if (lower === "approved" || lower === "issued") return "Approved";
  if (lower === "under verification" || lower === "under review" || lower === "processing" || lower === "locked" || lower === "submitted" || lower === "pending signature & memo registration") {
    return "Under Verification";
  }
  if (lower === "returned") return "Returned";
  if (lower === "rejected" || lower === "auto_rejected") return "Rejected";
  if (lower === "draft") return "Draft";
  return s;
}

function loadCache(): Record<string, StatusCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, StatusCacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function loadSeenUpdates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_UPDATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSeenUpdates(seen: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_UPDATES_KEY, JSON.stringify(seen.slice(-50)));
  } catch {
    // ignore
  }
}

/**
 * Triggers toast and adds notification entry into NotificationCenter for citizen
 */
export function notifyCitizenStatusUpdate(
  appId: string,
  kind: string,
  oldStatus: string,
  newStatus: string,
  memoOrCert?: string | null,
  applicantName?: string | null,
  rejectionReason?: string | null,
) {
  const kindName = KIND_NAMES[kind] || "Certificate";
  const ref = memoOrCert || `App #${appId.slice(0, 8)}`;
  const applicantText = applicantName ? ` (${applicantName})` : "";

  const norm = normalizeStatus(newStatus);

  if (norm === "Approved") {
    notificationEngine.success(
      `🎉 Application Approved: ${kindName}`,
      `Your ${kindName}${applicantText} [${ref}] has been officially approved by the GP Sub-Registrar / Pradhan.`,
    );
  } else if (norm === "Under Verification") {
    notificationEngine.info(
      `🔍 Application Under Verification: ${kindName}`,
      `Your application [${ref}] has advanced to 'Under Verification'. The Gram Panchayat office is actively verifying records.`,
    );
  } else if (norm === "Returned") {
    notificationEngine.warning(
      `⚠️ Application Returned for Correction: ${kindName}`,
      rejectionReason
        ? `Correction required: "${rejectionReason}". Please review and resubmit your details.`
        : `Your application [${ref}] has been returned for modification. Please check required attachments.`,
    );
  } else if (norm === "Rejected") {
    notificationEngine.error(
      `❌ Application Rejected: ${kindName}`,
      rejectionReason
        ? `Application [${ref}] was rejected: ${rejectionReason}`
        : `Your ${kindName} application [${ref}] could not be verified by the GP office.`,
    );
  } else {
    notificationEngine.info(
      `📋 Status Updated: ${kindName}`,
      `Application [${ref}] status changed from '${oldStatus}' to '${newStatus}'.`,
    );
  }
}

/**
 * React hook for observing citizen applications and firing status update notifications
 */
export function useCitizenApplicationStatusWatcher(
  currentRows: CitizenApplicationRow[],
  onRowsUpdate?: (updatedRows: CitizenApplicationRow[]) => void,
) {
  const [activeUpdates, setActiveUpdates] = useState<StatusUpdateAlert[]>([]);
  const isInitialized = useRef(false);

  // Check rows against cache
  const checkStatusChanges = useCallback(
    (rows: CitizenApplicationRow[]) => {
      const cache = loadCache();
      const seenUpdates = loadSeenUpdates();
      const detectedUpdates: StatusUpdateAlert[] = [];
      const newCache: Record<string, StatusCacheEntry> = { ...cache };

      rows.forEach((row) => {
        const id = row.id;
        const currentStatus = row.status || "Draft";
        const cached = cache[id];
        const identifier = row.memo_no || row.certificate_number || `App #${id.slice(0, 8)}`;
        const applicantName = row.applicant_name || "Applicant";

        if (cached) {
          // Compare current status with cached status
          if (cached.status !== currentStatus) {
            // Status changed!
            const updateKey = `${id}_${currentStatus}`;
            const isAlreadySeen = seenUpdates.includes(updateKey);

            if (!isAlreadySeen) {
              // Trigger notification & toast
              notifyCitizenStatusUpdate(
                id,
                row.kind,
                cached.status,
                currentStatus,
                row.memo_no || row.certificate_number,
                row.applicant_name,
                row.rejection_reason,
              );

              // Mark as seen so we don't repeat toast on page reload
              seenUpdates.push(updateKey);
              saveSeenUpdates(seenUpdates);
            }

            detectedUpdates.push({
              id,
              kind: row.kind,
              oldStatus: cached.status,
              newStatus: currentStatus,
              applicantName,
              identifier,
              timestamp: Date.now(),
              read: isAlreadySeen,
            });
          }
        }

        // Update cache record
        newCache[id] = {
          id,
          kind: row.kind,
          status: currentStatus,
          applicant_name: row.applicant_name,
          memo_no: row.memo_no,
          certificate_number: row.certificate_number,
          updated_at: Date.now(),
        };
      });

      saveCache(newCache);
      if (detectedUpdates.length > 0) {
        setActiveUpdates((prev) => {
          const combined = [...detectedUpdates, ...prev];
          // unique by id
          const seen = new Set<string>();
          return combined.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!currentRows || currentRows.length === 0) return;

    if (!isInitialized.current) {
      // First run: if cache is empty, seed it without firing toasts so user doesn't get flooded
      const cache = loadCache();
      if (Object.keys(cache).length === 0) {
        const initialCache: Record<string, StatusCacheEntry> = {};
        currentRows.forEach((r) => {
          initialCache[r.id] = {
            id: r.id,
            kind: r.kind,
            status: r.status || "Draft",
            applicant_name: r.applicant_name,
            memo_no: r.memo_no,
            certificate_number: r.certificate_number,
            updated_at: Date.now(),
          };
        });
        saveCache(initialCache);
      } else {
        checkStatusChanges(currentRows);
      }
      isInitialized.current = true;
    } else {
      checkStatusChanges(currentRows);
    }
  }, [currentRows, checkStatusChanges]);

  // Periodic polling for status updates (every 25 seconds when page is focused)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const freshRows = await listCitizenApplications();
        if (freshRows && freshRows.length > 0) {
          checkStatusChanges(freshRows);
          if (onRowsUpdate) {
            onRowsUpdate(freshRows);
          }
        }
      } catch {
        // Silently ignore background polling errors
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [checkStatusChanges, onRowsUpdate]);

  const dismissUpdate = useCallback((appId: string) => {
    setActiveUpdates((prev) => prev.filter((u) => u.id !== appId));
  }, []);

  const clearAllUpdates = useCallback(() => {
    setActiveUpdates([]);
  }, []);

  /**
   * Helper for citizens or testers to simulate a status transition (e.g. to 'Under Verification' or 'Approved')
   */
  const simulateStatusChange = useCallback(
    (appId: string, newStatus: string) => {
      const cache = loadCache();
      const existing = cache[appId];
      const oldStatus = existing?.status || "Submitted";

      // Update cache
      if (existing) {
        cache[appId] = {
          ...existing,
          status: newStatus,
          updated_at: Date.now(),
        };
        saveCache(cache);
      }

      // Fire notification & toast
      notifyCitizenStatusUpdate(
        appId,
        existing?.kind || "warish",
        oldStatus,
        newStatus,
        existing?.memo_no || existing?.certificate_number || `SIM-${appId.slice(0, 6)}`,
        existing?.applicant_name || "Citizen",
      );

      // Add to active alerts
      setActiveUpdates((prev) => [
        {
          id: appId,
          kind: existing?.kind || "warish",
          oldStatus,
          newStatus,
          applicantName: existing?.applicant_name || "Applicant",
          identifier: existing?.memo_no || `SIM-${appId.slice(0, 6)}`,
          timestamp: Date.now(),
          read: false,
        },
        ...prev.filter((p) => p.id !== appId),
      ]);
    },
    [],
  );

  return {
    activeUpdates,
    dismissUpdate,
    clearAllUpdates,
    simulateStatusChange,
  };
}
