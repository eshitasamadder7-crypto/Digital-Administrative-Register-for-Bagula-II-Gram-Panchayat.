import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMasterData } from "@/lib/masterData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Archive, Shield, ShieldOff, Lock, RotateCcw, KeyRound, UserPlus, ShieldCheck, AlertTriangle, Copy } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { logActivity } from "@/lib/activityLog";
import {
  ROLE_LABEL,
  ROLE_SUMMARY,
  ROLE_PERMISSIONS,
  type OfficeRole,
  type AppPermission,
} from "@/lib/permissions";
import { DESIGNATION_LABEL, type OfficeDesignation } from "@/modules/office/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleAdminDbError, type SchemaErrorInfo } from "@/lib/adminDatabaseErrorHandler";
import { SchemaErrorAlert } from "@/components/admin/SchemaErrorAlert";

const PROTECTED_EMAILS = new Set(["bagula2nogp111@gmail.com", "nitish374482@gmail.com"]);

const LOGIN_METHOD_LABEL: Record<string, string> = {
  google: "Google only",
  password: "Email & Password only",
  both: "Google or Email & Password",
};

interface AdminProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  last_login_at: string | null;
  created_at: string;
  archived_at?: string | null;
  service_scope: string[];
  designation?: OfficeDesignation | null;
  designation_code?: string | null;
  mobile?: string | null;
  allowed_login_method?: string | null;
  must_change_password?: boolean | null;
}

