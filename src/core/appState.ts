export type AppStatus =
  | "draft"
  | "submitted"
  | "locked"
  | "processing"
  | "returned"
  | "approved"
  | "rejected"
  | "issued"
  | "archived";

export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  locked: "Locked",
  processing: "Processing",
  returned: "Returned",
  approved: "Approved",
  rejected: "Rejected",
  issued: "Issued",
  archived: "Archived",
};

export const APP_STATUS_BADGE: Record<AppStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  locked: "bg-slate-200 text-slate-700",
  processing: "bg-amber-100 text-amber-700",
  returned: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  issued: "bg-primary/15 text-primary",
  archived: "bg-zinc-200 text-zinc-700",
};

// Superset transitions. Existing tables/columns are unaffected — this is a UI helper only.
const TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["locked", "returned", "rejected"],
  locked: ["processing", "returned"],
  processing: ["approved", "rejected", "returned"],
  returned: ["submitted", "archived"],
  approved: ["issued", "rejected"],
  rejected: ["archived"],
  issued: ["archived"],
  archived: [],
};

export function canTransition(from: AppStatus, to: AppStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}