import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Download } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { logActivity } from "@/lib/activityLog";

interface BackupRow {
  id: string;
  kind: string;
  status: string;
  storage_path: string | null;
  size_bytes: number | null;
  retention_until: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

const RETENTION_DAYS: Record<string, number> = {
  daily: 30,
  weekly: 365,
  monthly: 365 * 12,
  manual: 365 * 12,
};

const TABLES_TO_BACKUP = [
  "warish_certificates",
  "dependent_certificates",
  "birth_certificate_records",
  "death_certificate_records",
  "certificate_audit_logs",
  "whats_new_entries",
  "admin_profiles",
  "admin_permissions",
  "user_roles",
  "activity_logs",
] as const;

export default function AdminBackups() {
  const [rows, setRows] = useState<BackupRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("backup_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as BackupRow[]);
  };

  useEffect(() => {
    load();
  }, []);

  const runManualBackup = async () => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const retention = new Date();
      retention.setDate(retention.getDate() + RETENTION_DAYS.manual);

      const { data: job, error: jobErr } = await supabase
        .from("backup_jobs")
        .insert({
          kind: "manual",
          status: "running",
          retention_until: retention.toISOString(),
          triggered_by: userId,
        })
        .select()
        .single();
      if (jobErr || !job) throw new Error(jobErr?.message ?? "Failed to create job");

      // Export each table to JSON and bundle into a single newline-delimited file.
      const parts: string[] = [];
      const counts: Record<string, number> = {};
      for (const table of TABLES_TO_BACKUP) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) throw new Error(`${table}: ${error.message}`);
        counts[table] = data?.length ?? 0;
        parts.push(JSON.stringify({ table, rows: data ?? [] }));
      }
      const blob = new Blob([parts.join("\n")], { type: "application/x-ndjson" });
      const path = `manual/${new Date().toISOString().slice(0, 10)}/${job.id}.ndjson`;

      const { error: upErr } = await supabase.storage
        .from("certificate-backups")
        .upload(path, blob, { upsert: false });
      if (upErr) throw new Error(upErr.message);

      const { error: doneErr } = await supabase
        .from("backup_jobs")
        .update({
          status: "success",
          storage_path: path,
          size_bytes: blob.size,
          table_counts: counts,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (doneErr) throw new Error(doneErr.message);

      await logActivity({
        action_type: "backup.manual.created",
        target_table: "backup_jobs",
        target_id: job.id,
        metadata: { tables: counts, size_bytes: blob.size },
      });
      toast.success("Manual backup created");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Backup failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const download = async (row: BackupRow) => {
    if (!row.storage_path) return;
    const { data, error } = await supabase.storage
      .from("certificate-backups")
      .createSignedUrl(row.storage_path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Failed to sign URL");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Database size={18} /> Backups
            </h1>
            <p className="text-xs text-muted-foreground">
              Logical exports of certificates, audit logs, and admin data. Retention: daily 30 days · weekly 12 months · monthly 12 years.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" variant="outline" size="sm" />
            <Button size="sm" onClick={runManualBackup} disabled={busy}>
              {busy ? "Backing up…" : "Run manual backup"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white/80 backdrop-blur-sm p-4 text-xs space-y-2">
          <p className="font-semibold">Scheduled backups</p>
          <p className="text-muted-foreground">
            Daily, weekly, and monthly snapshots will be scheduled via an edge function in the next phase. You can still run a manual backup right now, and restore via the controls below.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent backups
          </h2>
          {rows === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rows && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          )}
          {rows?.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border/40 bg-white/80 backdrop-blur-sm p-4 flex flex-wrap items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">{r.kind}</Badge>
                  <Badge
                    variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"}
                  >
                    {r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.started_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Retention until {new Date(r.retention_until).toLocaleDateString()}
                  {r.size_bytes ? ` · ${(r.size_bytes / 1024).toFixed(1)} KB` : ""}
                </div>
                {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
              </div>
              {r.storage_path && (
                <Button size="sm" variant="outline" onClick={() => download(r)}>
                  <Download size={14} className="mr-1" /> Download
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
