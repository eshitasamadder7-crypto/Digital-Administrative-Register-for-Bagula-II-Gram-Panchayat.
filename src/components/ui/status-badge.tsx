import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  FileEdit,
  Send,
  Loader2,
  XCircle,
  ShieldAlert,
  Undo2,
  Lock,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export type StatusKind =
  | "draft"
  | "submitted"
  | "pending"
  | "in_progress"
  | "completed"
  | "approved"
  | "rejected"
  | "suspended"
  | "send_back"
  | "locked"
  | "warning";

const map: Record<StatusKind, { label: string; icon: LucideIcon; cls: string }> = {
  draft:       { label: "Draft",        icon: FileEdit,     cls: "bg-muted text-muted-foreground border-border" },
  submitted:   { label: "Submitted",    icon: Send,         cls: "bg-info/10 text-info border-info/30" },
  pending:     { label: "Pending",      icon: Clock,        cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  in_progress: { label: "In Progress",  icon: Loader2,      cls: "bg-info/10 text-info border-info/30" },
  completed:   { label: "Completed",    icon: CheckCircle2, cls: "bg-success/10 text-success border-success/30" },
  approved:    { label: "Approved",     icon: CheckCircle2, cls: "bg-success/10 text-success border-success/30" },
  rejected:    { label: "Rejected",     icon: XCircle,      cls: "bg-destructive/10 text-destructive border-destructive/30" },
  suspended:   { label: "Suspended",    icon: ShieldAlert,  cls: "bg-destructive/10 text-destructive border-destructive/30" },
  send_back:   { label: "Send Back",    icon: Undo2,        cls: "bg-warning/15 text-warning-foreground border-warning/40" },
  locked:      { label: "Locked",       icon: Lock,         cls: "bg-secondary/10 text-secondary border-secondary/30" },
  warning:     { label: "Warning",      icon: AlertTriangle,cls: "bg-warning/15 text-warning-foreground border-warning/40" },
};

export function StatusBadge({
  status,
  label,
  className,
  size = "sm",
}: {
  status: StatusKind;
  label?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = map[status];
  const Icon = cfg.icon;
  const sizeCls =
    size === "xs" ? "text-[10px] px-1.5 py-0.5 gap-1" :
    size === "md" ? "text-sm px-3 py-1 gap-1.5" :
    "text-xs px-2 py-0.5 gap-1";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        cfg.cls,
        sizeCls,
        className,
      )}
    >
      <Icon size={size === "md" ? 14 : 11} className={status === "in_progress" ? "animate-spin" : undefined} aria-hidden />
      {label ?? cfg.label}
    </span>
  );
}