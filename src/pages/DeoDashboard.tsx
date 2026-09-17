import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  Users,
  LogOut,
  FilePlus2,
  FileEdit,
  FileWarning,
  Send,
  FileCheck2,
  Stamp,
  ShieldCheck,
  Search,
  QrCode,
  Download,
  Building2,
  ClipboardList,
  ArrowRight,
  CircleDot,
  Inbox,
  Home,
  Lock,
} from "lucide-react";
import { useAuthz } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import { useCurrentOfficer } from "@/modules/office/useCurrentOfficer";
import { DESIGNATION_LABEL } from "@/modules/office/permissions";
import { notificationEngine, type NotificationEntry } from "@/core/notificationEngine";
import { getDeoConfig, type DeoConfig } from "@/lib/userQuotasAndLimits";

interface QueueCounts {
  drafts: number;
  submitted: number;
  returned: number;
  issued: number;
  completed: number;
  total: number;
}

interface RecentRow {
  id: string;
  kind: "warish" | "dependent";
  applicant: string | null;
  status: string | null;
  created_at: string;
}

interface ReturnedRow {
  id: string;
  kind: "warish" | "dependent" | "linkage";
  applicant: string | null;
  remarks: string;
  rejected_at: string | null;
  returnCount: number | null;
}

interface ActivityRow {
  id: string;
  action_type: string;
  target_table: string | null;
  created_at: string;
}

const SUBMITTED_STATUS = "Pending Signature & Memo Registration";
const RETURN_TAG = "[RETURN]";

const editRoute = (kind: "warish" | "dependent" | "linkage", id: string) =>
  kind === "linkage"
    ? `/admin/deo/apply/linkage?id=${id}`
    : `${kind === "warish" ? "/warish-certificate" : "/dependent-certificate"}?load=${id}`;


