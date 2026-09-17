import React from "react";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { validatePassword, checkPasswordMatch } from "@/lib/passwordPolicy";

interface PasswordRequirementsIndicatorProps {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
  className?: string;
  title?: string;
}

export const PasswordRequirementsIndicator: React.FC<PasswordRequirementsIndicatorProps> = ({
  password,
  confirmPassword,
  showMatch = false,
  className = "",
  title = "Password requirements",
}) => {
  const { isValid, requirements } = validatePassword(password);
  const matchResult = showMatch && confirmPassword !== undefined
    ? checkPasswordMatch(password, confirmPassword)
    : null;

  const rules = [
    {
      key: "minLength",
      label: "At least 8 characters",
      satisfied: requirements.minLength,
    },
    {
      key: "hasUppercase",
      label: "Contains uppercase letter (A-Z)",
      satisfied: requirements.hasUppercase,
    },
    {
      key: "hasLowercase",
      label: "Contains lowercase letter (a-z)",
      satisfied: requirements.hasLowercase,
    },
    {
      key: "hasNumber",
      label: "Contains number (0-9)",
      satisfied: requirements.hasNumber,
    },
    {
      key: "hasSpecial",
      label: "Contains special character (!@#$%^&* etc.)",
      satisfied: requirements.hasSpecial,
    },
  ];

  return (
    <div
      className={`rounded-xl border border-border/50 bg-muted/40 p-3.5 text-xs space-y-2.5 transition-all ${className}`}
      aria-live="polite"
      role="region"
      aria-label="Password policy compliance indicator"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground tracking-tight">{title}</span>
        {isValid ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Policy satisfied</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Complete all {rules.length} requirements
          </span>
        )}
      </div>

      <ul className="space-y-1.5" role="list">
        {rules.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-2 transition-colors ${
              r.satisfied
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-muted-foreground"
            }`}
          >
            {r.satisfied ? (
              <CheckCircle2
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Circle
                size={14}
                className="shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            )}
            <span>
              <span className="sr-only">
                {r.satisfied ? "Satisfied: " : "Incomplete: "}
              </span>
              {r.label}
            </span>
          </li>
        ))}
      </ul>

      {showMatch && matchResult && (
        <div className="pt-2 border-t border-border/40">
          <div
            className={`flex items-center gap-2 transition-colors ${
              matchResult.matches
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-muted-foreground"
            }`}
          >
            {matchResult.matches ? (
              <CheckCircle2
                size={14}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <Circle
                size={14}
                className="shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            )}
            <span>
              <span className="sr-only">
                {matchResult.matches ? "Matching: " : "Not matching: "}
              </span>
              {matchResult.matches ? "✓ Passwords match" : "○ Passwords do not match"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
