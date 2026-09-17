import { useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findDuplicates, type DuplicateMatch } from "./api";
import type { ApplicationKind } from "./types";

function stateLabel(status: string | null, memoNo: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "draft") return "📝 Draft";
  if (s === "returned") return "🔄 Returned";
  if (s === "approved") return memoNo ? "✅ Issued" : "⏳ Under Review";
  if (s === "rejected") return "⛔ Rejected";
  if (s.includes("pending")) return "📤 Submitted";
  return status ?? "—";
}

interface Props {
  kind: ApplicationKind;
  mobile: string;
  email: string;
  onContact: (mobile: string, email: string) => void;
  onCreateNew: () => void;
  onBringExisting: (match: DuplicateMatch) => void;
  busy?: boolean;
}

export default function DuplicateCheckStep({
  kind, mobile, email, onContact, onCreateNew, onBringExisting, busy,
}: Props) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
  const valid = cleanMobile.length === 10;

  const handleMobileChange = (val: string) => {
    setChecked(false);
    setError(null);
    const digits = val.replace(/\D/g, "");
    const formatted = digits.length > 10 ? digits.slice(-10) : digits;
    onContact(formatted, email);
  };

  const handleEmailChange = (val: string) => {
    setChecked(false);
    setError(null);
    onContact(mobile, val);
  };

  const runCheck = async () => {
    setError(null);
    setChecking(true);
    try {
      const rows = await findDuplicates(kind, cleanMobile, email);
      setMatches(rows);
      setChecked(true);
    } catch (e) {
      console.warn("Duplicate check notice:", e);
      setError("Duplicate check service is temporarily unavailable. You may proceed directly with your application.");
      setChecked(true); // Allow continuing even if checking had an error
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <span>🔍 Duplicate Check</span>
          <span className="text-xs font-normal text-muted-foreground">/ সদৃশ আবেদন পরীক্ষা</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter the applicant's contact details first. This prevents the same family filing the
          same application twice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dup-mobile" className="flex items-center gap-1.5">
            <span>📱 Mobile Number / মোবাইল নম্বর</span>
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dup-mobile"
            inputMode="numeric"
            maxLength={14}
            value={mobile}
            placeholder="10-digit mobile (e.g. 9876543210)"
            onChange={(e) => handleMobileChange(e.target.value)}
          />
          {mobile && !valid && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Please enter a valid 10-digit mobile number ({cleanMobile.length}/10 digits).
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dup-email">📧 Email (optional) / ইমেল (ঐচ্ছিক)</Label>
          <Input
            id="dup-email"
            type="email"
            value={email}
            placeholder="name@example.com"
            onChange={(e) => handleEmailChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={runCheck} disabled={!valid || checking}>
          {checking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          <span>🔍 Check Duplicate / সদৃশ পরীক্ষা করুন</span>
        </Button>

        {checked && error && (
          <Button type="button" variant="outline" size="sm" onClick={runCheck} disabled={checking}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            <span>🔄 Retry Check</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-medium">⚠️ Duplicate check notice:</p>
            <p className="text-xs text-amber-700 mt-0.5">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              You may proceed with creating the application directly below.
            </p>
          </div>
        </div>
      )}

      {checked && !error && matches.length === 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <span>✅ No existing application found for this contact. You can start a fresh application.</span>
        </div>
      )}

      {checked && matches.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <span>⚠️ {matches.length} existing application{matches.length > 1 ? "s" : ""} found for this contact:</span>
          </p>
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 bg-muted/20">
                <div className="text-sm">
                  <div className="font-medium flex items-center gap-2">
                    <span>👤 {m.applicant_name || "Unnamed applicant"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stateLabel(m.status, m.memo_no)} · 🏡 {m.village || "—"} ·{" "}
                    📅 {new Date(m.created_at).toLocaleDateString()}
                    {m.return_count > 0 && ` · 🔄 returned ${m.return_count}×`}
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={busy}
                  onClick={() => onBringExisting(m)}>
                  📂 Bring Existing / পূর্ববর্তী আনুন
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            ℹ️ "Bring Existing" copies the details into a new editable draft. The original application
            stays untouched.
          </p>
        </div>
      )}

      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={matches.length > 0 ? "secondary" : "default"}
          disabled={busy || !valid}
          onClick={onCreateNew}
          className="min-h-[44px] px-6 font-semibold shadow-xs"
        >
          <span>➕ Create New Application / নতুন আবেদন শুরু করুন</span>
        </Button>

        {!checked && valid && (
          <span className="text-xs text-muted-foreground italic">
            (You can proceed directly, or run duplicate check first)
          </span>
        )}
      </div>
    </div>
  );
}
