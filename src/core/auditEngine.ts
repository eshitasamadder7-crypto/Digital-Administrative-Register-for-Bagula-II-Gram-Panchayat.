import { logActivity } from "@/lib/activityLog";

/** Placeholder. Delegates to the existing activity log. */
export const auditEngine = {
  log: logActivity,
};