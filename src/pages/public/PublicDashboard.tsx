import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  User, FilePlus2, Award, Search, ShieldCheck, Languages,
  AlertCircle, CheckCircle2, HelpCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { comingSoon } from "./PublicShell";
import { listCitizenApplications, type CitizenApplicationRow } from "@/modules/application/api";
import { logoutCitizen } from "@/modules/citizen/citizenAuth";
import { useCitizenSession } from "@/modules/citizen/useCitizenSession";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import ApplicationStatusProgress from "@/components/citizen/ApplicationStatusProgress";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useCitizenApplicationStatusWatcher } from "@/modules/citizen/applicationStatusWatcher";
import { StatusNotificationBanner } from "@/components/citizen/StatusNotificationBanner";
import { StatusNotificationBadge } from "@/components/citizen/StatusNotificationBadge";

const KIND_LABEL: Record<string, string> = {
  warish: "📜 Warish Certificate",
  dependent: "📋 Dependent Certificate",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";

const isEditable = (r: CitizenApplicationRow) =>
  (r.status === "Draft" || r.status === "Returned") &&
  (!r.public_edit_until || new Date(r.public_edit_until) > new Date());

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function PublicDashboard() {
  const navigate = useNavigate();
  const session = useCitizenSession();
  const [rows, setRows] = useState<CitizenApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listCitizenApplications();
        if (active) setRows(data);
      } catch (e) {
        if (active) toast.error(e instanceof Error ? e.message : "Could not load your applications");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const { activeUpdates, dismissUpdate, clearAllUpdates } =
    useCitizenApplicationStatusWatcher(rows, (updated) => setRows(updated));

  const certificates = rows.filter((r) => r.status === "Approved" || Boolean(r.certificate_number));
  const returned = rows.filter((r) => r.status === "Returned");
  const drafts = rows.filter((r) => r.status === "Draft");
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const signOut = async () => {
    try { await logoutCitizen(); } finally { navigate("/public/login"); }
  };

  const openApplication = (r: CitizenApplicationRow) =>
    navigate(`/public/apply/${r.kind}?id=${r.id}`);

  const displayName = (session as { profile?: { first_name?: string } | null })?.profile?.first_name;

  return (
    <div className="min-h-screen relative pb-12">
      <Helmet>
        <title>Citizen Dashboard — Bagula II Gram Panchayat</title>
        <meta name="description" content="Apply for certificates, continue drafts and track your applications with Bagula II Gram Panchayat." />
      </Helmet>
      <div
        className="fixed inset-0 -z-10"
        style={{ background: "linear-gradient(160deg, hsl(30 100% 95%) 0%, hsl(0 0% 100%) 50%, hsl(140 40% 95%) 100%)" }}
      />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-sm shrink-0">
              🏛️
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold truncate">Bagula GP II</span>
              <span className="block text-[11px] text-muted-foreground truncate">
                👋 Welcome{displayName ? `, ${displayName}` : ", Citizen"}
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationCenter variant="compact" tone="dark" />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/public/profile/language")}>
              <Languages size={16} className="mr-1" /> 🌐 বাংলা / EN
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Profile menu"><User size={18} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/public/profile")}>👤 My Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/public/profile/edit")}>✏️ Edit Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/public/profile/password")}>🔑 Change Password</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/public/profile/language")}>🌐 Language Preference</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSignOutDialog(true)}>🚪 Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={signOut}
        description="Are you sure you want to sign out of the citizen portal?"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🏡 Citizen Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">নাগরিক ড্যাশবোর্ড — Your administrative services in one place</p>
        </div>

        {/* Live Status Updates Alert Banner */}
        {activeUpdates.length > 0 && (
          <StatusNotificationBanner
            alerts={activeUpdates}
            onDismiss={dismissUpdate}
            onClearAll={clearAllUpdates}
            onViewApplication={(id, kind) => navigate(`/public/apply/${kind}?id=${id}`)}
          />
        )}

        <Section title="⚡ Attention Required (প্রয়োজনীয় পদক্ষেপ)">
          <div className="grid sm:grid-cols-3 gap-3">
            {returned.length === 0 && drafts.length === 0 && activeUpdates.length === 0 && (
              <Card className="p-4 space-y-1.5">
                <CheckCircle2 size={18} className="text-primary" />
                <p className="text-sm font-semibold">✨ No pending actions</p>
                <p className="text-xs text-muted-foreground">You are all caught up.</p>
              </Card>
            )}
            {returned.map((r) => (
              <Card key={r.id} className="p-4 space-y-1.5 cursor-pointer hover:shadow-md transition border-amber-300 bg-amber-50/20"
                onClick={() => openApplication(r)}>
                <AlertCircle size={18} className="text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">⚠️ Correction needed</p>
                <p className="text-xs text-muted-foreground">
                  {KIND_LABEL[r.kind]} — {r.rejection_reason ?? "Please review remarks and resubmit."}
                </p>
              </Card>
            ))}
            {drafts.map((r) => (
              <Card key={r.id} className="p-4 space-y-1.5 cursor-pointer hover:shadow-md transition"
                onClick={() => openApplication(r)}>
                <FilePlus2 size={18} className="text-primary" />
                <p className="text-sm font-semibold">📝 Unfinished application</p>
                <p className="text-xs text-muted-foreground">
                  {KIND_LABEL[r.kind]} — started {fmt(r.created_at)}
                </p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="📝 Apply for a Certificate (শংসাপত্রের আবেদন)">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button type="button" onClick={() => navigate("/public/apply/warish")}
              className="text-left rounded-2xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
              <FilePlus2 size={22} className="text-primary mb-2" />
              <p className="text-sm font-semibold leading-tight">📜 Warish Certificate</p>
              <p className="text-xs text-muted-foreground mt-0.5">ওয়ারিশ শংসাপত্র (Legal Heir)</p>
            </button>
            <button type="button" onClick={() => navigate("/public/apply/dependent")}
              className="text-left rounded-2xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
              <FilePlus2 size={22} className="text-primary mb-2" />
              <p className="text-sm font-semibold leading-tight">📋 Dependent Certificate</p>
              <p className="text-xs text-muted-foreground mt-0.5">নির্ভরশীল শংসাপত্র</p>
            </button>
            <button type="button" onClick={() => navigate("/public/apply/linkage")}
              className="text-left rounded-2xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
              <FilePlus2 size={22} className="text-primary mb-2" />
              <p className="text-sm font-semibold leading-tight">🗳️ Family Linkage</p>
              <p className="text-xs text-muted-foreground mt-0.5">ভোটার সংযোগ (Linkage)</p>
            </button>
            <button type="button" onClick={() => navigate("/verify")}
              className="text-left rounded-2xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition">
              <ShieldCheck size={22} className="text-primary mb-2" />
              <p className="text-sm font-semibold leading-tight">🔍 Verify Certificate</p>
              <p className="text-xs text-muted-foreground mt-0.5">শংসাপত্র যাচাই</p>
            </button>
          </div>
        </Section>

        <Section title="📑 My Applications (আমার আবেদনসমূহ)">
          {loading ? (
            <Card className="p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> ⏳ Loading your applications…
            </Card>
          ) : rows.length === 0 ? (
            <Card className="p-6 text-center space-y-3">
              <Search className="mx-auto text-muted-foreground" size={26} />
              <p className="text-sm font-medium">📭 No applications yet</p>
              <p className="text-xs text-muted-foreground">Start by applying for a Warish or Dependent certificate above.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => {
                const updateAlert = activeUpdates.find((u) => u.id === r.id);
                return (
                  <Card key={r.id} className={`p-4 space-y-3 hover:shadow-md transition ${updateAlert ? "ring-2 ring-primary/30 border-primary/50" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{KIND_LABEL[r.kind]}</p>
                          <StatusNotificationBadge
                            status={r.status}
                            isRecentlyUpdated={Boolean(updateAlert)}
                            oldStatus={updateAlert?.oldStatus}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.memo_no ? `📑 Memo: ${r.memo_no}` : r.certificate_number ? `🎖️ Cert #: ${r.certificate_number}` : "⏳ Tracking ID pending"} · 📅 Applied: {fmt(r.submitted_at ?? r.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {updateAlert && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => dismissUpdate(r.id)}
                          >
                            ✓ Dismiss
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={isEditable(r) ? "default" : "outline"}
                          onClick={() => openApplication(r)}
                        >
                          {isEditable(r) ? "✏️ Continue Draft" : "👁️ View Details"}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <ApplicationStatusProgress
                        kind={r.kind}
                        appId={r.id}
                        status={r.status}
                        submittedAt={r.submitted_at}
                        createdAt={r.created_at}
                        rejectionReason={r.rejection_reason}
                        returnCount={r.return_count ?? 0}
                        showTimelineToggle={true}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="🎖️ My Certificates (আমার শংসাপত্রসমূহ)">
          {certificates.length === 0 ? (
            <Card className="p-6 text-center space-y-2">
              <Award className="mx-auto text-muted-foreground" size={28} />
              <p className="text-sm font-medium">📜 No certificates issued yet</p>
              <p className="text-xs text-muted-foreground">Approved certificates will appear here once issued by the Gram Panchayat.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {certificates.map((c) => (
                <Card key={c.id} className="p-4 flex items-center gap-3">
                  <Award size={18} className="text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{KIND_LABEL[c.kind]}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.memo_no ?? c.certificate_number}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/verify?id=${encodeURIComponent(c.certificate_number || c.memo_no || "")}`)}>
                    🔍 Verify
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section title="ℹ️ Help Centre (সহায়তা কেন্দ্র)">
          <div className="grid grid-cols-3 gap-3">
            {[
              { title: "❓ FAQ", key: "FAQ" },
              { title: "📞 Contact GP", key: "Contact GP" },
              { title: "🤝 Support", key: "Support" },
            ].map((h) => (
              <button key={h.key} type="button" onClick={() => comingSoon(h.key)}
                className="rounded-2xl border bg-card p-4 text-center hover:shadow-md transition">
                <HelpCircle size={18} className="mx-auto text-primary mb-1.5" />
                <p className="text-sm font-medium">{h.title}</p>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
