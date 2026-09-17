import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LogOut, CheckCircle2, XCircle, RotateCcw, Trash2, AlertCircle,
  Eye, Search, ClipboardList, Clock, FileCheck2, FileX2, Stamp, CalendarCheck2, Home,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthz } from "@/lib/permissions";
import { loadCertificateAudit, type CertAuditEntry } from "@/lib/certificateArchive";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import { useMasterData } from "@/lib/masterData";

type Kind = "warish" | "dependent" | "linkage";
type Filter =
  | "waiting"
  | "returned"
  | "approved"
  | "rejected"
  | "issued"
  | "archived";

type Row = {
  id: string;
  verification_id: string | null;
  status: string;
  memo_no: string | null;
  memo_serial: number | null;
  cert_date: string | null;
  issue_date: string | null;
  applicant_name: string | null;
  deceased_name?: string | null;
  village?: string | null;
  data?: any;
  applicant_details?: any;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  document_mode?: string | null;
  archived_at?: string | null;
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "waiting",  label: "📥 Waiting" },
  { key: "returned", label: "🔄 Returned" },
  { key: "approved", label: "✅ Approved" },
  { key: "issued",   label: "📜 Issued" },
  { key: "rejected", label: "❌ Rejected" },
  { key: "archived", label: "📦 Archived" },
];

const RETURN_TAG = "[RETURN]";
const MAX_RETURNS = 5;

