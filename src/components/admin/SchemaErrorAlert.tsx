import React, { useState } from "react";
import { AlertCircle, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refetchSchemaCache, SchemaErrorInfo } from "@/lib/adminDatabaseErrorHandler";
import { toast } from "sonner";

interface SchemaErrorAlertProps {
  errorInfo: SchemaErrorInfo | null;
  onRetry?: () => Promise<void> | void;
  onDismiss?: () => void;
  className?: string;
}

export const SchemaErrorAlert: React.FC<SchemaErrorAlertProps> = ({
  errorInfo,
  onRetry,
  onDismiss,
  className = "",
}) => {
  const [reloading, setReloading] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  if (!errorInfo || !errorInfo.isSchemaIssue) return null;

  const handleReloadAndRetry = async () => {
    setReloading(true);
    try {
      const result = await refetchSchemaCache();
      if (result.success) {
        toast.info("Database schema cache re-fetched.");
      }
      if (onRetry) {
        await onRetry();
        toast.success("Operation retried successfully!");
        if (onDismiss) onDismiss();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to retry operation after schema reload");
    } finally {
      setReloading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200 text-sm shadow-sm space-y-3 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Database className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-base text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <span>{errorInfo.friendlyTitle}</span>
              {errorInfo.column && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 font-mono">
                  col: {errorInfo.column}
                </span>
              )}
              {errorInfo.table && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/60 font-mono">
                  table: {errorInfo.table}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300">
              {errorInfo.friendlyExplanation}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 text-xs px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          disabled={reloading}
          onClick={handleReloadAndRetry}
          className="h-8 text-xs font-medium border-amber-600/40 bg-amber-600/10 hover:bg-amber-600/20 text-amber-900 dark:text-amber-100 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reloading ? "animate-spin" : ""}`} />
          {reloading ? "Refreshing Schema..." : "Retry & Re-fetch Schema"}
        </Button>

        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-xs text-amber-700/80 hover:text-amber-900 dark:text-amber-400/80 dark:hover:text-amber-200 flex items-center gap-1 px-2 py-1 underline-offset-2 hover:underline"
        >
          {showTechnical ? (
            <>
              <ChevronUp className="w-3 h-3" /> Hide Diagnostics
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show Diagnostics
            </>
          )}
        </button>
      </div>

      {showTechnical && (
        <div className="p-2.5 rounded bg-black/5 dark:bg-black/30 text-[11px] font-mono overflow-x-auto text-muted-foreground border border-black/10 dark:border-white/10 space-y-1">
          <div>
            <span className="text-amber-600 font-bold">Error:</span> {errorInfo.originalMessage}
          </div>
          {errorInfo.code && (
            <div>
              <span className="text-amber-600 font-bold">Code:</span> {errorInfo.code}
            </div>
          )}
          {errorInfo.technicalDetails && (
            <div>
              <span className="text-amber-600 font-bold">Details:</span> {errorInfo.technicalDetails}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
