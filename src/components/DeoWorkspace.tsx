import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthz } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/BackButton";
import {
  FilePlus2,
  FileEdit,
  FileWarning,
  Send,
  History as HistoryIcon,
  Search,
  BarChart3,
  ArrowRight,
  Inbox,
  CircleDot,
  CheckCircle2,
  XCircle,
  FileCheck2,
} from "lucide-react";

type Kind = "warish" | "dependent";

const SUBMITTED_STATUS = "Pending Signature & Memo Registration";
const RETURN_TAG = "[RETURN]";

export type WorkspaceRow = {
  id: string;
  status: string | null;
  applicant_name: string | null;
  village?: string | null;
  memo_no?: string | null;
  verification_id?: string | null;
  created_at: string;
  issue_date?: string | null;
  rejection_reason?: string | null;
};

type Counts = {
  drafts: number;
  submitted: number;
  returned: number;
  approved: number;
  issued: number;
  total: number;
};

const isReturnedRow = (r: { status?: string | null; rejection_reason?: string | null }) =>
  r.status === "Rejected" && String(r.rejection_reason ?? "").startsWith(RETURN_TAG);

const cleanRemarks = (reason: string | null | undefined) =>
  String(reason ?? "").startsWith(RETURN_TAG)
    ? String(reason).slice(RETURN_TAG.length).trim()
    : String(reason ?? "");

function statusToBadge(status: string | null | undefined, reason?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return { label: "Issued", cls: "bg-primary/15 text-primary" };
  if (s === "rejected")
    return isReturnedRow({ status, rejection_reason: reason })
      ? { label: "Returned", cls: "bg-orange-100 text-orange-700" }
      : { label: "Rejected", cls: "bg-rose-100 text-rose-700" };
  if (s === "under review") return { label: "Under Review", cls: "bg-amber-100 text-amber-700" };
  if (s.includes("pending")) return { label: "Submitted", cls: "bg-sky-100 text-sky-700" };
  if (s === "draft") return { label: "Draft", cls: "bg-muted text-muted-foreground" };
  return { label: status ?? "—", cls: "bg-muted text-muted-foreground" };
}

export function StatusBadge({ status, reason }: { status: string | null | undefined; reason?: string | null }) {
  const b = statusToBadge(status, reason);
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>;
}


interface Props {
  kind: Kind;
  title: string;
  newRoute: string;
  editRoute: (id: string) => string;
  issuedTab: ReactNode;
}

