import React, { useState, useEffect } from "react";
import { AlertTriangle, X, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

export function GlobalUnderDevelopmentBanner() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("bagula2_dev_banner_dismissed") === "true";
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("bagula2_dev_banner_dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Portal Under Development Notice"
      className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs px-3 py-2 transition-all relative z-50 print:hidden"
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2 flex-1">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold uppercase tracking-wider text-[11px] bg-amber-500/20 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded mr-2 inline-block">
              Beta / Under Active Development
            </span>
            <span className="font-medium">
              This digital facilitation portal for Bagula II Gram Panchayat is currently in active staging and development.
            </span>{" "}
            {!collapsed && (
              <span className="text-muted-foreground block sm:inline mt-1 sm:mt-0">
                Data entries, test credentials, and electronic drafts created during this phase are strictly for trial and system verification purposes. The Gram Panchayat administration and developer team assume no liability for legal clauses, procedural delays, or claims arising from beta phase use.
                <span className="block text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5 font-sans">
                  বগুলা ২ নং গ্রাম পঞ্চায়েতের এই পোর্টালটি বর্তমানে উন্নয়নশীল ও পরীক্ষামূলক পর্যায়ে রয়েছে। পরীক্ষামূলক ব্যবহারের জন্য কোনো আইনি বাধ্যবাধকতা প্রযোজ্য নয়।
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 p-1 rounded transition-colors"
            title={collapsed ? "Expand details" : "Collapse"}
            aria-label={collapsed ? "Expand notice" : "Collapse notice"}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 p-1 rounded transition-colors"
            title="Dismiss for session"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default GlobalUnderDevelopmentBanner;
