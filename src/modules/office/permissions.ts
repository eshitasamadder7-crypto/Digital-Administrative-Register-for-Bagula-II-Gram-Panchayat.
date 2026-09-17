// Day 1: single source of truth mapping System Role -> allowed actions.
// Designation is display-only and MUST NOT be consulted here.
//
// Existing per-permission ACL (admin_permissions table) still works alongside
// this — Super Admin and grant-based checks in src/lib/permissions.ts remain
// authoritative for now. This file is the forward-looking mapping used by
// the new Office Portal foundation.

import type { AppPermission, AppAction } from "@/lib/permissions";

export type SystemRole =
  | "office_user"
  | "office_manager"
  | "approving_authority"
  | "read_only";

export type OfficeDesignation =
  | "secretary"
  | "deo"
  | "pradhan"
  | "upa_pradhan"
  | "member"
  | "clerk"
  | "accountant"
  | "other";

export const DESIGNATION_LABEL: Record<OfficeDesignation, string> = {
  secretary: "Secretary",
  deo: "Data Entry Operator (DEO)",
  pradhan: "Pradhan",
  upa_pradhan: "Upa-Pradhan",
  member: "Member",
  clerk: "Clerk",
  accountant: "Accountant",
  other: "Other",
};

export const SYSTEM_ROLE_LABEL: Record<SystemRole, string> = {
  office_user: "Office User",
  office_manager: "Office Manager",
  approving_authority: "Approving Authority",
  read_only: "Read Only",
};

// Allowed actions per system role.
// Kept intentionally conservative — the App.tsx route table and existing
// RequirePermission/RequireAdmin components are still the gate at runtime.
const ROLE_ACTIONS: Record<SystemRole, ReadonlySet<AppAction>> = {
  office_user: new Set<AppAction>(["view", "create"]),
  office_manager: new Set<AppAction>(["view", "create", "edit"]),
  approving_authority: new Set<AppAction>(["view", "create", "edit", "delete"]),
  read_only: new Set<AppAction>(["view"]),
};

export function roleAllows(role: SystemRole | null | undefined, action: AppAction): boolean {
  if (!role) return false;
  return ROLE_ACTIONS[role]?.has(action) ?? false;
}

// Convenience — currently unused by legacy pages, wired up progressively.
export function roleAllowsPermission(
  role: SystemRole | null | undefined,
  _permission: AppPermission,
  action: AppAction,
): boolean {
  return roleAllows(role, action);
}
