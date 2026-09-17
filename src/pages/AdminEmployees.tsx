import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, UserPlus, Search } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMasterData } from "@/lib/masterData";
import { ROLE_LABEL, type OfficeRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { handleAdminDbError, type SchemaErrorInfo } from "@/lib/adminDatabaseErrorHandler";
import { SchemaErrorAlert } from "@/components/admin/SchemaErrorAlert";

interface EmployeeRow {
  user_id: string;
  employee_id: string | null;
  email: string;
  display_name: string | null;
  mobile: string | null;
  designation_code: string | null;
  designation?: string | null;
  status: string;
  allowed_login_method: string | null;
  archived_at: string | null;
  created_at: string;
}

const LOGIN_METHOD_LABEL: Record<string, string> = {
  google: "🔵 Google only",
  password: "🔑 Password only",
  both: "🔵🔑 Google or Password",
};

export default function AdminEmployees() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeSchemaError, setActiveSchemaError] = useState<SchemaErrorInfo | null>(null);
  const [lastFailedOp, setLastFailedOp] = useState<(() => Promise<void> | void) | null>(null);
  const designations = useMasterData("designation");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }] = await Promise.all([
      supabase.from("admin_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const mapped = (profiles ?? []).map((p: any) => ({
      ...p,
      designation_code: p.designation_code ?? p.designation ?? null,
      designation: p.designation ?? p.designation_code ?? null,
    }));
    setRows(mapped as unknown as EmployeeRow[]);
    const map: Record<string, string[]> = {};
    for (const r of roleRows ?? []) {
      (map[r.user_id] ??= []).push(r.role);
    }
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const roleOf = (userId: string): OfficeRole | "monitoring_authority" | null => {
    const employee = rows.find((r) => r.user_id === userId);
    const empEmail = employee?.email?.toLowerCase();
    if (empEmail === "bagula2nogp111@gmail.com" || empEmail === "nitish374482@gmail.com") return "super_admin";
    const list = roles[userId] ?? [];
    if (list.includes("super_admin")) return "super_admin";
    if (list.includes("admin")) return "admin";
    if (list.includes("monitoring_authority")) return "monitoring_authority";
    if (list.includes("deo")) return "deo";
    return null;
  };

  const roleLabel = (r: ReturnType<typeof roleOf>) =>
    r === "monitoring_authority" ? "👁️ Monitoring Authority (read-only)" : r ? ROLE_LABEL[r] : "— No role —";

  const setDesignation = async (userId: string, code: string) => {
    // Attempt 1: update both designation_code and designation
    let { error } = await supabase
      .from("admin_profiles")
      .update({ designation_code: code, designation: code } as never)
      .eq("user_id", userId);

    if (error && (error.message?.toLowerCase().includes("designation") || error.message?.toLowerCase().includes("schema cache"))) {
      // Fallback: try designation_code only
      const fallback = await supabase
        .from("admin_profiles")
        .update({ designation_code: code } as never)
        .eq("user_id", userId);
      if (!fallback.error) {
        error = null;
      } else {
        // Fallback 2: try designation only
        const fallback2 = await supabase
          .from("admin_profiles")
          .update({ designation: code } as never)
          .eq("user_id", userId);
        error = fallback2.error;
      }
    }

    if (error) {
      const errInfo = handleAdminDbError(error, {
        context: "Assigning Designation",
        tableName: "admin_profiles",
        onRetry: () => setDesignation(userId, code),
        onSchemaRefreshed: () => load(),
      });
      if (errInfo.isSchemaIssue) {
        setActiveSchemaError(errInfo);
        setLastFailedOp(() => () => setDesignation(userId, code));
      }
      return;
    }
    setActiveSchemaError(null);
    setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, designation_code: code, designation: code } : r)));
    await logActivity({
      action_type: "employee.designation.update",
      target_table: "admin_profiles",
      target_id: userId,
      metadata: { designation_code: code },
    });
    toast.success("Designation updated successfully");
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.employee_id, r.email, r.display_name, r.mobile]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h1 className="text-xl font-bold">👥 Employee Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/profiles-directory">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shadow-xs">
                <Users size={14} className="text-primary" />
                <span>Citizen &amp; Cyber Directory</span>
              </Button>
            </Link>
            <Link to="/admin/manage">
              <Button size="sm"><UserPlus size={14} className="mr-1" /> Create / manage accounts</Button>
            </Link>
          </div>
        </div>

        {activeSchemaError && (
          <SchemaErrorAlert
            errorInfo={activeSchemaError}
            onRetry={lastFailedOp || undefined}
            onDismiss={() => setActiveSchemaError(null)}
          />
        )}
        <p className="text-xs text-muted-foreground -mt-3">
          Designation is the job title. System Role decides permissions. They are kept fully separate.
        </p>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <label className="sr-only" htmlFor="emp-search">Search employees</label>
          <Input id="emp-search" className="pl-8" placeholder="Search name, email, mobile or Employee ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-2">
          {loading ? (
            <p className="text-xs text-muted-foreground p-4">Loading employees…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">No employees found.</p>
          ) : (
            <ul className="divide-y divide-border/30">
              {filtered.map((r) => (
                <li key={r.user_id} className="px-3 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {r.display_name || r.email}
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {r.employee_id ?? "—"}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        📧 {r.email} {r.mobile ? `· 📱 ${r.mobile}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        🛡️ {roleLabel(roleOf(r.user_id))} · {LOGIN_METHOD_LABEL[r.allowed_login_method ?? "both"]}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        r.archived_at
                          ? "bg-muted text-muted-foreground"
                          : r.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.archived_at ? "🗄️ Archived" : r.status === "active" ? "🟢 Active" : `⏸️ ${r.status}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">🏷️ Designation</span>
                    <Select
                      value={r.designation_code ?? r.designation ?? undefined}
                      onValueChange={(v) => setDesignation(r.user_id, v)}
                    >
                      <SelectTrigger className="h-8 w-52 text-xs">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        {designations.items.map((d) => (
                          <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground">
          Designations come from the <Link to="/admin/master-data" className="underline">Master Data Center</Link> — add new titles there.
        </p>
      </div>
    </div>
  );
}
