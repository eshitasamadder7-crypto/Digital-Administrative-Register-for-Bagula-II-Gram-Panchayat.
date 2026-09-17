import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Always-visible entry point to the public Certificate Verification page.
 * Used on Admin, DEO and public dashboards so verification is never buried.
 */
export function VerifyQuickAction({
  className,
  variant = "card",
}: {
  className?: string;
  variant?: "card" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Link
        to="/verify"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--gov-green))]/30 bg-[hsl(var(--gov-green))]/10 px-3 py-1.5 text-xs font-semibold text-[hsl(var(--gov-green))] transition-colors hover:bg-[hsl(var(--gov-green))]/15",
          className,
        )}
      >
        <ShieldCheck size={14} /> Verify Certificate
      </Link>
    );
  }
  return (
    <Link
      to="/verify"
      className={cn(
        "group relative flex items-center justify-between overflow-hidden rounded-2xl border border-[hsl(var(--gov-green))]/25 bg-gradient-to-br from-[hsl(var(--gov-green))]/10 via-white to-[hsl(var(--gov-green))]/5 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--gov-green))]/15 text-[hsl(var(--gov-green))]">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--gov-green))]">
            Public tool
          </p>
          <h3 className="text-sm font-semibold text-foreground">Verify Certificate</h3>
          <p className="text-xs text-muted-foreground">
            Look up a Warish or Dependent certificate by memo number.
          </p>
        </div>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-[hsl(var(--gov-green))] transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}