// Day 1: gradually reframe "Super Admin" as "Watcher (System Governor)"
// in UI copy only. No permission behavior changes — that comes in a later day.

import { SYSTEM_ROLE_LABEL, type SystemRole } from "@/modules/office/permissions";

export function displayRoleLabel(opts: {
  isSuperAdmin?: boolean;
  systemRole?: SystemRole | null;
  legacyLabel?: string | null;
}): string {
  if (opts.isSuperAdmin) return "Watcher (System Governor)";
  if (opts.systemRole) return SYSTEM_ROLE_LABEL[opts.systemRole];
  return opts.legacyLabel ?? "Office User";
}
