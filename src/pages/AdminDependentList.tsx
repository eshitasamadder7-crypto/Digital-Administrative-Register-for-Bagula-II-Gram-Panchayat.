import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Archive, History } from "lucide-react";
import { useAuthz } from "@/lib/permissions";
import { yearsSinceIssue } from "@/lib/certificateArchive";
import ArchiveCertificateDialog from "@/components/ArchiveCertificateDialog";
import CertificateAuditTrailDialog from "@/components/CertificateAuditTrailDialog";
import { DataTable, type DataColumn, type DataFilter } from "@/components/ui/data-table";
import DeoWorkspace from "@/components/DeoWorkspace";

type Row = {
  id: string;
  verification_id: string | null;
  status: string | null;
  memo_no: string;
  cert_date: string;
  applicant_name: string;
  village: string | null;
  department: string | null;
  created_at: string;
  certificate_number: string | null;
  issue_date: string | null;
  archived_at: string | null;
};

function IssuedTable() {
  const authz = useAuthz();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Row | null>(null);
  const [auditTarget, setAuditTarget] = useState<Row | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("dependent_certificates")
      .select("id, verification_id, status, memo_no, cert_date, applicant_name, village, department, created_at, certificate_number, issue_date, archived_at")
      .eq("status", "Approved")
      .order("cert_date", { ascending: false });
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows(data as Row[]);
  };

  useEffect(() => { load(); }, []);

  const yearFilter: DataFilter = useMemo(() => {
    const years = Array.from(new Set((rows ?? []).map((r) => (r.cert_date || "").slice(0, 4)).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
    return { key: "year", label: "Year", options: years.map((y) => ({ label: y, value: y })) };
  }, [rows]);

  const deptFilter: DataFilter = useMemo(() => {
    const depts = Array.from(new Set((rows ?? []).map((r) => r.department).filter(Boolean) as string[])).sort();
    return { key: "department", label: "Department", options: depts.map((d) => ({ label: d, value: d })) };
  }, [rows]);

  const columns: DataColumn<Row>[] = [
    {
      key: "memo_no",
      header: "Memo No.",
      accessor: (r) => r.memo_no,
      sortable: true,
      cell: (r) => (
        <div className="space-y-1">
          <div className="font-mono text-xs font-medium">{r.memo_no}</div>
          {r.certificate_number && <Badge variant="outline" className="text-[10px]">{r.certificate_number}</Badge>}
          {r.archived_at && <Badge variant="destructive" className="text-[10px] ml-1">Archived</Badge>}
        </div>
      ),
    },
    { key: "cert_date", header: "Issued", accessor: (r) => r.issue_date ?? r.cert_date, sortable: true, cell: (r) => <span className="text-xs">{r.issue_date ?? r.cert_date}</span> },
    { key: "applicant_name", header: "Applicant", accessor: (r) => r.applicant_name, sortable: true, cell: (r) => <span className="text-sm font-medium">{r.applicant_name}</span> },
    { key: "village", header: "Village", accessor: (r) => r.village ?? "", sortable: true, cell: (r) => <span className="text-xs text-muted-foreground">{r.village ?? "—"}</span> },
    { key: "department", header: "Department", accessor: (r) => r.department ?? "", sortable: true, cell: (r) => <span className="text-xs text-muted-foreground">{r.department ?? "—"}</span> },
    { key: "verification_id", header: "VID", accessor: (r) => r.verification_id ?? "", cell: (r) => r.verification_id ? <span className="text-[11px] font-mono text-primary/80">{r.verification_id}</span> : <span className="text-muted-foreground">—</span> },
  ];

  return (
    <>
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Issued Dependent Certificates</h2>
        <p className="text-[11px] text-muted-foreground">Records preserved for 12 years. Archive available to Super Admins after 1 year.</p>
      </div>
      <DataTable<Row>
        data={rows ?? []}
        loading={rows === null}
        columns={columns}
        rowKey={(r) => r.id}
        searchPlaceholder="Search memo, name, village…"
        searchable={(r) => [r.memo_no, r.applicant_name, r.village ?? "", r.department ?? "", r.certificate_number ?? "", r.verification_id ?? ""].join(" ")}
        filters={[yearFilter, deptFilter]}
        filterValue={(r, key) => key === "year" ? (r.cert_date || "").slice(0, 4) : key === "department" ? (r.department ?? "") : ""}
        emptyState="No dependent certificates saved yet."
        pageSize={12}
        actions={(r) => {
          const issued = r.issue_date ?? r.cert_date;
          const canArchive = authz.isSuperAdmin && yearsSinceIssue(issued) >= 1 && !r.archived_at;
          return (
            <>
              <Link to={`/dependent-certificate?load=${r.id}&reprint=1`}>
                <Button size="sm">Reprint</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setAuditTarget(r)}>
                <History size={14} className="mr-1" /> Audit
              </Button>
              {canArchive && (
                <Button size="sm" variant="destructive" onClick={() => setArchiveTarget(r)}>
                  <Archive size={14} className="mr-1" /> Archive
                </Button>
              )}
            </>
          );
        }}
      />

      <ArchiveCertificateDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        certId={archiveTarget?.id ?? null}
        kind="dependent"
        label={archiveTarget ? `Memo ${archiveTarget.memo_no} for ${archiveTarget.applicant_name}` : ""}
        email={authz.email}
        onArchived={load}
      />
      <CertificateAuditTrailDialog
        open={!!auditTarget}
        onOpenChange={(o) => !o && setAuditTarget(null)}
        kind="dependent"
        certId={auditTarget?.id ?? null}
        label={auditTarget ? `Memo ${auditTarget.memo_no}` : ""}
      />
    </>
  );
}

export default function AdminDependentList() {
  return (
    <DeoWorkspace
      kind="dependent"
      title="Dependent Applications"
      newRoute="/dependent-certificate"
      editRoute={(id) => `/dependent-certificate?load=${id}`}
      issuedTab={<IssuedTable />}
    />
  );
}
