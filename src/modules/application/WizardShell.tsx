import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Check, Loader2, Save } from "lucide-react";
import { WIZARD_STEPS, type WizardStepKey } from "./types";
import type { AutoSaveState } from "./useAutoSave";
import { GoBackButton } from "@/components/GoBackButton";

interface Props {
  title: string;
  current: WizardStepKey;
  onStepClick?: (key: WizardStepKey) => void;
  furthest: number;
  autoSave: { state: AutoSaveState; lastSavedAt: Date | null };
  children: ReactNode;
  footer?: ReactNode;
}

export default function WizardShell({
  title, current, onStepClick, furthest, autoSave, children, footer,
}: Props) {
  const location = useLocation();
  const isPublic = location.pathname.startsWith("/public");
  const fallbackUrl = isPublic ? "/public/dashboard" : "/admin/deo";
  const index = WIZARD_STEPS.findIndex((s) => s.key === current);
  const pct = ((index + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <GoBackButton fallbackUrl={fallbackUrl} label="Back to Dashboard" className="mb-3 -ml-2" />
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Step {index + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[index]?.label}
        </p>
      </header>

      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {WIZARD_STEPS.map((s, i) => {
          const done = i < index;
          const active = i === index;
          const reachable = i <= furthest;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onStepClick?.(s.key)}
                className={[
                  "flex items-center gap-1 rounded-full border px-3 py-1 transition-colors",
                  active ? "border-primary bg-primary/10 font-medium text-primary" : "",
                  done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "",
                  !active && !done ? "border-border text-muted-foreground" : "",
                  reachable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                ].join(" ")}
              >
                <span aria-hidden>{done ? <Check className="h-3 w-3" /> : s.icon}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border bg-card p-4 sm:p-6">{children}</div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {autoSave.state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {autoSave.state !== "saving" && <Save className="h-3.5 w-3.5" />}
          {autoSave.state === "saving" && "💾 Saving…"}
          {autoSave.state === "saved" && `💾 Auto-saved ${autoSave.lastSavedAt?.toLocaleTimeString() ?? ""}`}
          {autoSave.state === "error" && "⚠️ Could not auto-save — check your connection"}
          {autoSave.state === "idle" && "💾 Auto-save is on"}
        </span>
        <div className="flex gap-2">{footer}</div>
      </div>
    </div>
  );
}