export default function DeoDashboard() {
  const navigate = useNavigate();
  const authz = useAuthz();
  const officer = useCurrentOfficer();

  const [counts, setCounts] = useState<QueueCounts>({ drafts: 0, submitted: 0, returned: 0, issued: 0, completed: 0, total: 0 });
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [returnedRows, setReturnedRows] = useState<ReturnedRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [serviceScope, setServiceScope] = useState<string[]>([]);
  const [deoConfig, setDeoConfig] = useState<DeoConfig | null>(null);
  const [notifs, setNotifs] = useState<NotificationEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => notificationEngine.subscribe(setNotifs), []);

  useEffect(() => {
    if (!authz.userId) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const uid = authz.userId!;
      const cols = "id, status, applicant_name, created_at, created_by, rejection_reason, rejected_at, memo_no";
      const [w, d, l, wr, dr, lr] = await Promise.all([
        Promise.resolve(supabase.from("warish_certificates").select(cols).eq("created_by", uid).order("created_at", { ascending: false }).limit(50)).catch(() => ({ data: [], error: null })),
        Promise.resolve(supabase.from("dependent_certificates").select(cols).eq("created_by", uid).order("created_at", { ascending: false }).limit(50)).catch(() => ({ data: [], error: null })),
        Promise.resolve(supabase.from("linkage_certificates").select(cols).eq("created_by", uid).order("created_at", { ascending: false }).limit(50)).catch(() => ({ data: [], error: null })),
        Promise.resolve(supabase.from("warish_certificates").select("id", { count: "exact", head: true }).eq("created_by", uid)).catch(() => ({ count: 0, error: null })),
        Promise.resolve(supabase.from("dependent_certificates").select("id", { count: "exact", head: true }).eq("created_by", uid)).catch(() => ({ count: 0, error: null })),
        Promise.resolve(supabase.from("linkage_certificates").select("id", { count: "exact", head: true }).eq("created_by", uid)).catch(() => ({ count: 0, error: null })),
      ]);
      if (cancelled) return;

      const wRows = (w?.data ?? []) as any[];
      const dRows = (d?.data ?? []) as any[];
      const lRows = (l?.data ?? []) as any[];
      const all = [
        ...wRows.map((r) => ({ ...r, kind: "warish" as const })),
        ...dRows.map((r) => ({ ...r, kind: "dependent" as const })),
        ...lRows.map((r) => ({ ...r, kind: "linkage" as const })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      const isReturned = (r: any) =>
        r.status === "Returned" ||
    (r.status === "Rejected" && String(r.rejection_reason ?? "").startsWith(RETURN_TAG));

      const submitted = all.filter((r) => r.status === SUBMITTED_STATUS).length;
      const returnedList = all.filter(isReturned);
      const returned = returnedList.length;
      const issued = all.filter((r) => r.status === "Approved").length;
      const completed = all.filter((r) => r.status === "Approved" && r.memo_no).length;
      const drafts = all.filter(
        (r) => r.status !== SUBMITTED_STATUS && r.status !== "Approved" && r.status !== "Rejected",
      ).length;
      const total = (wr?.count ?? 0) + (dr?.count ?? 0) + (lr?.count ?? 0);

      setCounts({ drafts, submitted, returned, issued, completed, total });

      // Return count per application, read from the certificate audit trail.
      const returnCountById = new Map<string, number>();
      if (returnedList.length > 0) {
        const { data: auditRows } = await supabase
          .from("certificate_audit_logs")
          .select("cert_id, action, reason")
          .in("cert_id", returnedList.map((r) => r.id))
          .eq("action", "rejected");
        for (const a of (auditRows ?? []) as any[]) {
          if (!String(a.reason ?? "").startsWith(RETURN_TAG)) continue;
          returnCountById.set(a.cert_id, (returnCountById.get(a.cert_id) ?? 0) + 1);
        }
      }

      setReturnedRows(
        returnedList.slice(0, 8).map((r) => ({
          id: r.id,
          kind: r.kind,
          applicant: r.applicant_name ?? null,
          remarks: String(r.rejection_reason ?? "").slice(RETURN_TAG.length).trim(),
          rejected_at: r.rejected_at ?? null,
          returnCount: returnCountById.get(r.id) ?? null,
        })),
      );

      setRecent(
        all.slice(0, 5).map((r) => ({
          id: r.id,
          kind: r.kind,
          applicant: r.applicant_name ?? null,
          status: r.status ?? null,
          created_at: r.created_at,
        })),
      );


      // fetch scope and super-admin configured certificate permissions
      const [profileRes, cfg] = await Promise.all([
        supabase.from("admin_profiles").select("service_scope").eq("user_id", authz.userId).maybeSingle(),
        getDeoConfig(uid),
      ]);
      if (!cancelled) {
        setDeoConfig(cfg);
        const resolvedScope = cfg.allowedCertificates.length > 0
          ? cfg.allowedCertificates
          : (profileRes.data?.service_scope && profileRes.data.service_scope.length > 0
              ? profileRes.data.service_scope
              : ["warish", "dependent", "linkage"]);
        setServiceScope(resolvedScope);
      }


      const { data: acts } = await supabase
        .from("activity_logs")
        .select("id, action_type, target_table, created_at")
        .eq("actor_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!cancelled) setActivity((acts ?? []) as ActivityRow[]);
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authz.userId]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const signOut = async () => {
    await logActivity({ action_type: "auth.signout" });
    await supabase.auth.signOut();
    navigate("/admin", { replace: true });
  };

  const officerName = officer.displayName ?? officer.email?.split("@")[0] ?? "Officer";
  const designationLabel = officer.designation ? DESIGNATION_LABEL[officer.designation] : "Data Entry Operator";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* SECTION 1 — HEADER */}
        <header className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shadow-sm">
                <Building2 size={22} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Welcome back</p>
                <h1 className="text-lg sm:text-xl font-bold font-heading text-foreground">{officerName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{designationLabel}</span>
                  <span className="mx-2">·</span>
                  Bagula II Gram Panchayat
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
                <Link to="/">
                  <Home size={14} className="text-primary" />
                  <span>Main Site</span>
                </Link>
              </Button>
              <NotificationCenter variant="compact" tone="dark" />
              <Button variant="outline" size="sm" onClick={() => setShowSignOutDialog(true)}>
                <LogOut size={14} className="mr-1" /> Sign out
              </Button>
            </div>
          </div>
        </header>

        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={signOut}
          description="Are you sure you want to sign out of the DEO workspace?"
        />

        {authz.loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {/* SUPER ADMIN AUTHORIZATION BADGE */}
            {deoConfig && (() => {
              const effectiveTier = deoConfig.tier ?? (deoConfig.allowedCertificates.length >= 3 ? 3 : deoConfig.allowedCertificates.length === 2 ? 2 : 1);
              const effectiveLimit = deoConfig.dailyLimit ?? deoConfig.dailyApplicationLimit ?? 25;
              return (
                <div className="rounded-xl border border-primary/20 bg-card p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      T{effectiveTier}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-foreground">
                          Super Admin Certificate Authorization ({deoConfig.allowedCertificates.length} of 3 Types)
                        </h3>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/15 text-primary">
                          Tier {effectiveTier}: {effectiveTier === 1 ? "1 Certificate Tier" : effectiveTier === 2 ? "2 Certificates Tier" : "3 Certificates Tier (Full)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Allowed types: <strong className="text-foreground">{deoConfig.allowedCertificates.join(", ").toUpperCase()}</strong>
                        {" · "}
                        Daily Application Limit: <strong className="text-foreground">{effectiveLimit} applications/day</strong>
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[11px] text-muted-foreground block">Today's Drafts Created</span>
                    <span className="font-mono font-bold text-foreground">{counts.drafts} / {effectiveLimit}</span>
                  </div>
                </div>
              );
            })()}

            {/* SECTION 2 — MY WORK */}
            <section>
              <SectionTitle icon={FilePlus2} title="📄 My Work" hint="Only the DEO can create new applications" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                {(serviceScope.includes('warish') || serviceScope.includes('all')) ? (
                  <PrimaryAction
                    to="/admin/deo/apply/warish"
                    title="➕ New Warish Application"
                    desc="Start a fresh Warish entry"
                    icon={ScrollText}
                    tone="sky"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-border/70 bg-muted/20 opacity-75 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <ScrollText size={18} />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Lock size={10} /> Locked</span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground mt-2">Warish Certificate</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Not permitted under current DEO tier set by Super Admin.</p>
                    </div>
                  </div>
                )}

                {(serviceScope.includes('dependent') || serviceScope.includes('all')) ? (
                  <PrimaryAction
                    to="/admin/deo/apply/dependent"
                    title="➕ New Dependent Application"
                    desc="Start a fresh Dependent entry"
                    icon={Users}
                    tone="violet"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-border/70 bg-muted/20 opacity-75 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <Users size={18} />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Lock size={10} /> Locked</span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground mt-2">Dependent Certificate</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Not permitted under current DEO tier set by Super Admin.</p>
                    </div>
                  </div>
                )}

                {(serviceScope.includes('linkage') || serviceScope.includes('all')) ? (
                  <PrimaryAction
                    to="/admin/deo/apply/linkage"
                    title="➕ New Linkage Application"
                    desc="Election Enrolment Linkage entry"
                    icon={FileCheck2}
                    tone="emerald"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-border/70 bg-muted/20 opacity-75 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <FileCheck2 size={18} />
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Lock size={10} /> Locked</span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground mt-2">Linkage Certificate</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Not permitted under current DEO tier set by Super Admin.</p>
                    </div>
                  </div>
                )}
                <PrimaryAction
                  to="/admin/warish"
                  title="📝 My Drafts"
                  desc="Pick up your in-progress work"
                  icon={FileEdit}
                  tone="amber"
                  badge={counts.drafts > 0 ? String(counts.drafts) : undefined}
                />
                <PrimaryAction
                  to="#returned-for-modification"
                  title="🔄 Returned for Modification"
                  desc="Admin sent these back for correction"
                  icon={FileWarning}
                  tone="rose"
                  badge={counts.returned > 0 ? String(counts.returned) : undefined}
                />
                <PrimaryAction
                  to="/admin/warish"
                  title="📤 Submitted"
                  desc="Waiting with the Admin for review"
                  icon={Send}
                  tone="sky"
                  badge={counts.submitted > 0 ? String(counts.submitted) : undefined}
                />
                <PrimaryAction
                  to="#public-drafts"
                  title="📥 Public Drafts"
                  desc="Citizen submissions within 3 days"
                  icon={Inbox}
                  tone="emerald"
                />
                <PrimaryAction
                  to="/admin/warish"
                  title="📋 My Completed Applications"
                  desc="Issued with memo registered"
                  icon={FileCheck2}
                  tone="emerald"
                  badge={counts.completed > 0 ? String(counts.completed) : undefined}
                />
                <PrimaryAction
                  to="/admin/account"
                  title="⚙️ Profile Settings"
                  desc="Mobile, email, password, language"
                  icon={ClipboardList}
                  tone="slate"
                />
              </div>
            </section>

            {/* SECTION 2b — RETURNED FOR MODIFICATION */}
            <section
              id="returned-for-modification"
              className="rounded-2xl border border-rose-200 bg-rose-50/60 backdrop-blur-sm p-5 shadow-sm scroll-mt-4"
            >
              <SectionTitle
                icon={FileWarning}
                title="🔄 Returned for Modification"
                hint="Correct the remarks and resubmit — maximum 5 returns, after that the application is auto-rejected"
              />
              <ul className="mt-3 space-y-2">
                {loadingData && <li className="text-xs text-muted-foreground">Loading…</li>}
                {!loadingData && returnedRows.length === 0 && (
                  <li className="text-xs text-muted-foreground">
                    Nothing returned. Applications sent back by Admin will appear here.
                  </li>
                )}
                {returnedRows.map((r) => (
                  <li
                    key={`${r.kind}-${r.id}`}
                    className="rounded-xl border border-rose-200 bg-white/80 px-3 py-2 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {r.kind === "warish" ? "Warish" : r.kind === "linkage" ? "Linkage" : "Dependent"} · {r.applicant ?? "—"}
                        <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          🔄 Returned
                        </span>
                        {r.returnCount !== null && (
                          <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            🔢 Return {r.returnCount} of 5
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-rose-700 mt-0.5 line-clamp-2">
                        📝 Admin remark: {r.remarks || "—"}
                      </p>
                      {r.rejected_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          📅 Returned on {new Date(r.rejected_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Link to={editRoute(r.kind, r.id)} className="shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        ✏️ Modify &amp; 📤 Resubmit
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* SECTION 2c — PUBLIC DRAFTS (WITHIN 3 DAYS) */}
            <section
              id="public-drafts"
              className="rounded-2xl border border-emerald-200 bg-emerald-50/50 backdrop-blur-sm p-5 shadow-sm scroll-mt-4"
            >
              <SectionTitle
                icon={Inbox}
                title="📥 Public Drafts (Within 3 Days)"
                hint="Citizen submissions the applicant can still edit — you may prepare an office working copy"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                No citizen submissions yet. Once the Public Portal starts accepting applications, they land here for
                3 days while the citizen can still edit them. After 3 days they move automatically to
                📂 Office Applications, citizen editing closes, and you process them like any other application.
              </p>
            </section>

            {/* SECTION 3 — MY WORK QUEUE */}
            <section>
              <SectionTitle icon={ClipboardList} title="📊 My Work Queue" hint="Live counts of your applications" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                <QueueCard label="📝 Drafts" value={counts.drafts} hint="In progress" to="/admin/warish" icon={FileEdit} tone="slate" />
                <QueueCard label="📤 Submitted" value={counts.submitted} hint="With Admin" to="/admin/warish" icon={Send} tone="sky" />
                <QueueCard label="🔄 Returned" value={counts.returned} hint="For modification" to="#returned-for-modification" icon={FileWarning} tone="rose" />
                <QueueCard label="📥 Public Drafts" value={0} hint="Within 3 days" to="#public-drafts" icon={Inbox} tone="amber" />
                <QueueCard label="📋 Completed" value={counts.completed} hint="Issued" to="/admin/warish" icon={FileCheck2} tone="emerald" />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Total applications you created: <span className="font-medium text-foreground">{counts.total}</span> · Approved: {counts.issued}
              </p>
            </section>

            {/* SECTION 4 — WORKFLOW TRACKER */}
            <section className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm p-5 shadow-sm">
              <SectionTitle icon={CircleDot} title="🔗 Workflow Tracker" hint="Citizen intake → DEO → Admin → Public verification" />
              <ol className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-2">
                <WorkflowStep n={1} label="🌍 Citizen / CSC" icon={Users} />
                <WorkflowArrow />
                <WorkflowStep n={2} label="🟢 DEO (You)" icon={ClipboardList} interactive to="/admin/warish" active />
                <WorkflowArrow />
                <WorkflowStep n={3} label="📤 Submitted" icon={Send} interactive to="/admin/warish" />
                <WorkflowArrow />
                <WorkflowStep n={4} label="🟠 Admin Review" icon={FileCheck2} />
              </ol>
              <ol className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2">
                <WorkflowStep n={5} label="🧾 Memo Registration" icon={Stamp} />
                <WorkflowArrow />
                <WorkflowStep n={6} label="📜 Certificate Issued" icon={ShieldCheck} />
                <WorkflowArrow />
                <WorkflowStep n={7} label="🔍 Public Verification" icon={Search} />
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Only the DEO stage is actionable for you. Later stages are status only.
              </p>
            </section>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* SECTION 5 — QUICK TOOLS */}
              <section className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm p-5 shadow-sm">
                <SectionTitle icon={Search} title="🧰 Quick Tools" />
                <div className="mt-3 space-y-2">
                  <ToolLink to="/verify" icon={ShieldCheck} label="🔍 Certificate Verification" />
                  <ToolLink to="/admin/account" icon={ClipboardList} label="⚙️ Profile Settings" />
                  <ToolLink to="/admin/warish" icon={Search} label="📄 Search Application" />
                  <ToolLink icon={QrCode} label="🔳 QR / Barcode Scan" comingSoon />
                  <ToolLink icon={Download} label="⬇️ Download Forms" comingSoon />
                </div>
              </section>

              {/* SECTION 6 — NOTIFICATIONS */}
              <section className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm p-5 shadow-sm">
                <SectionTitle icon={Inbox} title="🔔 Notifications" hint="Recent alerts" />
                <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
                  {notifs.length === 0 && (
                    <li className="text-xs text-muted-foreground">No notifications yet.</li>
                  )}
                  {notifs.slice(0, 6).map((n) => (
                    <li key={n.id} className="rounded-lg border border-border/40 bg-background/60 px-3 py-2">
                      <p className="text-xs font-medium text-foreground">{n.title}</p>
                      {n.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{n.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* SECTION 7 — RECENT ACTIVITY */}
              <section className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm p-5 shadow-sm">
                <SectionTitle icon={ClipboardList} title="📊 Recent Activity" hint="Your latest actions" />
                <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
                  {loadingData && <li className="text-xs text-muted-foreground">Loading…</li>}
                  {!loadingData && recent.length === 0 && activity.length === 0 && (
                    <li className="text-xs text-muted-foreground">No recent activity yet.</li>
                  )}
                  {recent.map((r) => (
                    <li key={`${r.kind}-${r.id}`} className="rounded-lg border border-border/40 bg-background/60 px-3 py-2">
                      <p className="text-xs font-medium text-foreground">
                        {r.kind === "warish" ? "Warish" : "Dependent"} · {r.applicant ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.status ?? "Draft"} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                  {activity.map((a) => (
                    <li key={a.id} className="rounded-lg border border-dashed border-border/40 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        {a.action_type} · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Only saved certificate information is stored — no generated files.
        </p>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SectionTitle({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon size={14} className="text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const toneBg: Record<string, string> = {
  sky: "from-sky-100 to-sky-50 text-sky-700 ring-sky-200",
  violet: "from-violet-100 to-violet-50 text-violet-700 ring-violet-200",
  amber: "from-amber-100 to-amber-50 text-amber-700 ring-amber-200",
  rose: "from-rose-100 to-rose-50 text-rose-700 ring-rose-200",
  emerald: "from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "from-slate-100 to-slate-50 text-slate-700 ring-slate-200",
};

function PrimaryAction({
  to,
  title,
  desc,
  icon: Icon,
  tone,
  badge,
}: {
  to: string;
  title: string;
  desc: string;
  icon: any;
  tone: keyof typeof toneBg;
  badge?: string;
}) {
  const t = toneBg[tone];
  return (
    <Link
      to={to}
      className={`group relative rounded-2xl border border-border/40 bg-gradient-to-br ${t.split(" ").slice(0, 2).join(" ")} ring-1 ${t.split(" ").slice(-1)} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${t.split(" ")[2]}`}>
          <Icon size={18} />
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-foreground border border-border/50">
            {badge}
          </span>
        )}
      </div>
      <h3 className={`mt-3 text-sm font-semibold ${t.split(" ")[2]}`}>{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      <ArrowRight
        size={14}
        className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition ${t.split(" ")[2]}`}
      />
    </Link>
  );
}

function QueueCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  to: string;
  icon: any;
  tone: keyof typeof toneBg;
}) {
  const t = toneBg[tone];
  return (
    <Link
      to={to}
      className={`rounded-xl border border-border/40 bg-gradient-to-br ${t.split(" ").slice(0, 2).join(" ")} ring-1 ${t.split(" ").slice(-1)} p-3 shadow-sm hover:shadow-md transition`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.split(" ")[2]}`}>{label}</p>
        <Icon size={14} className={t.split(" ")[2]} />
      </div>
      <p className={`text-2xl font-bold mt-1 ${t.split(" ")[2]}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Link>
  );
}

function WorkflowStep({
  n,
  label,
  icon: Icon,
  interactive,
  to,
  active,
}: {
  n: number;
  label: string;
  icon: any;
  interactive?: boolean;
  to?: string;
  active?: boolean;
}) {
  const base = `flex-1 rounded-xl border p-3 flex items-center gap-2 transition ${
    active
      ? "border-primary/40 bg-primary/10"
      : interactive
        ? "border-border/60 bg-background hover:bg-primary/5"
        : "border-dashed border-border/50 bg-muted/40"
  }`;
  const content = (
    <>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
          interactive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold truncate ${interactive ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        <Icon size={12} className={interactive ? "text-primary" : "text-muted-foreground"} />
      </div>
    </>
  );
  if (interactive && to) {
    return (
      <Link to={to} className={base}>
        {content}
      </Link>
    );
  }
  return <div className={base}>{content}</div>;
}

function WorkflowArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-muted-foreground">
      <ArrowRight size={14} />
    </div>
  );
}

function ToolLink({
  to,
  icon: Icon,
  label,
  comingSoon,
}: {
  to?: string;
  icon: any;
  label: string;
  comingSoon?: boolean;
}) {
  const cls =
    "flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs transition";
  if (comingSoon) {
    return (
      <div className={`${cls} opacity-60 cursor-not-allowed`}>
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon size={14} /> {label}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Coming soon</span>
      </div>
    );
  }
  return (
    <Link to={to!} className={`${cls} hover:bg-primary/5`}>
      <span className="flex items-center gap-2 text-foreground">
        <Icon size={14} className="text-primary" /> {label}
      </span>
      <ArrowRight size={12} className="text-muted-foreground" />
    </Link>
  );
}
