import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { archiveCertificate, type CertKind } from "@/lib/certificateArchive";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certId: string | null;
  kind: CertKind;
  label: string;
  email: string | null;
  onArchived: () => void;
}

export default function ArchiveCertificateDialog({
  open,
  onOpenChange,
  certId,
  kind,
  label,
  email,
  onArchived,
}: Props) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason("");
    setPassword("");
    setShowPassword(false);
    setBusy(false);
  };

  const submit = async () => {
    if (!certId || !email) return;
    setBusy(true);
    try {
      await archiveCertificate({ kind, certId, reason, password, email });
      toast.success("Certificate archived. The record is preserved in the audit log.");
      reset();
      onOpenChange(false);
      onArchived();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to archive";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive certificate</AlertDialogTitle>
          <AlertDialogDescription>
            {label}. This soft-deletes the record. Issued certificates younger than one year cannot be archived. Only Super Admins may proceed, and every archive action is permanently logged with date, time, and your account details.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="archive-reason">Reason (required, min 8 characters)</Label>
            <Textarea
              id="archive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate entry created in error; original retained as WARISH-2024-00123."
              rows={3}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="archive-password">Confirm with your password</Label>
            <div className="relative">
              <Input
                id="archive-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pr-10"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                disabled={busy}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Google-only accounts must set a password in Account Settings first.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={busy || !reason.trim() || !password}
          >
            {busy ? "Archiving…" : "Archive"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
