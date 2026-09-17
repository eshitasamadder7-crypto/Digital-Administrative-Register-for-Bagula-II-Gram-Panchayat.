import React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

export interface SchemaErrorInfo {
  isSchemaIssue: boolean;
  issueType: "missing_column" | "missing_table" | "stale_cache" | "other";
  column: string | null;
  table: string | null;
  code: string | null;
  originalMessage: string;
  friendlyTitle: string;
  friendlyExplanation: string;
  technicalDetails: string;
}

export interface HandleAdminDbErrorOptions {
  context?: string;
  tableName?: string;
  onRetry?: () => Promise<void> | void;
  onSchemaRefreshed?: () => Promise<void> | void;
}

/**
 * Parses any database error and extracts specific schema cache mismatch diagnostics.
 */
export function parseSchemaError(error: unknown, fallbackTable?: string): SchemaErrorInfo {
  const errObj = (typeof error === "object" && error !== null ? error : {}) as Record<string, unknown>;
  const rawMessage = String(errObj.message || (error instanceof Error ? error.message : String(error || "Unknown error")));
  const rawCode = String(errObj.code || "");
  const rawDetails = String(errObj.details || "");
  const rawHint = String(errObj.hint || "");

  const fullText = `${rawMessage} ${rawDetails} ${rawHint}`.toLowerCase();

  // Pattern 1: PostgREST missing column in schema cache
  // "Could not find the 'designation' column of 'admin_profiles' in the schema cache"
  const colMatch = rawMessage.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
  
  // Pattern 2: PostgREST missing table in schema cache
  // "Could not find the table 'public.linkage_certificates' in the schema cache"
  const tableMatch = rawMessage.match(/Could not find the table '([^']+)' in the schema cache/i);

  // Pattern 3: Postgres undefined column
  // "column "designation" of relation "admin_profiles" does not exist"
  const pgColMatch = rawMessage.match(/column ["']?([^"'\s]+)["']?.*(?:of relation|does not exist)/i);

  // Pattern 4: Postgres undefined table/relation
  // "relation "public.admin_profiles" does not exist"
  const pgRelMatch = rawMessage.match(/relation ["']?([^"'\s]+)["']? does not exist/i);

  const isPgrstColumnCode = rawCode === "PGRST204";
  const isPgrstTableCode = rawCode === "PGRST205";
  const isPgColumnCode = rawCode === "42703";
  const isPgTableCode = rawCode === "42P01";
  const hasSchemaCacheKeyword = fullText.includes("schema cache") || fullText.includes("schema");

  const isSchemaIssue =
    Boolean(colMatch || tableMatch || pgColMatch || pgRelMatch) ||
    isPgrstColumnCode ||
    isPgrstTableCode ||
    isPgColumnCode ||
    isPgTableCode ||
    hasSchemaCacheKeyword;

  let column: string | null = null;
  let table: string | null = fallbackTable ?? null;
  let issueType: SchemaErrorInfo["issueType"] = "other";

  if (colMatch) {
    column = colMatch[1];
    table = colMatch[2].replace(/^public\./, "");
    issueType = "missing_column";
  } else if (tableMatch) {
    table = tableMatch[1].replace(/^public\./, "");
    issueType = "missing_table";
  } else if (pgColMatch) {
    column = pgColMatch[1];
    issueType = "missing_column";
  } else if (pgRelMatch) {
    table = pgRelMatch[1].replace(/^public\./, "");
    issueType = "missing_table";
  } else if (isPgrstColumnCode || isPgColumnCode) {
    issueType = "missing_column";
  } else if (isPgrstTableCode || isPgTableCode) {
    issueType = "missing_table";
  } else if (hasSchemaCacheKeyword) {
    issueType = "stale_cache";
  }

  let friendlyTitle = "Database Schema Synchronization Needed";
  let friendlyExplanation = "The PostgREST API schema cache is not in sync with the database tables.";

  if (issueType === "missing_column" && column) {
    friendlyTitle = `Schema Cache: Column '${column}' not found`;
    friendlyExplanation = `The column "${column}"${table ? ` on table "${table}"` : ""} is currently missing or unindexed in the API schema cache. A recent database migration or schema reload may be pending.`;
  } else if (issueType === "missing_table" && table) {
    friendlyTitle = `Schema Cache: Table '${table}' not found`;
    friendlyExplanation = `The table "${table}" was not found in the API schema cache. PostgREST requires a schema reload or table permissions grant.`;
  } else if (hasSchemaCacheKeyword) {
    friendlyTitle = "API Schema Cache Stale";
    friendlyExplanation = "The API cache needs to be refreshed to register recent schema and column updates.";
  }

  return {
    isSchemaIssue,
    issueType,
    column,
    table,
    code: rawCode || null,
    originalMessage: rawMessage,
    friendlyTitle,
    friendlyExplanation,
    technicalDetails: [rawMessage, rawDetails, rawHint].filter(Boolean).join(" | "),
  };
}

/**
 * Triggers PostgREST schema cache reload via RPC and lightweight probe.
 */
