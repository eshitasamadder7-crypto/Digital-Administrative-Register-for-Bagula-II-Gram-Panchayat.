import { useEffect, useState } from "react";
import { readAdminAuthDebug, type AdminAuthDebugState } from "@/lib/adminAuthDebug";

const itemClass = "rounded-xl border border-border/40 bg-background/70 p-3";

export default function AdminAuthDebugPanel() {
  const [state, setState] = useState<AdminAuthDebugState>(() => readAdminAuthDebug());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const refresh = () => setState(readAdminAuthDebug());
    const onDebug = (event: Event) => {
      const detail = (event as CustomEvent<AdminAuthDebugState>).detail;
      setState(detail ?? readAdminAuthDebug());
    };
    window.addEventListener("admin-auth-debug", onDebug);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener("admin-auth-debug", onDebug);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Temporary Auth Debug</h2>
        <p className="text-[11px] text-muted-foreground">Visible only after admin access is allowed.</p>
      </div>
      <div className="grid gap-3 text-[11px] sm:grid-cols-2">
        <div className={itemClass}>
          <p className="text-muted-foreground">Session</p>
          <p className="font-medium text-foreground">{state.sessionState}</p>
        </div>
        <div className={itemClass}>
          <p className="text-muted-foreground">Role lookup</p>
          <p className="font-medium text-foreground">{state.roleLookupResult}</p>
        </div>
        <div className={itemClass}>
          <p className="text-muted-foreground">User id</p>
          <p className="break-all font-medium text-foreground">{state.userId ?? "—"}</p>
        </div>
        <div className={itemClass}>
          <p className="text-muted-foreground">Email</p>
          <p className="break-all font-medium text-foreground">{state.email ?? "—"}</p>
        </div>
        <div className={itemClass}>
          <p className="text-muted-foreground">Last redirect reason</p>
          <p className="font-medium text-foreground">{state.lastRedirectReason ?? "—"}</p>
        </div>
        <div className={itemClass}>
          <p className="text-muted-foreground">Last update</p>
          <p className="font-medium text-foreground">{state.timestamp}</p>
        </div>
      </div>
      {state.roleLookupMessage && (
        <p className="mt-3 rounded-xl border border-border/40 bg-background/70 p-3 text-[11px] text-muted-foreground">
          {state.roleLookupMessage}
        </p>
      )}
    </section>
  );
}