export default function DeoWorkspace({ kind, title, newRoute, editRoute, issuedTab }: Props) {
  const authz = useAuthz();
  const table = kind === "warish" ? "warish_certificates" : "dependent_certificates";
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null);
  const [tab, setTab] = useState<"work" | "history" | "search" | "stats" | "issued">("work");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authz.userId) return;
    let cancelled = false;
    (async () => {
      const q = supabase
        .from(table)
        .select("id, status, applicant_name, village, memo_no, verification_id, created_at, issue_date, rejection_reason")
        .order("created_at", { ascending: false })
        .limit(500);
      // Scope to created_by for DEO; admins/super_admins see all
      const scoped = authz.isDeo && !authz.isAdmin ? q.eq("created_by", authz.userId!) : q;
      const { data } = await scoped;
      if (!cancelled) setRows((data ?? []) as WorkspaceRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [authz.userId, authz.isAdmin, authz.isDeo, table]);

  const counts = useMemo<Counts>(() => {
    const list = rows ?? [];
    return {
      drafts: list.filter((r) => (r.status ?? "").toLowerCase() === "draft").length,
      submitted: list.filter((r) => r.status === SUBMITTED_STATUS).length,
      returned: list.filter(isReturnedRow).length,
      approved: list.filter((r) => r.status === "Approved").length,
      issued: list.filter((r) => r.status === "Approved" && r.memo_no).length,
      total: list.length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) =>
      [r.id, r.applicant_name, r.village, r.memo_no, r.verification_id, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const submitted = (rows ?? []).filter((r) => r.status === SUBMITTED_STATUS).slice(0, 20);
  const returned = (rows ?? []).filter(isReturnedRow).slice(0, 20);
  const drafts = (rows ?? []).filter((r) => (r.status ?? "").toLowerCase() === "draft").slice(0, 20);

  const label = kind === "warish" ? "Warish" : "Dependent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <header className="rounded-2xl border border-border/40 bg-white/85 backdrop-blur-sm shadow-sm p-5 flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">DEO Workspace</p>
            <h1 className="text-xl font-bold font-heading text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Create, continue, and track {label.toLowerCase()} applications. Issued certificates are available as a separate tab.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <BackButton
              fallbackUrl={authz.isAdmin ? "/admin/dashboard" : "/admin/deo"}
              label="🏠 Dashboard"
              variant="outline"
              size="sm"
            />
            <Link to={newRoute}>
              <Button size="sm"><FilePlus2 size={14} className="mr-1" />New {label}</Button>
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-1 rounded-xl border border-border/40 bg-white/70 p-1 shadow-sm">
          {[
            { k: "work", label: "My Work", icon: CircleDot },
            { k: "history", label: "History", icon: HistoryIcon },
            { k: "search", label: "Search", icon: Search },
            { k: "stats", label: "Statistics", icon: BarChart3 },
            { k: "issued", label: "Issued", icon: FileCheck2 },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/5"
                }`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* WORK tab */}
        {tab === "work" && (
          <>
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ActionTile
                  to={newRoute}
                  title={`Create New ${label} Application`}
                  desc="Start a fresh entry"
                  icon={FilePlus2}
                  tone="sky"
                  primary
                />
                <ActionTile
                  to="#"
                  onClick={() => setTab("history")}
                  title="Continue Drafts"
                  desc="Pick up in-progress work"
                  icon={FileEdit}
                  tone="amber"
                  badge={counts.drafts || undefined}
                />
                <ActionTile
                  to="#"
                  onClick={() => setTab("history")}
                  title="Returned for Modification"
                  desc="Address reviewer remarks"
                  icon={FileWarning}
                  tone="rose"
                  badge={counts.returned || undefined}
                />
                <ActionTile
                  to="#"
                  onClick={() => setTab("history")}
                  title="Submitted Applications"
                  desc="Awaiting admin review"
                  icon={Send}
                  tone="violet"
                  badge={counts.submitted || undefined}
                />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <QueueList
                title="Submitted"
                icon={Send}
                items={submitted}
                editRoute={editRoute}
                empty="No submitted applications."
              />
              <QueueList
                title="Returned for Modification"
                icon={FileWarning}
                items={returned}
                editRoute={editRoute}
                empty="Nothing to correct."
                showReason
              />
              <QueueList
                title="Drafts"
                icon={FileEdit}
                items={drafts}
                editRoute={editRoute}
                empty="No drafts."
              />
            </div>
          </>
        )}

        {/* HISTORY tab */}
        {tab === "history" && (
          <section className="rounded-2xl border border-border/40 bg-white/85 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">My Application History</h2>
                <p className="text-[11px] text-muted-foreground">All applications you created, newest first.</p>
              </div>
              <Input
                placeholder="Filter history…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs max-w-xs"
              />
            </div>
            <RowTable rows={filtered} editRoute={editRoute} loading={rows === null} />
          </section>
        )}

        {/* SEARCH tab */}
        {tab === "search" && (
          <section className="rounded-2xl border border-border/40 bg-white/85 p-4 shadow-sm space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Search Applications</h2>
              <p className="text-[11px] text-muted-foreground">
                Search by Application ID, Applicant Name, Memo No, Verification ID, or Status.
              </p>
            </div>
            <Input
              placeholder="Type to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
            <RowTable rows={search ? filtered : []} editRoute={editRoute} loading={rows === null} emptyHint="Enter a query to search." />
          </section>
        )}

        {/* STATS tab */}
        {tab === "stats" && (
          <section>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total" value={counts.total} icon={Inbox} tone="slate" />
              <StatCard label="Drafts" value={counts.drafts} icon={FileEdit} tone="slate" />
              <StatCard label="Submitted" value={counts.submitted} icon={Send} tone="sky" />
              <StatCard label="Returned" value={counts.returned} icon={XCircle} tone="rose" />
              <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} tone="emerald" />
              <StatCard label="Issued" value={counts.issued} icon={FileCheck2} tone="violet" />
            </div>
          </section>
        )}

        {/* ISSUED tab — reuses existing DataTable component from the caller */}
        {tab === "issued" && (
          <section className="rounded-2xl border border-border/40 bg-white/85 p-4 shadow-sm">
            {issuedTab}
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

const toneBg: Record<string, string> = {
  sky: "from-sky-100 to-sky-50 text-sky-700 ring-sky-200",
  violet: "from-violet-100 to-violet-50 text-violet-700 ring-violet-200",
  amber: "from-amber-100 to-amber-50 text-amber-700 ring-amber-200",
  rose: "from-rose-100 to-rose-50 text-rose-700 ring-rose-200",
  emerald: "from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "from-slate-100 to-slate-50 text-slate-700 ring-slate-200",
};

function ActionTile({
  to,
  onClick,
  title,
  desc,
  icon: Icon,
  tone,
  badge,
  primary,
}: {
  to: string;
  onClick?: () => void;
  title: string;
  desc: string;
  icon: any;
  tone: keyof typeof toneBg;
  badge?: number;
  primary?: boolean;
}) {
  const t = toneBg[tone];
  const cls = `group relative rounded-2xl border border-border/40 bg-gradient-to-br ${t
    .split(" ")
    .slice(0, 2)
    .join(" ")} ring-1 ${t.split(" ").slice(-1)} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition ${
    primary ? "ring-2 ring-primary/40" : ""
  }`;
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center ${t.split(" ")[2]}`}>
          <Icon size={18} />
        </div>
        {badge !== undefined && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-foreground border border-border/50">
            {badge}
          </span>
        )}
      </div>
      <h3 className={`mt-3 text-sm font-semibold ${t.split(" ")[2]}`}>{title}</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      <ArrowRight size={14} className={`absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition ${t.split(" ")[2]}`} />
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} text-left`}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  );
}

function QueueList({
  title,
  icon: Icon,
  items,
  editRoute,
  empty,
  showReason,
}: {
  title: string;
  icon: any;
  items: WorkspaceRow[];
  editRoute: (id: string) => string;
  empty: string;
  showReason?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border/40 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={13} className="text-primary" />
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="outline" className="ml-auto text-[10px]">{items.length}</Badge>
      </div>
      <ul className="space-y-2 max-h-72 overflow-auto">
        {items.length === 0 && <li className="text-xs text-muted-foreground">{empty}</li>}
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/40 bg-background/60 px-3 py-2">
            <Link to={editRoute(r.id)} className="block">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium truncate">{r.applicant_name ?? "—"}</p>
                <StatusBadge status={r.status} reason={r.rejection_reason} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {r.village ?? ""} · {new Date(r.created_at).toLocaleDateString()}
              </p>
              {showReason && r.rejection_reason && (
                <p className="text-[10px] text-rose-700 mt-1 line-clamp-2">Admin remarks: {cleanRemarks(r.rejection_reason)}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowTable({
  rows,
  editRoute,
  loading,
  emptyHint,
}: {
  rows: WorkspaceRow[];
  editRoute: (id: string) => string;
  loading?: boolean;
  emptyHint?: string;
}) {
  if (loading) return <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>;
  if (rows.length === 0)
    return <p className="text-xs text-muted-foreground py-6 text-center">{emptyHint ?? "No applications found."}</p>;
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b">
            <th className="py-2 pr-3">Applicant</th>
            <th className="py-2 pr-3">Village</th>
            <th className="py-2 pr-3">Memo / VID</th>
            <th className="py-2 pr-3">Created</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/30 hover:bg-primary/5">
              <td className="py-2 pr-3 font-medium">{r.applicant_name ?? "—"}</td>
              <td className="py-2 pr-3 text-muted-foreground">{r.village ?? "—"}</td>
              <td className="py-2 pr-3 font-mono text-[10px]">
                {r.memo_no ?? "—"}
                {r.verification_id && <div className="text-primary/80">{r.verification_id}</div>}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="py-2 pr-3"><StatusBadge status={r.status} reason={r.rejection_reason} /></td>
              <td className="py-2 pr-3 text-right">
                <Link to={editRoute(r.id)}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">Open</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: keyof typeof toneBg }) {
  const t = toneBg[tone];
  return (
    <div className={`rounded-xl border border-border/40 bg-gradient-to-br ${t.split(" ").slice(0, 2).join(" ")} ring-1 ${t.split(" ").slice(-1)} p-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.split(" ")[2]}`}>{label}</p>
        <Icon size={14} className={t.split(" ")[2]} />
      </div>
      <p className={`text-2xl font-bold mt-1 ${t.split(" ")[2]}`}>{value}</p>
    </div>
  );
}
