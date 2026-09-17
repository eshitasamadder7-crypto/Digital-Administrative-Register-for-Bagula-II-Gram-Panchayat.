import { useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, X, Info, AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import { notificationEngine, type NotificationEntry, type NotificationLevel } from "@/core/notificationEngine";
import { cn } from "@/lib/utils";

const levelStyles: Record<NotificationLevel, { icon: typeof Info; ring: string; text: string; bg: string }> = {
  success: { icon: CircleCheck, ring: "ring-emerald-200", text: "text-emerald-700", bg: "bg-emerald-50" },
  error: { icon: CircleX, ring: "ring-red-200", text: "text-red-700", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, ring: "ring-amber-200", text: "text-amber-700", bg: "bg-amber-50" },
  info: { icon: Info, ring: "ring-sky-200", text: "text-sky-700", bg: "bg-sky-50" },
};

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

interface Props {
  /** compact = icon only (for tight headers) */
  variant?: "default" | "compact";
  /** color for the bell icon in the trigger */
  tone?: "light" | "dark";
}

export function NotificationCenter({ variant = "default", tone = "dark" }: Props) {
  const [items, setItems] = useState<NotificationEntry[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => notificationEngine.subscribe(setItems), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium transition",
          tone === "light" ? "text-primary-foreground hover:bg-primary-foreground/10" : "text-foreground hover:bg-muted",
          variant === "compact" && "px-2",
        )}
      >
        <Bell size={16} />
        {variant !== "compact" && <span className="hidden sm:inline">Alerts</span>}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-bold px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] rounded-xl border border-border/50 bg-card text-card-foreground shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-primary" />
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => notificationEngine.markAllRead()}
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-1 rounded hover:bg-muted"
                title="Mark all read"
              >
                <CheckCheck size={12} /> Read
              </button>
              <button
                onClick={() => notificationEngine.clear()}
                className="inline-flex items-center gap-1 text-[11px] px-1.5 py-1 rounded hover:bg-muted text-muted-foreground"
                title="Clear all"
                aria-label="Clear all notifications"
              >
                <Trash2 size={12} aria-hidden="true" />
                <span className="sr-only">Clear all</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Close notifications"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {items.map((n) => {
                  const s = levelStyles[n.level];
                  const Icon = s.icon;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "px-3 py-2.5 text-sm flex items-start gap-2.5 group",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <div className={cn("mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center ring-1", s.bg, s.ring)}>
                        <Icon className={cn("h-4 w-4", s.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("font-medium truncate", !n.read && "text-foreground")}>{n.title}</p>
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden />}
                        </div>
                        {n.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => notificationEngine.markRead(n.id)}
                          className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-muted text-muted-foreground"
                          title="Mark read"
                          aria-label="Mark notification as read"
                        >
                          <Check size={12} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;