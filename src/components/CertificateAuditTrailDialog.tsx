import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadCertificateAudit, type CertAuditEntry, type CertKind } from "@/lib/certificateArchive";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CertKind;
  certId: string | null;
  label: string;
}

export default function CertificateAuditTrailDialog({
  open,
  onOpenChange,
  kind,
  certId,
  label,
}: Props) {
  const [entries, setEntries] = useState<CertAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !certId) return;
    setEntries(null);
    setError(null);
    loadCertificateAudit(kind, certId)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [open, kind, certId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Audit trail</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-2">
          {entries === null && !error && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {entries && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No audit entries yet for this certificate.
            </p>
          )}
          <div className="space-y-2">
            {entries?.map((e) => (
              <div key={e.id} className="rounded-lg border border-border/40 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold uppercase">{e.action}</span>
                  <span className="text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1">
                  By {e.actor_email ?? "system"}
                </div>
                {e.reason && <div className="mt-1">Reason: {e.reason}</div>}
                {e.ip_address && (
                  <div className="text-muted-foreground mt-0.5">IP: {e.ip_address}</div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
