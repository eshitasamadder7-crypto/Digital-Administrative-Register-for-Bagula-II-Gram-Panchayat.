import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { NotificationCenter } from "@/components/NotificationCenter";

/** Shared "Coming Soon" notice for all non-functional Public Portal features. */
export function comingSoon(feature = "This feature") {
  toast.info(`${feature} — Coming Soon`, {
    description: "এই পরিষেবাটি শীঘ্রই চালু হবে।",
  });
}

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(160deg, hsl(30 100% 95%) 0%, hsl(0 0% 100%) 50%, hsl(140 40% 95%) 100%)",
        }}
      />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="min-w-0 flex items-center gap-2">
            <span className="text-xl shrink-0">🏛️</span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">
                🌐 Public Citizen Portal
              </p>
              <p className="text-sm font-bold truncate">Bagula II Gram Panchayat</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationCenter variant="compact" tone="dark" />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground shrink-0 font-medium flex items-center gap-1">
              ← 🏡 Main site
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-10 border-t bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 text-center text-xs text-muted-foreground font-medium">
          📍 Bagula II Gram Panchayat · Hanskhali Block · Nadia, West Bengal
        </div>
      </footer>
    </div>
  );
}
