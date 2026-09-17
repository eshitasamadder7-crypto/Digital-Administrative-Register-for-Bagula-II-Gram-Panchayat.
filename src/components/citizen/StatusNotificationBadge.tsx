import { Sparkles, CheckCircle2, Search, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizeStatus } from "@/modules/citizen/applicationStatusWatcher";

interface Props {
  status: string | null | undefined;
  isRecentlyUpdated?: boolean;
  oldStatus?: string;
  className?: string;
}

export function StatusNotificationBadge({
  status,
  isRecentlyUpdated = false,
  oldStatus,
  className = "",
}: Props) {
  const norm = normalizeStatus(status);

  if (isRecentlyUpdated) {
    if (norm === "Approved") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs animate-in fade-in duration-300 ${className}`}
        >
          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
          <span>Moved to 'Approved'</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        </span>
      );
    }

    if (norm === "Under Verification") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 ring-2 ring-blue-500/20 shadow-xs animate-in fade-in duration-300 ${className}`}
        >
          <Search size={13} className="text-blue-600 shrink-0" />
          <span>Moved to 'Under Verification'</span>
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
        </span>
      );
    }

    if (norm === "Returned") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 ring-2 ring-amber-500/20 shadow-xs ${className}`}
        >
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          <span>Returned for Correction</span>
        </span>
      );
    }

    if (norm === "Rejected") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 ring-2 ring-red-500/20 shadow-xs ${className}`}
        >
          <XCircle size={13} className="text-red-600 shrink-0" />
          <span>Application Rejected</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30 ring-2 ring-primary/20 shadow-xs ${className}`}
      >
        <Sparkles size={13} className="text-primary shrink-0" />
        <span>Status: {status}</span>
      </span>
    );
  }

  // Standard status badge
  if (norm === "Approved") {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-medium">
        ✓ Approved
      </Badge>
    );
  }

  if (norm === "Under Verification") {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs font-medium">
        🔍 Under Verification
      </Badge>
    );
  }

  if (norm === "Returned") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs font-medium">
        ⚠️ Returned
      </Badge>
    );
  }

  if (norm === "Rejected") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs font-medium">
        ✕ Rejected
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      {status ?? "Draft"}
    </Badge>
  );
}