async function callOfficeAccounts(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("office-accounts", {
    body: { action, payload },
  });
  if (error) {
    // Surface the function's JSON error message when available.
    const ctx = (error as any).context;
    try {
      const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      throw new Error(body?.error ?? error.message);
    } catch (e: any) {
      throw new Error(e?.message ?? error.message);
    }
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

function PermissionSummary({ role }: { role: OfficeRole }) {
  const perms = ROLE_PERMISSIONS[role];
  const entries = Object.entries(perms) as [AppPermission, string[]][];
  return (
    <div className="rounded-xl border border-border/40 p-3 space-y-2 bg-muted/30">
      <h3 className="text-xs font-semibold">Fixed permissions for {ROLE_LABEL[role]}</h3>
      <p className="text-[11px] text-muted-foreground">{ROLE_SUMMARY[role]}</p>
      <ul className="text-[11px] space-y-0.5">
        {entries.map(([perm, actions]) => (
          <li key={perm}>
            <span className="font-medium capitalize">{perm.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground"> — {actions.join(", ")}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Permissions are fixed by the system role and cannot be edited per account.
      </p>
    </div>
  );
}

export default function AdminManageAdmins() {
  const { items: masterDesignations } = useMasterData("designation");
  const [admins, setAdmins] = useState<AdminProfileRow[]>([]);

  const allDesignationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(DESIGNATION_LABEL)) {
      map.set(k, v);
    }
    for (const md of masterDesignations) {
      if (md.is_active) {
        map.set(md.code, md.label + (md.label_bn ? ` (${md.label_bn})` : ""));
      }
    }
    return Array.from(map.entries());
  }, [masterDesignations]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<AdminProfileRow | null>(null);
  const [archiveConfirmText, setArchiveConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminProfileRow | null>(null);
  const [activeSchemaError, setActiveSchemaError] = useState<SchemaErrorInfo | null>(null);
  const [lastFailedOp, setLastFailedOp] = useState<(() => Promise<void> | void) | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    email: string;
    displayName: string | null;
    tempPassword: string;
  } | null>(null);

  // New office account form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    mobile: "",
    designation: "deo" as OfficeDesignation,
    role: "deo" as OfficeRole,
    service_scope: "",
    allowed_login_method: "both",
    temp_password: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
      supabase.from("admin_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const mappedAdmins = (profilesData ?? []).map((p: any) => ({
      ...p,
      designation: p.designation ?? p.designation_code ?? null,
      designation_code: p.designation_code ?? p.designation ?? null,
    }));
    setAdmins(mappedAdmins as AdminProfileRow[]);
    const rolesMap: Record<string, string[]> = {};
    for (const r of rolesData ?? []) {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    }
    setRoles(rolesMap);
    setLoading(false);
  };

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        setCurrentUserEmail(data.user.email?.toLowerCase() ?? null);
      }
    });
  }, []);

  const isSuperAdmin =
    currentUserEmail === "bagula2nogp111@gmail.com" ||
    currentUserEmail === "nitish374482@gmail.com" ||
    (currentUserId ? (roles[currentUserId] ?? []).includes("super_admin") : false);

  const roleOf = (userId: string): OfficeRole | null => {
    const adminProfile = admins.find((a) => a.user_id === userId);
    const profileEmail = adminProfile?.email?.toLowerCase();
    if (profileEmail === "bagula2nogp111@gmail.com" || profileEmail === "nitish374482@gmail.com") return "super_admin";
    const list = roles[userId] ?? [];
    if (list.includes("super_admin")) return "super_admin";
    if (list.includes("admin")) return "admin";
    if (list.includes("deo")) return "deo";
    return null;
  };

  const createAccount = async () => {
    setBusy(true);
    try {
      await callOfficeAccounts("create", form);
      toast.success("Office account created. Share the temporary password with the officer.");
      setForm({
        full_name: "",
        email: "",
        mobile: "",
        designation: "deo",
        role: "deo",
        service_scope: "",
        allowed_login_method: "both",
        temp_password: "",
      });
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, role: OfficeRole) => {
    setBusy(true);
    try {
      await callOfficeAccounts("set_role", { user_id: userId, role });
      toast.success(`Role changed to ${ROLE_LABEL[role]}. Permissions applied automatically.`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changeLoginMethod = async (userId: string, method: string) => {
    setBusy(true);
    try {
      await callOfficeAccounts("set_login_method", { user_id: userId, allowed_login_method: method });
      setAdmins((prev) =>
        prev.map((a) => (a.user_id === userId ? { ...a, allowed_login_method: method } : a)),
      );
      toast.success("Login method updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (target: AdminProfileRow) => {
    setBusy(true);
    try {
      const response = await callOfficeAccounts("reset_password", { user_id: target.user_id });
      setResetTarget(null);
      toast.success("Password reset successfully.");
      setTempPasswordResult({
        email: response?.email || target.email,
        displayName: response?.display_name || target.display_name,
        tempPassword: response?.temporary_password || "",
      });
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  };

  const updateDesignation = async (userId: string, value: string | null) => {
    // Attempt 1: update both designation and designation_code
    let { error } = await supabase
      .from("admin_profiles")
      .update({ designation: value, designation_code: value } as any)
      .eq("user_id", userId);

    if (error && (error.message?.toLowerCase().includes("designation") || error.message?.toLowerCase().includes("schema cache"))) {
      // Fallback: try designation_code only
      const fallback = await supabase
        .from("admin_profiles")
        .update({ designation_code: value } as any)
        .eq("user_id", userId);
      if (!fallback.error) {
        error = null;
      } else {
        // Fallback: try designation only
        const fallback2 = await supabase
          .from("admin_profiles")
          .update({ designation: value } as any)
          .eq("user_id", userId);
        error = fallback2.error;
      }
    }

    if (error) {
      const errInfo = handleAdminDbError(error, {
        context: "Assigning Designation",
        tableName: "admin_profiles",
        onRetry: () => updateDesignation(userId, value),
        onSchemaRefreshed: () => load(),
      });
      if (errInfo.isSchemaIssue) {
        setActiveSchemaError(errInfo);
        setLastFailedOp(() => () => updateDesignation(userId, value));
      }
      return;
    }
    setActiveSchemaError(null);
    setAdmins((prev) =>
      prev.map((a) =>
        a.user_id === userId
          ? { ...a, designation: value as any, designation_code: value as any }
          : a,
      ),
    );
    await logActivity({
      action_type: "admin.profile.designation.update",
      target_table: "admin_profiles",
      target_id: userId,
      metadata: { designation: value },
    });
    toast.success("Designation updated successfully");
  };

  const setStatus = async (userId: string, status: "active" | "suspended") => {
    const { error } = await supabase.from("admin_profiles").update({ status }).eq("user_id", userId);
    if (error) {
      const errInfo = handleAdminDbError(error, {
        context: "Account Status",
        tableName: "admin_profiles",
        onRetry: () => setStatus(userId, status),
        onSchemaRefreshed: () => load(),
      });
      if (errInfo.isSchemaIssue) {
        setActiveSchemaError(errInfo);
        setLastFailedOp(() => () => setStatus(userId, status));
      }
      return;
    }
    setActiveSchemaError(null);
    await logActivity({
      action_type: status === "active" ? "admin.unsuspend" : "admin.suspend",
      target_table: "admin_profiles",
      target_id: userId,
    });
    toast.success(`Account ${status}`);
    load();
  };

  const archiveAdmin = async () => {
    if (!archiveTarget) return;
    if (PROTECTED_EMAILS.has(archiveTarget.email.toLowerCase())) {
      toast.error("This account is protected and cannot be archived.");
      return;
    }
    if (archiveConfirmText.trim().toLowerCase() !== archiveTarget.email.toLowerCase()) {
      toast.error("Type the officer's email to confirm.");
      return;
    }
    const errors: string[] = [];
    const r2 = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", archiveTarget.user_id)
      .in("role", ["admin", "super_admin", "deo"]);
    if (r2.error) errors.push(r2.error.message);
    const r3 = await supabase
      .from("admin_profiles")
      .update({ status: "suspended", archived_at: new Date().toISOString() })
      .eq("user_id", archiveTarget.user_id);
    if (r3.error) errors.push(r3.error.message);
    if (errors.length) {
      toast.error(errors.join("; "));
      return;
    }
    await logActivity({
      action_type: "admin.archive",
      target_table: "admin_profiles",
      target_id: archiveTarget.user_id,
      metadata: { email: archiveTarget.email },
    });
    toast.success("Account archived");
    setArchiveTarget(null);
    setArchiveConfirmText("");
    setSelected(null);
    load();
  };

  const restoreAdmin = async (row: AdminProfileRow) => {
    const { error } = await supabase
      .from("admin_profiles")
      .update({ status: "active", archived_at: null })
      .eq("user_id", row.user_id);
    if (error) {
      const errInfo = handleAdminDbError(error, {
        context: "Restoring Account",
        tableName: "admin_profiles",
        onRetry: () => restoreAdmin(row),
        onSchemaRefreshed: () => load(),
      });
      if (errInfo.isSchemaIssue) {
        setActiveSchemaError(errInfo);
        setLastFailedOp(() => () => restoreAdmin(row));
      }
      return;
    }
    setActiveSchemaError(null);
    await logActivity({ action_type: "admin.restore", target_table: "admin_profiles", target_id: row.user_id });
    toast.success("Account restored (system role must be re-assigned)");
    load();
  };

  const selectedAdmin = admins.find((a) => a.user_id === selected);
  const selectedRole = selected ? roleOf(selected) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Office Credentials</h1>
          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shadow-xs">
              <Link to="/admin/deo-quotas">
                <ShieldCheck size={13} />
                <span>⚖️ DEO Quotas &amp; 1/2/3 Tiers</span>
              </Link>
            </Button>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Show archived
            </label>
          </div>
        </div>

        {activeSchemaError && (
          <SchemaErrorAlert
            errorInfo={activeSchemaError}
            onRetry={lastFailedOp || undefined}
            onDismiss={() => setActiveSchemaError(null)}
          />
        )}

        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-2">
            <UserPlus size={15} /> Create an office account
          </h2>
          <p className="text-xs text-muted-foreground">
            The account works immediately — the officer does not need to sign in with Google first.
            Permissions are fixed by the selected system role.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground" htmlFor="of-name">Full name</label>
              <Input id="of-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Sauvik Sikder" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground" htmlFor="of-email">Official email</label>
              <Input id="of-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="officer@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground" htmlFor="of-mobile">Mobile number</label>
              <Input id="of-mobile" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} placeholder="9876543210" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Designation</label>
              <Select value={form.designation} onValueChange={(v) => setForm({ ...form, designation: v as OfficeDesignation })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allDesignationOptions.map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">System role (fixed permissions)</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as OfficeRole })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as OfficeRole[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Allowed login method</label>
              <Select value={form.allowed_login_method} onValueChange={(v) => setForm({ ...form, allowed_login_method: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOGIN_METHOD_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.allowed_login_method !== "google" && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground" htmlFor="of-pw">Temporary password</label>
                <Input id="of-pw" value={form.temp_password} onChange={(e) => setForm({ ...form, temp_password: e.target.value })} placeholder="At least 8 chars, letters + numbers" />
                <p className="text-[10px] text-muted-foreground">The officer must change this at first login.</p>
              </div>
            )}
          </div>
          <PermissionSummary role={form.role} />
          <Button onClick={createAccount} disabled={busy}>Create office account</Button>
        </section>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading office accounts…</p>
        ) : (
          <div className="grid md:grid-cols-[1fr_2fr] gap-4">
            <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-3 space-y-1 max-h-[70vh] overflow-auto">
              {admins
                .filter((a) => showArchived || !a.archived_at)
                .map((a) => {
                  const r = roleOf(a.user_id);
                  const isProtected = PROTECTED_EMAILS.has(a.email.toLowerCase());
                  return (
                    <button
                      key={a.user_id}
                      onClick={() => setSelected(a.user_id)}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-colors ${
                        selected === a.user_id ? "bg-primary/10 text-foreground" : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{a.display_name || a.email}</div>
                      <div className="text-muted-foreground truncate">{a.email}</div>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {r && <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary">{ROLE_LABEL[r].split(" (")[0]}</span>}
                        {isProtected && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-flex items-center gap-1"><Lock size={10} />Protected</span>}
                        {a.archived_at && <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">Archived</span>}
                        <span className={`px-1.5 py-0.5 rounded ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {a.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              {admins.length === 0 && <p className="text-xs text-muted-foreground p-2">No office accounts yet.</p>}
            </section>

            <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 space-y-4">
              {!selectedAdmin ? (
                <p className="text-sm text-muted-foreground">Select an account to manage its credentials.</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">{selectedAdmin.display_name || selectedAdmin.email}</h2>
                      <p className="text-xs text-muted-foreground">{selectedAdmin.email}</p>
                      {selectedAdmin.mobile && <p className="text-xs text-muted-foreground">{selectedAdmin.mobile}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last login: {selectedAdmin.last_login_at ? new Date(selectedAdmin.last_login_at).toLocaleString() : "never"}
                        {selectedAdmin.must_change_password ? " • must change password at next login" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedAdmin.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => setStatus(selectedAdmin.user_id, "suspended")} disabled={PROTECTED_EMAILS.has(selectedAdmin.email.toLowerCase())}>
                          <ShieldOff size={14} className="mr-1" /> Suspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setStatus(selectedAdmin.user_id, "active")}>
                          <Shield size={14} className="mr-1" /> Activate
                        </Button>
                      )}
                      {selectedAdmin.archived_at ? (
                        <Button size="sm" variant="outline" onClick={() => restoreAdmin(selectedAdmin)}>
                          <RotateCcw size={14} className="mr-1" /> Restore
                        </Button>
                      ) : PROTECTED_EMAILS.has(selectedAdmin.email.toLowerCase()) ? (
                        <Button size="sm" variant="outline" disabled title="Emergency admin — cannot be archived">
                          <Lock size={14} className="mr-1" /> Protected
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setArchiveTarget(selectedAdmin);
                            setArchiveConfirmText("");
                          }}
                        >
                          <Archive size={14} className="mr-1" /> Archive
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/40 p-3 space-y-2">
                    <h3 className="text-xs font-semibold">Designation, role &amp; login</h3>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Designation</label>
                        <Select
                          value={selectedAdmin.designation ?? selectedAdmin.designation_code ?? ""}
                          onValueChange={(v) => updateDesignation(selectedAdmin.user_id, v || null)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {allDesignationOptions.map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">System role</label>
                        <Select
                          value={selectedRole ?? ""}
                          onValueChange={(v) => changeRole(selectedAdmin.user_id, v as OfficeRole)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ROLE_LABEL) as OfficeRole[]).map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Allowed login</label>
                        <Select
                          value={selectedAdmin.allowed_login_method ?? "both"}
                          onValueChange={(v) => changeLoginMethod(selectedAdmin.user_id, v)}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(LOGIN_METHOD_LABEL).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && selectedAdmin.user_id !== currentUserId && (
                    <div className="rounded-xl border border-amber-500/30 p-3.5 space-y-2 bg-amber-500/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xs font-semibold inline-flex items-center gap-2 text-foreground">
                            <KeyRound size={14} className="text-amber-600" /> Reset Password
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Immediately invalidates the current password, revokes active sessions, and generates a one-time temporary credential.
                          </p>
                        </div>
                        <Button
                          id="btn-trigger-reset-password"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 shrink-0"
                          disabled={busy}
                          onClick={() => setResetTarget(selectedAdmin)}
                        >
                          <KeyRound size={13} className="mr-1.5 text-amber-600" />
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedAdmin.user_id === currentUserId && (
                    <div className="rounded-xl border border-border/40 p-3 text-[11px] text-muted-foreground bg-muted/20">
                      To change your own password, please use your standard Account Settings.
                    </div>
                  )}

                  {selectedRole ? (
                    <PermissionSummary role={selectedRole} />
                  ) : (
                    <p className="text-xs p-3 rounded-lg bg-orange-100 text-orange-800">
                      No system role assigned — this account cannot access the office portal.
                    </p>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Reset Password */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="text-amber-600" size={18} />
              Reset Password
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-2.5 pt-1 text-muted-foreground">
                <p className="font-semibold text-foreground text-sm">
                  Reset the password for this office user?
                </p>
                <p>
                  Target Officer: <strong className="text-foreground">{resetTarget?.display_name || resetTarget?.email}</strong>
                  <br />
                  Email: <span className="font-mono text-foreground">{resetTarget?.email}</span>
                </p>
                <div className="text-amber-900 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed text-left">
                  <p className="font-semibold">Security Safeguard Policy:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                    <li>The current password will stop working immediately.</li>
                    <li>Any active officer sessions will be revoked.</li>
                    <li>A cryptographically secure temporary password will be generated.</li>
                    <li>The officer will be strictly required to change their password at next login.</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="btn-confirm-reset-password"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (resetTarget) handleResetPassword(resetTarget);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {busy ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single-View Temporary Password Display Dialog */}
      <AlertDialog open={!!tempPasswordResult} onOpenChange={() => setTempPasswordResult(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
              <ShieldCheck size={20} />
              Password Reset Successfully
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-3 pt-1">
                <p className="text-muted-foreground">
                  The password for <strong className="text-foreground">{tempPasswordResult?.email}</strong> has been updated in Supabase Auth. The previous password is now invalid.
                </p>
                <div className="bg-amber-500/15 border border-amber-500/40 p-2.5 rounded-lg text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>Save this temporary password now. It will not be shown again.</span>
                </div>
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    New Temporary Password
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      id="temp-password-display"
                      className="flex-1 bg-slate-950 text-emerald-400 font-mono text-sm px-3 py-2 rounded-md border border-slate-800 select-all tracking-wider font-bold break-all"
                    >
                      {tempPasswordResult?.tempPassword}
                    </div>
                    <Button
                      id="btn-copy-temp-password"
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-9"
                      onClick={() => {
                        if (tempPasswordResult?.tempPassword) {
                          navigator.clipboard.writeText(tempPasswordResult.tempPassword);
                          toast.success("Temporary password copied to clipboard!");
                        }
                      }}
                    >
                      <Copy size={14} className="mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed text-left">
                  When the officer signs in with this temporary password, they will be forced to change it immediately before accessing the Office Portal.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              id="btn-close-temp-password-modal"
              onClick={() => setTempPasswordResult(null)}
              className="w-full sm:w-auto"
            >
              Done &amp; Dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => { if (!o) { setArchiveTarget(null); setArchiveConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this office account?</AlertDialogTitle>
            <AlertDialogDescription>
              This revokes the system role and hides the profile from the active list.
              The audit trail is preserved and a Super Admin can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Type <span className="font-mono">{archiveTarget?.email}</span> to confirm.
            </p>
            <Input value={archiveConfirmText} onChange={(e) => setArchiveConfirmText(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveAdmin}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
