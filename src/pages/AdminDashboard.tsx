import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollText, Users, Bell, LogOut, ShieldCheck, UserCog, Database, ClipboardCheck, Clock, Activity, FileCheck2, TrendingUp, Zap, RotateCcw, Stamp, Send, Smartphone, Mail, KeyRound, SlidersHorizontal, Home } from "lucide-react";
import { useAuthz, hasPermission, type AppPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { VerifyQuickAction } from "@/components/VerifyQuickAction";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import { AdminSystemStatusWidget } from "@/components/admin/AdminSystemStatusWidget";
import { refetchSchemaCache } from "@/lib/adminDatabaseErrorHandler";
import { toast } from "sonner";

interface CardDef {
  id: string;
  title: string;
  desc: string;
  to: string;
  icon: typeof ScrollText;
  permission?: AppPermission;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
  comingSoon?: boolean;
}

// 🟠 Admin — review & issue only. Admin never creates applications.
const adminCards: CardDef[] = [
  { id: "admin-pending-review", title: "📥 Pending Review", desc: "Applications submitted by DEOs waiting for your review.", to: "/admin/review?kind=warish&filter=waiting", icon: ClipboardCheck },
  { id: "admin-returned-apps", title: "🔄 Returned Applications", desc: "Sent back to the DEO for modification.", to: "/admin/review?kind=warish&filter=returned", icon: RotateCcw },
  { id: "admin-approved-apps", title: "✅ Approved", desc: "Approved and issued certificates register.", to: "/admin/review?kind=warish&filter=approved", icon: FileCheck2 },
  { id: "admin-generate-cert", title: "📜 Generate Certificate", desc: "Produce the certificate for an approved application.", to: "/admin/warish", icon: ScrollText, permission: "warish_certs" },
  { id: "admin-issue-cert", title: "📤 Issue Certificate", desc: "Issued register — Warish and Dependent.", to: "/admin/review?kind=warish&filter=issued", icon: Send },
  { id: "admin-modify-mobile", title: "📱 Modify Mobile Number", desc: "Correct an applicant's mobile number on an application.", to: "/admin/review?kind=warish&action=modify-mobile", icon: Smartphone, comingSoon: true },
  { id: "admin-modify-email", title: "📧 Modify Email Address", desc: "Correct an applicant's email address on an application.", to: "/admin/review?kind=warish&action=modify-email", icon: Mail, comingSoon: true },
  { id: "admin-deo-quotas", title: "⚖️ DEO Quotas & 1/2/3 Certificate Tiers", desc: "Dedicated DEO accounts review: configure 1/2/3 allowed certificate types and daily draft limits.", to: "/admin/deo-quotas", icon: ShieldCheck },
  { id: "admin-profiles-dir", title: "👥 Citizen & Cyber Cafe Directory", desc: "View registered citizens, cyber cafe nodes, and adjust application limits.", to: "/admin/profiles-directory", icon: Users },
  { id: "admin-system-status", title: "🖥️ System Status & Telemetry", desc: "Live database health, connection latency, auth error logs, and storage usage statistics.", to: "/admin/system-status", icon: Activity },
  { id: "admin-notifications", title: "🔔 Notification Centre", desc: "Returns, issues, notices and system alerts.", to: "/admin/notifications", icon: Bell },
  { id: "admin-activity", title: "📊 My Activity", desc: "Your personal activity timeline.", to: "/admin/activity", icon: Activity },
  { id: "admin-account", title: "⚙️ Profile Settings", desc: "Mobile, email, password, language and notifications.", to: "/admin/account", icon: UserCog },
];

// 🔴 Super Admin (Watcher) — govern & manage. Never creates or issues certificates.
const superAdminCards: CardDef[] = [
  { id: "super-system-status", title: "🖥️ System Status & Telemetry", desc: "Live database health, connection latency, auth error logs, and storage usage statistics.", to: "/admin/system-status", icon: Activity },
  { id: "super-deo-tiers-quotas", title: "⚖️ DEO Quotas & 1/2/3 Certificate Tiers", desc: "Dedicated review of all DEO accounts: set 1/2/3 certificate tiers (Warish, Dependent, Linkage), toggle birth digitization, and adjust daily draft quotas.", to: "/admin/deo-quotas", icon: ShieldCheck },
  { id: "super-citizen-cyber-profiles", title: "👥 Citizen & Cyber Cafe Directory", desc: "View registered citizens, cyber cafe nodes, and adjust individual application quotas.", to: "/admin/profiles-directory", icon: Users },
  { id: "super-employees", title: "👥 Employee Management", desc: "Employee IDs, designations, system roles and login methods.", to: "/admin/employees", icon: Users },
  { id: "super-manage-accounts", title: "🛡️ Office Accounts", desc: "Create accounts, change roles, archive employees.", to: "/admin/manage", icon: ShieldCheck },
  { id: "super-credentials", title: "🔑 Credentials", desc: "Reset passwords and control allowed sign-in methods.", to: "/admin/manage", icon: KeyRound },
  { id: "super-notices", title: "📢 Notices", desc: "Create, pin, and expire public notices.", to: "/admin/notices", icon: Bell },
  { id: "super-representatives", title: "🧑‍💼 Elected Representatives", desc: "Maintain the elected representatives register.", to: "/elected-representatives", icon: Users },
  { id: "super-audit-activity", title: "📊 Audit & Activity", desc: "Personal and office-wide activity timeline.", to: "/admin/activity", icon: Activity },
  { id: "super-notifications", title: "🔔 Notification Centre", desc: "Returns, issues, notices, system alerts and public drafts.", to: "/admin/notifications", icon: Bell },
  { id: "super-digitalization-rules", title: "📜 Birth Digitalization Rules", desc: "Deactivate, activate, or modify monthly/daily quota and acceptance schedule.", to: "/admin/digitalization-settings", icon: SlidersHorizontal },
  { id: "super-portal-controls", title: "🎨 Portal & Form Controls", desc: "Party themes (BJP/TMC/CPIM/Congress), form layouts, field toggles, and phone visibility.", to: "/admin/portal-controls", icon: SlidersHorizontal },
  { id: "super-master-data", title: "🗂️ Master Data Center", desc: "Villages, post offices, wards, relations, documents, designations.", to: "/admin/master-data", icon: Database },
  { id: "super-backups", title: "💾 Backups & Restore", desc: "Daily, weekly, monthly snapshots. 12-year retention.", to: "/admin/backups", icon: Database, comingSoon: true },
  { id: "super-account", title: "⚙️ Profile Settings", desc: "Mobile, email, password, language and notifications.", to: "/admin/account", icon: UserCog },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const authz = useAuthz();
  const [stats, setStats] = useState<{
    warishTotal: number;
    dependentTotal: number;
    pendingTotal: number;
    issuedThisMonth: number;
  } | null>(null);
  const [recent, setRecent] = useState<
    { id: string; action_type: string; actor_email: string | null; target_table: string | null; created_at: string }[] | null
  >(null);

  // DEOs get their own tailored dashboard.
  useEffect(() => {
    if (!authz.loading && (authz.isDeo || authz.role === "deo") && !authz.isSuperAdmin) {
      navigate("/admin/deo", { replace: true });
    }
  }, [authz.loading, authz.isDeo, authz.role, authz.isSuperAdmin, navigate]);

  useEffect(() => {
    if (authz.loading) return;
    let cancelled = false;
    (async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const iso = startOfMonth.toISOString().slice(0, 10);
      try {
        const [wTotal, dTotal, wPend, dPend, wMonth, dMonth, act] = await Promise.all([
          supabase.from("warish_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Approved" as any),
          supabase.from("dependent_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Approved" as any),
          supabase.from("warish_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Pending Signature & Memo Registration" as any),
          supabase.from("dependent_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Pending Signature & Memo Registration" as any),
          supabase.from("warish_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Approved" as any).gte("cert_date", iso),
          supabase.from("dependent_certificates" as any).select("id", { count: "exact", head: true }).eq("status", "Approved" as any).gte("cert_date", iso),
          supabase.from("activity_logs" as any).select("id, action_type, actor_email, target_table, created_at").order("created_at", { ascending: false }).limit(6),
        ]);
        if (cancelled) return;
        setStats({
          warishTotal: wTotal.count ?? 0,
          dependentTotal: dTotal.count ?? 0,
          pendingTotal: (wPend.count ?? 0) + (dPend.count ?? 0),
          issuedThisMonth: (wMonth.count ?? 0) + (dMonth.count ?? 0),
        });
        setRecent((act.data as any) ?? []);
      } catch {
        if (!cancelled) {
          setStats({ warishTotal: 0, dependentTotal: 0, pendingTotal: 0, issuedThisMonth: 0 });
          setRecent([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authz.loading]);

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const signOut = async () => {
    await logActivity({ action_type: "auth.signout" });
    await supabase.auth.signOut();
    navigate("/admin", { replace: true });
  };

  const visible = (authz.isSuperAdmin ? superAdminCards : adminCards).filter((c) => {
    if (authz.loading) return false;
    if (c.superAdminOnly) return authz.isSuperAdmin;
    if (c.permission) return hasPermission(authz, c.permission, "view");
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{authz.isSuperAdmin ? "🔴 Super Admin Dashboard" : "🟠 Admin Dashboard"}</h1>
            <p className="text-xs text-muted-foreground">
              Bagula II Gram Panchayat
              {authz.isSuperAdmin && <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/15 text-primary">Super Admin</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const tId = toast.loading("Re-fetching database schema...");
                const res = await refetchSchemaCache();
                toast.dismiss(tId);
                if (res.success) {
                  toast.success("Database schema cache refreshed!");
                } else {
                  toast.error(res.message);
                }
              }}
              title="Re-fetch and synchronize PostgREST schema cache"
              className="gap-1.5 text-xs shadow-xs"
            >
              <Database size={13} className="text-primary" />
              <span className="hidden sm:inline">Sync Schema</span>
            </Button>
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

        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={signOut}
          description="Are you sure you want to sign out of the administrative dashboard?"
        />

        {authz.loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <VerifyQuickAction />

            {/* Stats grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile
                label="📜 Warish Issued"
                value={stats?.warishTotal}
                icon={ScrollText}
                tone="from-sky-100 to-sky-50 text-sky-700 ring-sky-200"
              />
              <StatTile
                label="👨‍👩‍👧 Dependent Issued"
                value={stats?.dependentTotal}
                icon={Users}
                tone="from-violet-100 to-violet-50 text-violet-700 ring-violet-200"
              />
              <StatTile
                label="📥 Pending Review"
                value={stats?.pendingTotal}
                icon={ClipboardCheck}
                tone="from-amber-100 to-amber-50 text-amber-700 ring-amber-200"
                to="/admin/review?kind=warish&tab=Pending%20Signature%20%26%20Memo%20Registration"
              />
              <StatTile
                label="📈 Issued This Month"
                value={stats?.issuedThisMonth}
                icon={TrendingUp}
                tone="from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200"
              />
            </section>

            {/* Quick actions */}
            <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap size={14} className="text-primary" />
                </div>
                <h2 className="text-sm font-semibold">⚡ Quick Actions</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {authz.isSuperAdmin ? (
                  <>
                    <Link to="/admin/employees"><Button size="sm" variant="outline"><Users size={13} className="mr-1.5" />👥 Employees</Button></Link>
                    <Link to="/admin/master-data"><Button size="sm" variant="outline"><Database size={13} className="mr-1.5" />🗂️ Master Data</Button></Link>
                    <Link to="/admin/notices"><Button size="sm" variant="outline"><Bell size={13} className="mr-1.5" />📢 New Notice</Button></Link>
                    <Link to="/admin/account"><Button size="sm" variant="outline"><UserCog size={13} className="mr-1.5" />⚙️ Profile Settings</Button></Link>
                    <Link to="/admin/system-status"><Button size="sm" variant="outline"><Activity size={13} className="mr-1.5 text-primary" />🖥️ System Status</Button></Link>
                  </>
                ) : (
                  <>
                    <Link to="/admin/review?kind=warish&filter=waiting"><Button size="sm" variant="outline"><ClipboardCheck size={13} className="mr-1.5" />📥 Pending Review</Button></Link>
                    <Link to="/admin/review?kind=warish&filter=approved"><Button size="sm" variant="outline"><FileCheck2 size={13} className="mr-1.5" />✅ Approved</Button></Link>
                    <Link to="/admin/review?kind=warish&filter=returned"><Button size="sm" variant="outline"><RotateCcw size={13} className="mr-1.5" />🔄 Returned</Button></Link>
                    <Link to="/admin/account"><Button size="sm" variant="outline"><UserCog size={13} className="mr-1.5" />⚙️ Profile Settings</Button></Link>
                    <Link to="/admin/system-status"><Button size="sm" variant="outline"><Activity size={13} className="mr-1.5 text-primary" />🖥️ System Status</Button></Link>
                  </>
                )}
              </div>
            </section>

            {/* Admin System Status Widget */}
            <AdminSystemStatusWidget />

            <div className="grid sm:grid-cols-2 gap-4">
            {visible.map((c) => {
              if (c.comingSoon) {
                return (
                  <div
                    key={c.id}
                    className="relative rounded-2xl border border-dashed border-border/50 bg-muted/30 p-5 opacity-70 cursor-not-allowed"
                    aria-disabled
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                      <c.icon className="text-muted-foreground" size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-muted-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      <Clock size={10} /> Coming Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={c.id}
                  to={c.to}
                  className="group rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <c.icon className="text-primary" size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </Link>
              );
            })}
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2">
                You don't have access to any modules yet. Ask a Super Admin to grant permissions.
              </p>
            )}
            </div>

            {/* Recent activity */}
            <section className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity size={14} className="text-primary" />
                </div>
                <h2 className="text-sm font-semibold">📊 Recent Activity</h2>
              </div>
              {recent === null ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              ) : (
                <ul className="divide-y divide-border/30">
                  {recent.map((a) => (
                    <li key={a.id} className="py-2 flex items-start gap-2.5">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <FileCheck2 size={13} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.action_type}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {a.actor_email ?? "system"}{a.target_table ? ` · ${a.target_table}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Only saved certificate information is stored — no generated files.
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number | undefined;
  icon: typeof ScrollText;
  tone: string;
  to?: string;
}) {
  const cls = `group rounded-2xl border border-border/40 bg-gradient-to-br ${tone.split(" ").slice(0, 2).join(" ")} p-4 ring-1 ${tone.split(" ").slice(-1)} shadow-sm hover:shadow-md transition`;
  const inner = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${tone.split(" ")[2]}`}>{value ?? "—"}</p>
      </div>
      <div className={`h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center ${tone.split(" ")[2]}`}>
        <Icon size={18} />
      </div>
    </div>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