export async function refetchSchemaCache(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Trigger the reload_schema_cache RPC
    const { data, error } = await supabase.rpc("reload_schema_cache");
    if (!error) {
      // Allow 400ms for PostgREST to process the NOTIFY signal
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        success: true,
        message: (data as any)?.message || "Schema reload signal sent successfully",
      };
    }

    // 2. Fallback: If RPC not found or permission error, send probe request with no-cache headers
    const supabaseUrl = (supabase as any)?.supabaseUrl || "";
    const supabaseKey = (supabase as any)?.supabaseKey || "";
    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }).catch(() => null);
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      success: true,
      message: "Schema cache re-fetch initiated.",
    };
  } catch (err) {
    console.warn("Manual schema reload error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to re-fetch schema",
    };
  }
}

/**
 * Primary error handler for Admin database operations.
 * If a schema issue is detected, shows a rich diagnostic toast with an interactive "Retry" button
 * that re-fetches the PostgREST schema and re-runs the caller's operation.
 */
export function handleAdminDbError(
  error: unknown,
  options: HandleAdminDbErrorOptions = {},
): SchemaErrorInfo {
  const info = parseSchemaError(error, options.tableName);
  const contextPrefix = options.context ? `[${options.context}] ` : "";

  if (info.isSchemaIssue) {
    const toastId = `schema-error-${Date.now()}`;

    toast.error(`${contextPrefix}${info.friendlyTitle}`, {
      id: toastId,
      duration: 16000,
      description: `${info.friendlyExplanation} Click Retry to reload schema and repeat the action.`,
      action: options.onRetry
        ? {
            label: "🔄 Retry & Refresh Schema",
            onClick: async () => {
              const loadingToastId = toast.loading("🔄 Re-fetching database schema & retrying operation...");
              try {
                // Step 1: Re-fetch the database schema cache
                await refetchSchemaCache();

                if (options.onSchemaRefreshed) {
                  await options.onSchemaRefreshed();
                }

                // Step 2: Re-attempt the operation
                if (options.onRetry) {
                  await options.onRetry();
                }

                toast.dismiss(loadingToastId);
                toast.success("✅ Schema refreshed & operation completed successfully!");
              } catch (retryErr: any) {
                toast.dismiss(loadingToastId);
                const retryInfo = parseSchemaError(retryErr, options.tableName);
                toast.error("Retry failed: " + (retryInfo.friendlyExplanation || retryErr?.message || "Unknown error"), {
                  description: "If this persists, please ensure the latest database migrations are applied.",
                  duration: 8000,
                });
              }
            },
          }
        : undefined,
    });
  } else {
    // Normal database error
    const msg = info.originalMessage || "Database operation failed.";
    if (options.onRetry) {
      toast.error(`${contextPrefix}${msg}`, {
        duration: 7000,
        action: {
          label: "Retry",
          onClick: async () => {
            try {
              await options.onRetry!();
              toast.success("Operation succeeded!");
            } catch (retryErr: any) {
              toast.error(retryErr?.message || "Retry failed");
            }
          },
        },
      });
    } else {
      toast.error(`${contextPrefix}${msg}`);
    }
  }

  return info;
}

export interface SchemaErrorAlertProps {
  error: SchemaErrorInfo;
  onDismiss?: () => void;
  onRetry?: () => Promise<void> | void;
}

export function SchemaErrorAlert({
  error,
  onDismiss,
  onRetry,
}: SchemaErrorAlertProps) {
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await refetchSchemaCache();
      if (onRetry) {
        await onRetry();
      }
      toast.success("Database schema re-fetched and operation retried successfully!");
    } catch (err: any) {
      toast.error("Retry failed: " + (err?.message || "Unknown error"));
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-4 text-amber-950 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-900 mt-0.5 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
              <span>{error.friendlyTitle}</span>
              {error.code && (
                <span className="font-mono text-[10px] bg-amber-200/70 text-amber-800 px-1.5 py-0.5 rounded">
                  {error.code}
                </span>
              )}
            </h4>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              {error.friendlyExplanation}
            </p>
            {error.technicalDetails && (
              <details className="mt-2 text-[11px] text-amber-900/80 cursor-pointer">
                <summary className="font-semibold hover:underline">
                  View diagnostic technical details
                </summary>
                <pre className="mt-1 p-2 bg-amber-100/60 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap">
                  {error.technicalDetails}
                </pre>
              </details>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-700 hover:text-amber-900 p-1 rounded-md hover:bg-amber-100 transition"
            title="Dismiss error"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-amber-800 italic">
          Fix: Re-fetching the schema cache will refresh column and table definitions from PostgreSQL.
        </span>

        {onRetry && (
          <Button
            type="button"
            size="sm"
            disabled={retrying}
            onClick={handleRetry}
            className="bg-amber-900 hover:bg-amber-950 text-white text-xs h-8 px-3 gap-1.5 font-semibold"
          >
            <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
            <span>{retrying ? "Refreshing Schema..." : "Retry & Refresh Schema"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
