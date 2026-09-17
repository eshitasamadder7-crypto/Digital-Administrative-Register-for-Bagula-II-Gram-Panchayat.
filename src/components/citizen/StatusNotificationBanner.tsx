import { CheckCircle2, Search, AlertTriangle, XCircle, Bell, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StatusUpdateAlert } from "@/modules/citizen/applicationStatusWatcher";

interface Props {
  alerts: StatusUpdateAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onViewApplication: (appId: string, kind: string) => void;
}

const KIND_LABEL: Record<string, string> = {
  warish: "Warish Certificate",
  dependent: "Dependent Certificate",
};

export function StatusNotificationBanner({ alerts, onDismiss, onClearAll, onViewApplication }: Props) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-2 border-b border-primary/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center animate-pulse">
            <Bell size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Application Status Updated
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 bg-primary/15 text-primary border-none">
                {alerts.length} new {alerts.length === 1 ? "alert" : "alerts"}
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              আবেদনের স্থিতি পরিবর্তিত হয়েছে — your Gram Panchayat application status has moved forward.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs h-7 text-muted-foreground hover:text-foreground"
        >
          Dismiss All
        </Button>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const isApproved = alert.newStatus.toLowerCase().includes("approved");
          const isUnderVerification =
            alert.newStatus.toLowerCase().includes("verification") ||
            alert.newStatus.toLowerCase().includes("review") ||
            alert.newStatus.toLowerCase().includes("processing");
          const isReturned = alert.newStatus.toLowerCase().includes("returned");
          const isRejected = alert.newStatus.toLowerCase().includes("rejected");

          return (
            <div
              key={alert.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-xs hover:border-primary/40 transition"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {isApproved ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={14} />
                    </span>
                  ) : isUnderVerification ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 animate-pulse">
                      <Search size={14} />
                    </span>
                  ) : isReturned ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <AlertTriangle size={14} />
                    </span>
                  ) : isRejected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700">
                      <XCircle size={14} />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bell size={14} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">
                      {KIND_LABEL[alert.kind] || "Certificate"}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      ({alert.identifier})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 text-xs flex-wrap">
                    <span className="text-muted-foreground line-through opacity-70">
                      {alert.oldStatus}
                    </span>
                    <ArrowRight size={12} className="text-muted-foreground" />
                    <Badge
                      className={
                        isApproved
                          ? "bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[11px]"
                          : isUnderVerification
                          ? "bg-blue-600 hover:bg-blue-600 text-white font-semibold text-[11px]"
                          : isReturned
                          ? "bg-amber-600 hover:bg-amber-600 text-white font-semibold text-[11px]"
                          : "bg-primary text-primary-foreground font-semibold text-[11px]"
                      }
                    >
                      {alert.newStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  onClick={() => onViewApplication(alert.id, alert.kind)}
                >
                  View Details
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onDismiss(alert.id)}
                  aria-label="Dismiss alert"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
