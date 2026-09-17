import { supabase } from "@/integrations/supabase/client";

export type CertKind = "warish" | "dependent" | "birth" | "death";

export interface ArchiveInput {
  kind: CertKind;
  certId: string;
  reason: string;
  password: string;
  email: string;
}

/**
 * Archive (soft-delete) a certificate.
 * Steps:
 *  1. Re-verify the Super Admin's password via signInWithPassword (Supabase issues a new session for the same user).
 *  2. Call the audited RPC `archive_certificate` which enforces super_admin + 1-year retention + reason.
 *
 * Throws on any failure with a user-friendly message.
 */
export async function archiveCertificate(input: ArchiveInput): Promise<void> {
  const { kind, certId, reason, password, email } = input;

  if (!password || password.length < 6) {
    throw new Error("Password is required to confirm deletion.");
  }
  if (!reason || reason.trim().length < 8) {
    throw new Error("Please enter a reason of at least 8 characters.");
  }

  // 1. Re-auth check. signInWithPassword for the same user keeps the session valid.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (reauthError) {
    throw new Error(
      "Password verification failed. If you sign in with Google only, set a password first in Account Settings."
    );
  }

  // 2. Call audited archive RPC. The function inserts the audit log itself.
  const { error: rpcError } = await supabase.rpc("archive_certificate", {
    _kind: kind,
    _cert_id: certId,
    _reason: reason.trim(),
    _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }
}

export interface CertAuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function loadCertificateAudit(
  kind: CertKind,
  certId: string
): Promise<CertAuditEntry[]> {
  const { data, error } = await supabase
    .from("certificate_audit_logs")
    .select("id, action, actor_email, reason, ip_address, user_agent, metadata, created_at")
    .eq("cert_kind", kind)
    .eq("cert_id", certId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CertAuditEntry[];
}

/**
 * Years since issue date. Used to gate the archive button (>= 1 year).
 */
export function yearsSinceIssue(issueDate: string | null | undefined): number {
  if (!issueDate) return 0;
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return 0;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}
