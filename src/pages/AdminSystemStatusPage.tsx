import { BackButton } from "@/components/BackButton";
import { AdminSystemStatusWidget } from "@/components/admin/AdminSystemStatusWidget";
import { useAuthz } from "@/lib/permissions";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function AdminSystemStatusPage() {
  const authz = useAuthz();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton fallbackUrl="/admin/dashboard" label="🏠 Dashboard" className="-ml-2 text-xs" />
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-primary" />
            <span>Bagula II GP · System Health Monitor</span>
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🖥️ Admin System Status & Health
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time monitoring of database connection telemetry, security & authentication incident logs, and storage resource utilization.
          </p>
        </div>

        {/* Status widget in full layout */}
        <AdminSystemStatusWidget />

        <div className="p-4 rounded-xl border border-border/40 bg-white/70 text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles size={13} className="text-primary" />
            <span>Security & Data Integrity Standards</span>
          </div>
          <p>
            • Database queries execute over TLS 1.3 secured channels with Postgres Row-Level Security (RLS) enforcement.
          </p>
          <p>
            • Audit trails record security events, session expirations, and credential validation failures while strictly masking private passwords and credentials.
          </p>
          <p>
            • Storage utilization metrics aggregate uploaded citizen proofs (Voter ID, Death Certificates, affidavits) and automated DR backups with sha256 checksum tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