// Map a row to a status badge label. Uses the existing schema — no new columns.
function displayStatus(r: Row): { label: string; tone: string } {
  if (r.archived_at) return { label: "Archived", tone: "bg-zinc-200 text-zinc-700" };
  if (r.status === "Rejected") {
    if ((r.rejection_reason ?? "").startsWith(RETURN_TAG))
      return { label: "🔄 Returned", tone: "bg-orange-100 text-orange-700" };
    return { label: "❌ Rejected", tone: "bg-red-100 text-red-700" };
  }
  if (r.status === "Approved") {
    return r.memo_no
      ? { label: "Issued", tone: "bg-primary/15 text-primary" }
      : { label: "✅ Approved", tone: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Waiting", tone: "bg-blue-100 text-blue-700" };
}

export default function AdminReview() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const authz = useAuthz();

  const kind = ((params.get("kind") as Kind) || "warish") as Kind;
  const rawFilter = params.get("filter");
  const filter: Filter = rawFilter === "ready_memo" ? "approved" : ((rawFilter as Filter) || "waiting");
  const q = params.get("q") ?? "";

  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Record<Filter, number>>({
    waiting: 0, returned: 0, approved: 0, rejected: 0, issued: 0, archived: 0,
  });
  const [issuedToday, setIssuedToday] = useState(0);
  const [approveTarget, setApproveTarget] = useState<Row | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [returnTarget, setReturnTarget] = useState<Row | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Row | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchInput, setSearchInput] = useState(q);

  const table = kind === "warish" ? "warish_certificates" : kind === "linkage" ? "linkage_certificates" : "dependent_certificates";

  const loadCounts = useCallback(async () => {
    const { data } = await supabase
      .from(table as any)
      .select("status, memo_no, rejection_reason, archived_at, issue_date")
      .limit(5000);
    const list = (data ?? []) as any[];
    const c: Record<Filter, number> = {
      waiting: 0, returned: 0, approved: 0, rejected: 0, issued: 0, archived: 0,
    };
    const today = new Date().toISOString().slice(0, 10);
    let it = 0;
    for (const r of list) {
      if (r.archived_at) { c.archived++; continue; }
      if (r.status === "Rejected") {
        if ((r.rejection_reason ?? "").startsWith(RETURN_TAG)) c.returned++;
        else c.rejected++;
        continue;
      }
      if (r.status === "Approved") {
        c.approved++;
        if (r.memo_no) { c.issued++; if (r.issue_date === today) it++; }
        continue;
      }
      c.waiting++;
    }
    setCounts(c);
    setIssuedToday(it);
  }, [table]);

  const load = useCallback(async () => {
    setRows(null);
    try { await supabase.rpc("archive_expired_rejections"); } catch { /* ignore */ }

    const cols: string =
      kind === "warish"
        ? "id, verification_id, status, memo_no, memo_serial, cert_date, issue_date, applicant_name, deceased_name, village, data, applicant_details, created_by, created_at, updated_at, rejected_at, rejection_reason, document_mode, archived_at"
        : "id, verification_id, status, memo_no, memo_serial, cert_date, issue_date, applicant_name, village, data, applicant_details, created_by, created_at, updated_at, rejected_at, rejection_reason, document_mode, archived_at";

    let query = supabase.from(table as any).select(cols).order("created_at", { ascending: false }).limit(500);

    // Server-side filter based on canonical filter → DB status
    switch (filter) {
      case "waiting":
        query = query.eq("status", "Pending Signature & Memo Registration").is("archived_at", null);
        break;
      case "returned":
        query = query.eq("status", "Rejected").is("archived_at", null).like("rejection_reason", `${RETURN_TAG}%`);
        break;
      case "rejected":
        query = query.eq("status", "Rejected").is("archived_at", null).not("rejection_reason", "like", `${RETURN_TAG}%`);
        break;
      case "approved":
        query = query.eq("status", "Approved").is("archived_at", null);
        break;
      case "issued":
        query = query.eq("status", "Approved").not("memo_no", "is", null).is("archived_at", null);
        break;
      case "archived":
        query = query.not("archived_at", "is", null);
        break;
    }

    const { data, error } = await query;
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows((data ?? []) as unknown as Row[]);
  }, [kind, filter, table]);

  useEffect(() => { load(); loadCounts(); }, [load, loadCounts]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const details = { ...(r.applicant_details ?? {}), ...(r.data ?? {}) };
      const mobile = String(details.mobile ?? details.phone ?? details.contact ?? "");
      const hay = [
        r.verification_id, r.memo_no, r.applicant_name, r.deceased_name,
        r.village, mobile, r.status, kind, r.issue_date, r.created_at,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, kind]);

  const setKind = (k: Kind) => setParams({ kind: k, filter, q });
  const setFilter = (f: Filter) => setParams({ kind, filter: f, q });
  const applySearch = (v: string) => setParams({ kind, filter, q: v });

  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin", { replace: true });
  };

  const overviewCards: { key: Filter | "issued_today"; label: string; icon: any; value: number; tone: string }[] = [
    { key: "waiting",      label: "📥 Waiting for Review", icon: Clock,          value: counts.waiting,    tone: "text-blue-700 bg-blue-50" },
    { key: "returned",     label: "🔄 Returned",           icon: RotateCcw,      value: counts.returned,   tone: "text-orange-700 bg-orange-50" },
    { key: "approved",     label: "✅ Approved",           icon: FileCheck2,     value: counts.approved,   tone: "text-emerald-700 bg-emerald-50" },
    { key: "rejected",     label: "❌ Rejected",           icon: FileX2,         value: counts.rejected,   tone: "text-red-700 bg-red-50" },
    { key: "issued_today", label: "📤 Issued Today",       icon: CalendarCheck2, value: issuedToday,       tone: "text-primary bg-primary/10" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              📋 Admin Review Workspace
            </h1>
            <p className="text-xs text-muted-foreground">
              Review DEO submissions, verify documents, register memos, and issue certificates.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link to={authz.isDeo && !authz.isAdmin ? "/admin/deo" : "/admin/dashboard"}>
              <Button variant="outline" size="sm" className="font-medium">
                <Home size={14} className="mr-1.5 text-primary" />
                🏠 Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setShowSignOutDialog(true)}>
              <LogOut size={14} className="mr-1" />
              🚪 Sign out
            </Button>
          </div>
        </div>

        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={signOut}
          description="Are you sure you want to sign out of the Admin Review Workspace?"
        />

        {/* Kind tabs */}
        <div className="inline-flex rounded-xl border border-border/40 bg-white/70 p-1 text-xs">
          {(["warish", "dependent", "linkage"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize flex items-center gap-1.5 ${
                kind === k ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "warish" ? "📜 Warish Certificate" : k === "linkage" ? "🗳️ Linkage Certificate" : "👤 Dependent Certificate"}
            </button>
          ))}
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {overviewCards.map((c) => {
            const Icon = c.icon;
            const clickable = c.key !== "issued_today";
            return (
              <button
                key={c.key}
                onClick={() => clickable && setFilter(c.key as Filter)}
                disabled={!clickable}
                className={`text-left rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm p-3 transition ${
                  clickable ? "hover:shadow-md hover:border-primary/40" : ""
                } ${filter === c.key ? "ring-2 ring-primary/60" : ""}`}
              >
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${c.tone}`}>
                  <Icon size={16} />
                </div>
                <div className="mt-2 text-2xl font-bold leading-none">{c.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{c.label}</div>
              </button>
            );
          })}
        </div>

        {/* Search + quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applySearch(searchInput); }}
              onBlur={() => applySearch(searchInput)}
              placeholder="Search Application ID, Applicant Name, Mobile, Memo, Status, Date…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border/50 bg-white/80"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full border ${
                  filter === f.key
                    ? "bg-foreground text-background border-foreground"
                    : "border-border/40 bg-white/70 hover:bg-muted/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {rows === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {filtered && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No applications match this view.</p>
        )}

        <div className="space-y-2">
          {(filtered ?? []).map((r) => {
            const s = displayStatus(r);
            const isReturned = r.status === "Rejected" && (r.rejection_reason ?? "").startsWith(RETURN_TAG);
            const cleanReason = isReturned
              ? (r.rejection_reason ?? "").slice(RETURN_TAG.length).trim()
              : r.rejection_reason;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-sm px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs">{r.verification_id ?? "—"}</span>
                    <Badge className={`text-[10px] ${s.tone}`}>{s.label}</Badge>
                    {r.memo_no && <span className="font-mono text-[11px] text-muted-foreground">{r.memo_no}</span>}
                  </div>
                  <div className="text-sm font-medium">
                    {r.applicant_name || "—"}
                    {r.deceased_name ? ` — heir of ${r.deceased_name}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Drafted {new Date(r.created_at).toLocaleString()}
                    {r.rejected_at && ` · ${isReturned ? "Returned" : "Rejected"} ${new Date(r.rejected_at).toLocaleString()}`}
                    {r.village ? ` · ${r.village}` : ""}
                  </div>
                  {cleanReason && (
                    <div className={`text-xs mt-1 ${isReturned ? "text-orange-700" : "text-red-700"}`}>
                      {isReturned ? "Return remarks: " : "Reason: "}{cleanReason}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReviewTarget(r)}>
                    <Eye size={14} className="mr-1" /> 👁️ Review
                  </Button>
                  {(filter === "waiting" || (filter === "returned" && r.status !== "Rejected")) && (
                    <>
                      <Button size="sm" onClick={() => setApproveTarget(r)}>
                        <CheckCircle2 size={14} className="mr-1" /> ✅ Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReturnTarget(r)}>
                        <RotateCcw size={14} className="mr-1" /> 🔄 Return
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectTarget(r)}>
                        <XCircle size={14} className="mr-1" /> ❌ Reject
                      </Button>
                    </>
                  )}
                  {filter === "waiting" && null}
                  {(filter === "rejected" || filter === "returned" || filter === "archived") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setRestoreTarget(r)}>
                        <RotateCcw size={14} className="mr-1" /> ♻️ Restore
                      </Button>
                      {authz.isSuperAdmin && filter !== "archived" && (
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(r)}>
                          <Trash2 size={14} className="mr-1" /> 🗑️ Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Returned applications go back to the DEO for correction. Rejected records auto-archive after 30 days. Only Super Admins may permanently delete rejected drafts.
        </p>
      </div>

      <ReviewDetailDialog
        kind={kind}
        row={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onApprove={(r) => { setReviewTarget(null); setApproveTarget(r); }}
        onReturn={(r) => { setReviewTarget(null); setReturnTarget(r); }}
        onReject={(r) => { setReviewTarget(null); setRejectTarget(r); }}
      />

      <ApproveDialog
        kind={kind}
        row={approveTarget}
        onClose={() => setApproveTarget(null)}
        onDone={() => { load(); loadCounts(); }}
        busy={busy}
        setBusy={setBusy}
      />

      <ReturnDialog
        kind={kind}
        row={returnTarget}
        onClose={() => setReturnTarget(null)}
        onDone={() => { load(); loadCounts(); }}
        busy={busy}
        setBusy={setBusy}
      />

      <RejectDialog
        kind={kind}
        row={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onDone={() => { load(); loadCounts(); }}
        busy={busy}
        setBusy={setBusy}
      />

      <AlertDialog open={!!restoreTarget} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this record?</AlertDialogTitle>
            <AlertDialogDescription>
              The record will return to <strong>Waiting for Review</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                if (!restoreTarget) return;
                setBusy(true);
                const { error } = await supabase.rpc("restore_certificate", { _kind: kind, _cert_id: restoreTarget.id });
                setBusy(false);
                if (error) { toast.error(error.message); return; }
                toast.success("Restored to Waiting for Review.");
                setRestoreTarget(null);
                load(); loadCounts();
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle size={18} /> Permanently delete draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the record from the Digital Administrative Register. This action is logged and cannot be undone.
              Verification ID: <span className="font-mono">{deleteTarget?.verification_id}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                if (!deleteTarget) return;
                setBusy(true);
                const { error } = await supabase.rpc("permanently_delete_rejected", { _kind: kind, _cert_id: deleteTarget.id });
                setBusy(false);
                if (error) { toast.error(error.message); return; }
                toast.success("Record permanently deleted.");
                setDeleteTarget(null);
                load(); loadCounts();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Review Detail Dialog ---------- */

function ReviewDetailDialog({
  kind, row, onClose, onApprove, onReturn, onReject,
}: {
  kind: Kind;
  row: Row | null;
  onClose: () => void;
  onApprove: (r: Row) => void;
  onReturn: (r: Row) => void;
  onReject: (r: Row) => void;
}) {
  const [audit, setAudit] = useState<CertAuditEntry[] | null>(null);
  const [deo, setDeo] = useState<{ email: string | null; display_name: string | null } | null>(null);

  useEffect(() => {
    if (!row) { setAudit(null); setDeo(null); return; }
    loadCertificateAudit(kind, row.id).then(setAudit).catch(() => setAudit([]));
    if (row.created_by) {
      supabase
        .from("admin_profiles")
        .select("email, display_name")
        .eq("user_id", row.created_by)
        .maybeSingle()
        .then(({ data }) => setDeo((data as any) ?? null));
    } else {
      setDeo(null);
    }
  }, [row, kind]);

  if (!row) return null;
  const s = displayStatus(row);
  const details = { ...(row.applicant_details ?? {}), ...(row.data ?? {}) } as Record<string, any>;
  const isReturned = row.status === "Rejected" && (row.rejection_reason ?? "").startsWith(RETURN_TAG);
  const canAct = row.status === "Pending Signature & Memo Registration" && !row.archived_at;

  const timeline: { label: string; at?: string | null; by?: string | null; note?: string | null; done: boolean }[] = [
    { label: "Citizen / CSC application", done: true, at: null },
    { label: "DEO draft created", done: true, at: row.created_at, by: deo?.email ?? deo?.display_name ?? null },
    {
      label: "Submitted for Admin Review",
      done: true,
      at: row.updated_at ?? row.created_at,
      by: deo?.email ?? null,
    },
    ...(isReturned
      ? [{ label: "Returned to DEO", done: true, at: row.rejected_at, note: (row.rejection_reason ?? "").slice(RETURN_TAG.length).trim() }]
      : []),
    {
      label: "Admin Review",
      done: row.status !== "Pending Signature & Memo Registration",
      at: row.status === "Approved" || row.status === "Rejected" ? row.updated_at : null,
    },
    { label: "Memo Registered", done: !!row.memo_no, at: row.memo_no ? row.issue_date : null, note: row.memo_no ?? null },
    { label: "Certificate Issued", done: !!row.memo_no && row.status === "Approved", at: row.issue_date },
    { label: "Public Verification available", done: !!row.verification_id && row.status === "Approved" && !row.archived_at, note: row.verification_id ?? null },
  ];

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Review Application
            <Badge className={`text-[10px] ${s.tone}`}>{s.label}</Badge>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{row.verification_id ?? row.id}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <Section title="👤 Applicant Details">
              <KV k="Name" v={row.applicant_name} />
              {row.deceased_name && <KV k="Deceased" v={row.deceased_name} />}
              <KV k="Village" v={row.village} />
              <KV k="Mobile" v={details.mobile ?? details.phone ?? details.contact} />
              <KV k="Aadhaar (last 4)" v={details.aadhaar_last4 ?? details.aadhaar?.slice?.(-4)} />
              <KV k="Address" v={details.address} />
            </Section>

            <Section title="📄 Application Details">
              <KV k="Type" v={kind === "warish" ? "📜 Warish Certificate" : "👤 Dependent Certificate"} />
              <KV k="Application Date" v={row.cert_date ?? row.created_at?.slice(0, 10)} />
              <KV k="Memo No." v={row.memo_no} />
              <KV k="Issue Date" v={row.issue_date} />
              <KV k="Department" v={(row as any).department ?? details.department} />
            </Section>

            <Section title="💻 DEO Details">
              <KV k="Drafted by" v={deo?.display_name ?? deo?.email ?? row.created_by ?? "—"} />
              <KV k="Drafted on" v={new Date(row.created_at).toLocaleString()} />
              <KV k="Last updated" v={row.updated_at ? new Date(row.updated_at).toLocaleString() : "—"} />
            </Section>

            <Section title="📎 Uploaded Documents">
              {row.document_mode === 'DOCUMENT_ENGINE' ? (
                <AdminDocumentList appId={row.id} />
              ) : (
                <LegacyDocsList details={details} />
              )}
            </Section>

            <Section title="🔍 Verification Notes" full>
              {isReturned && (
                <div className="p-2 rounded-md bg-orange-50 text-orange-800 mb-2">
                  🔄 Previously returned: {(row.rejection_reason ?? "").slice(RETURN_TAG.length).trim() || "—"}
                </div>
              )}
              {!isReturned && row.rejection_reason && (
                <div className="p-2 rounded-md bg-red-50 text-red-800 mb-2">❌ Rejection reason: {row.rejection_reason}</div>
              )}
              <div className="text-muted-foreground">
                Verify uploaded documents against the applicant details above before approving.
              </div>
            </Section>

            <Section title="⏱️ Timeline" full>
              <ol className="space-y-2">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full ${t.done ? "bg-primary" : "bg-muted"}`} />
                    <div className="flex-1">
                      <div className={`font-medium ${t.done ? "" : "text-muted-foreground"}`}>{t.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.at ? new Date(t.at).toLocaleString() : "Pending"}
                        {t.by ? ` · ${t.by}` : ""}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {audit && audit.length > 0 && (
                <div className="mt-3 border-t pt-2">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">Audit trail</div>
                  <ul className="space-y-1">
                    {audit.map((a) => (
                      <li key={a.id} className="text-[11px]">
                        <span className="font-mono uppercase">{a.action}</span> · {new Date(a.created_at).toLocaleString()} · {a.actor_email ?? "system"}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Link to={`/${kind === "warish" ? "warish-certificate" : kind === "linkage" ? "linkage-certificate" : "dependent-certificate"}?load=${row.id}`}>
            <Button variant="outline">📄 Open Full Form</Button>
          </Link>
          {canAct && (
            <>
              <Button variant="outline" onClick={() => onReturn(row)}>
                <RotateCcw size={14} className="mr-1" /> 🔄 Return
              </Button>
              <Button variant="destructive" onClick={() => onReject(row)}>
                <XCircle size={14} className="mr-1" /> ❌ Reject
              </Button>
              <Button onClick={() => onApprove(row)}>
                <CheckCircle2 size={14} className="mr-1" /> ✅ Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`rounded-lg border border-border/40 p-3 bg-white/70 ${full ? "md:col-span-2" : ""}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-28 shrink-0">{k}</span>
      <span className="font-medium break-words">{String(v)}</span>
    </div>
  );
}

import AdminDocumentList from "./AdminDocumentList";

function LegacyDocsList({ details }: { details: Record<string, any> }) {
  const atts = details.__wizard?.attachments?.items || [];
  if (atts.length === 0) return <div className="text-muted-foreground">No documents attached.</div>;
  return (
    <ul className="space-y-1">
      {atts.map((d: any, i: number) => (
        <li key={i} className="flex items-center gap-2">
          {d.provided ? "✅" : "❌"} {d.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Approve / Reject / Return dialogs ---------- */

async function fetchNextMemoSerial(year: number): Promise<number> {
  try {
    const [wRes, dRes, seqRes] = await Promise.all([
      supabase
        .from("warish_certificates")
        .select("memo_serial, issue_date, cert_date")
        .not("memo_serial", "is", null),
      supabase
        .from("dependent_certificates")
        .select("memo_serial, issue_date, cert_date")
        .not("memo_serial", "is", null),
      supabase
        .from("certificate_sequences")
        .select("last_value")
        .eq("sequence_year", year)
        .maybeSingle(),
    ]);

    let maxSerial = 0;
    const processRows = (rows: any[] | null) => {
      if (!rows) return;
      for (const r of rows) {
        const d = r.issue_date || r.cert_date;
        const itemYear = d ? new Date(d).getFullYear() : null;
        if (!itemYear || itemYear === year) {
          if (typeof r.memo_serial === "number" && r.memo_serial > maxSerial) {
            maxSerial = r.memo_serial;
          }
        }
      }
    };

    processRows(wRes.data as any);
    processRows(dRes.data as any);

    const seqVal = seqRes.data?.last_value ?? 0;
    return Math.max(maxSerial, seqVal) + 1;
  } catch (err) {
    console.error("Error computing next memo serial:", err);
    return 1;
  }
}

function ApproveDialog({
  kind, row, onClose, onDone, busy, setBusy,
}: {
  kind: Kind; row: Row | null; onClose: () => void; onDone: () => void; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [memoYear, setMemoYear] = useState<number>(currentYear);
  const [memoSerial, setMemoSerial] = useState<string>("");
  const [autoSerial, setAutoSerial] = useState<number | null>(null);
  const [loadingSerial, setLoadingSerial] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("Documents verified. Application in order.");

  const isLegacy = memoYear < 2026;

  // Load next available serial dynamically for the selected year
  useEffect(() => {
    if (!row) return;
    let active = true;
    setLoadingSerial(true);
    fetchNextMemoSerial(memoYear).then((next) => {
      if (!active) return;
      setAutoSerial(next);
      setLoadingSerial(false);
    });
    return () => { active = false; };
  }, [row, memoYear]);

  useEffect(() => {
    if (row) {
      setMemoYear(currentYear);
      setMemoSerial("");
      setShowManualOverride(false);
      setIssueDate(new Date().toISOString().slice(0, 10));
      setRemarks("Documents verified. Application in order.");
    }
  }, [row, currentYear]);

  const effectiveSerial = showManualOverride && memoSerial.trim()
    ? parseInt(memoSerial, 10)
    : (isLegacy ? (parseInt(memoSerial, 10) || autoSerial) : autoSerial);

  const displayMemoNo = effectiveSerial
    ? `${effectiveSerial}/BGL-II/${memoYear}`
    : (loadingSerial ? "Assigning next serial…" : `…/BGL-II/${memoYear}`);

  const submit = async () => {
    if (!row) return;
    if (!issueDate) { toast.error("Issue date required"); return; }
    if (!remarks.trim()) { toast.error("Approval remarks are required"); return; }

    if (isLegacy && showManualOverride) {
      const n = parseInt(memoSerial, 10);
      if (!n || n <= 0) { toast.error("Enter a valid serial number for legacy year"); return; }
    }

    setBusy(true);
    const chosenSerial = showManualOverride && memoSerial.trim()
      ? parseInt(memoSerial, 10)
      : (autoSerial || null);

    const { data, error } = await supabase.rpc("approve_certificate_v2", {
      _kind: kind,
      _cert_id: row.id,
      _memo_serial: chosenSerial,
      _memo_year: memoYear,
      _issue_date: issueDate,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("Duplicate") ? error.message : `Approval failed: ${error.message}`);
      return;
    }
    toast.success(`Approved as ${(data as any)?.memo_no || displayMemoNo}`);
    onClose();
    onDone();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✅ Approve &amp; Register Memo
          </DialogTitle>
          <DialogDescription>
            Issue the official Memo Number for <span className="font-mono">{row?.verification_id}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Memo Year</label>
            <select
              value={memoYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10) || currentYear;
                setMemoYear(y);
                if (y >= 2026) setShowManualOverride(false);
              }}
              className="w-full px-3 py-2 border rounded-md text-xs bg-background"
            >
              {[2026, 2027, 2028, 2029, 2030, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                <option key={y} value={y}>
                  {y} {y === 2026 ? "(Current Year — Auto Register)" : y < 2026 ? "(Legacy Archive)" : "(Future Year)"}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-generated Memo Banner (No manual intervention needed for 2026) */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                <Stamp size={14} className="text-emerald-700" />
                Assigned Memo Number
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ⚡ Auto-Generated
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-950 tracking-wide">
              {displayMemoNo}
            </div>
            <p className="text-[11px] text-emerald-700">
              {isLegacy
                ? `Historical register for ${memoYear}. Auto-calculated or enter serial manually below.`
                : `Digital Register for ${memoYear}. Serial auto-assigned with zero manual intervention.`}
            </p>
          </div>

          {/* Legacy or optional custom serial input */}
          {isLegacy && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 space-y-1.5">
              <label className="block text-xs font-medium text-amber-900">Legacy Serial Number (Optional)</label>
              <input
                type="number"
                min={1}
                value={memoSerial}
                onChange={(e) => setMemoSerial(e.target.value)}
                placeholder={`Auto: ${autoSerial ?? 1}`}
                className="w-full px-3 py-2 border rounded-md font-mono text-xs bg-background"
              />
              <p className="text-[11px] text-amber-700">
                Leave blank to use next auto serial, or enter manual paper register serial.
              </p>
            </div>
          )}

          {!isLegacy && !showManualOverride && (
            <button
              type="button"
              onClick={() => setShowManualOverride(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground underline block"
            >
              + Advanced: Customize serial number manually
            </button>
          )}

          {showManualOverride && !isLegacy && (
            <div className="p-3 rounded-lg border border-muted bg-muted/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium">Custom Serial Number</label>
                <button
                  type="button"
                  onClick={() => { setShowManualOverride(false); setMemoSerial(""); }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Revert to Auto
                </button>
              </div>
              <input
                type="number"
                min={1}
                value={memoSerial}
                onChange={(e) => setMemoSerial(e.target.value)}
                placeholder={String(autoSerial ?? 1)}
                className="w-full px-3 py-2 border rounded-md font-mono text-xs bg-background"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Approval remarks *</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Documents verified. Application in order."
              className="w-full px-3 py-2 border rounded-md text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>❌ Cancel</Button>
          <Button onClick={submit} disabled={busy}>✅ Approve &amp; Issue Memo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  kind, row, onClose, onDone, busy, setBusy,
}: {
  kind: Kind; row: Row | null; onClose: () => void; onDone: () => void; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const { items: masterReasons } = useMasterData("rejection_reason");
  useEffect(() => { if (row) setReason(""); }, [row]);

  const submit = async () => {
    if (!row) return;
    if (!reason.trim()) { toast.error("Rejection remarks are required"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("reject_certificate_v2", {
      _kind: kind, _cert_id: row.id, _reason: reason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application rejected.");
    onClose(); onDone();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">❌ Reject Application?</DialogTitle>
          <DialogDescription>
            Rejection permanently closes the workflow. Use <strong>Return</strong> if the DEO should correct and resubmit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium">Rejection remarks *</label>
            <span className="text-[10px] text-muted-foreground">Select master reason or type below</span>
          </div>

          {masterReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-red-50/50 border border-red-100 max-h-32 overflow-y-auto">
              {masterReasons.map((mr) => (
                <button
                  key={mr.id}
                  type="button"
                  onClick={() => setReason(mr.label)}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-red-200 bg-white hover:bg-red-100 text-red-900 transition-colors text-left"
                >
                  {mr.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="e.g. Verification could not be completed; duplicate application."
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>❌ Reject Application</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({
  kind, row, onClose, onDone, busy, setBusy,
}: {
  kind: Kind; row: Row | null; onClose: () => void; onDone: () => void; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const { items: masterReasons } = useMasterData("rejection_reason");
  useEffect(() => { if (row) setRemarks(""); }, [row]);

  const [priorReturns, setPriorReturns] = useState(0);

  // Count how many times this application has already been returned.
  useEffect(() => {
    if (!row) { setPriorReturns(0); return; }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("certificate_audit_logs")
        .select("reason")
        .eq("cert_id", row.id)
        .eq("action", "rejected");
      if (!active) return;
      setPriorReturns(((data ?? []) as any[]).filter((a) => String(a.reason ?? "").startsWith(RETURN_TAG)).length);
    })();
    return () => { active = false; };
  }, [row]);

  const willAutoReject = priorReturns >= MAX_RETURNS - 1;

  const submit = async () => {
    if (!row) return;
    if (!remarks.trim() || remarks.trim().length < 5) { toast.error("Please describe the required corrections (min 5 chars)"); return; }
    setBusy(true);
    const reason = willAutoReject
      ? `Auto-rejected by the system: this application reached the maximum of ${MAX_RETURNS} returns for modification. Last remark: ${remarks.trim()}`
      : `${RETURN_TAG} ${remarks.trim()}`;
    const { error } = await supabase.rpc("reject_certificate_v2", {
      _kind: kind, _cert_id: row.id, _reason: reason,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(
      willAutoReject
        ? `❌ Maximum ${MAX_RETURNS} returns reached — the application was automatically rejected.`
        : "🔄 Returned to DEO for correction.",
    );
    onClose(); onDone();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🔄 Return for Correction</DialogTitle>
          <DialogDescription>
            Sends the application back to the DEO. They can correct and resubmit. Remarks are visible to the DEO.
            Maximum {MAX_RETURNS} returns per application.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          🔢 Returned so far: <strong>{priorReturns}</strong> of {MAX_RETURNS}
        </p>
        {willAutoReject && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            ⚠️ This is return {MAX_RETURNS}. The application will be <strong>automatically rejected</strong> with a
            system-generated reason instead of going back to the DEO.
          </p>
        )}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium">Required corrections *</label>
            <span className="text-[10px] text-muted-foreground">Quick select reason or type below</span>
          </div>

          {masterReasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-orange-50/50 border border-orange-100 max-h-32 overflow-y-auto">
              {masterReasons.map((mr) => (
                <button
                  key={mr.id}
                  type="button"
                  onClick={() => setRemarks(mr.label)}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-orange-200 bg-white hover:bg-orange-100 text-orange-900 transition-colors text-left"
                >
                  {mr.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}
            placeholder="e.g. Aadhaar photocopy is unclear; please re-upload. Village name spelling mismatch."
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            <RotateCcw size={14} className="mr-1" /> {willAutoReject ? "❌ Reject (limit reached)" : "🔄 Return to DEO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
